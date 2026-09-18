import "dotenv/config";
import { createServer } from "node:http";
import { Server, Socket } from "socket.io";
import { z } from "zod";
import { db } from "../lib/db";
import { verifyRoomToken } from "../lib/tokens";
import { retrieve, RetrievedChunk } from "../lib/rag/retrieval";
import { groq, model } from "../lib/ai";
import { answerPrompt } from "../lib/rag/answer-prompt";
import { supportedPassages } from "../lib/rag/evidence";
import { Heatmap } from "../lib/realtime/heatmap";
import { generateQuestion } from "../lib/quiz";
import {
  properScoringRule,
  validateDistribution,
} from "../lib/scoring/properScoringRule";
import { buildSummary } from "../lib/summary";
import type { Room, QuizQuestion } from "@prisma/client";
type Round = {
  question: QuizQuestion;
  eligible: Set<string>;
  submissions: Map<string, number[]>;
  writes: Set<Promise<unknown>>;
  locking: boolean;
  timer: NodeJS.Timeout;
};
type State = {
  heat: Heatmap;
  answering: boolean;
  ending: boolean;
  generating: boolean;
  round?: Round;
  simplified: Set<string>;
  pendingLost: Set<string>;
  lastUsed: number;
};
const states = new Map<string, State>();
const loading = new Map<string, Promise<State>>();
const http = createServer((req, res) => {
  res.writeHead(req.url === "/health" ? 200 : 404, {
    "Content-Type": "application/json",
  });
  res.end(JSON.stringify({ service: "study-room-realtime", status: "ok" }));
});
const origins = (process.env.APP_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((x) => x.trim());
const io = new Server(http, {
  cors: { origin: origins, credentials: true },
  maxHttpBufferSize: 20000,
});
io.use(async (socket, next) => {
  try {
    socket.data = await verifyRoomToken(
      z.string().parse(socket.handshake.auth.token),
    );
    next();
  } catch {
    next(new Error("Session expired. Reload this page to reconnect."));
  }
});
const channel = (id: string) => `room:${id}`;
async function state(id: string): Promise<State> {
  if (states.has(id)) return states.get(id)!;
  if (loading.has(id)) return loading.get(id)!;
  const pending = (async () => {
    const heat = new Heatmap();
    const now = new Date();
    const weights = await db.$queryRaw<{ chunkId: string; value: number }[]>`
      SELECT "chunkId", SUM(POWER(0.95, GREATEST(0, EXTRACT(EPOCH FROM (${now}::timestamp - "createdAt"))) / 60))::float8 AS value
      FROM "RetrievalEvent" WHERE "roomId"=${id} GROUP BY "chunkId"`;
    for (const row of weights)
      heat.restore(row.chunkId, row.value, now.getTime());
    const value: State = {
      heat,
      answering: false,
      ending: false,
      generating: false,
      simplified: new Set(),
      pendingLost: new Set(),
      lastUsed: Date.now(),
    };
    states.set(id, value);
    return value;
  })();
  loading.set(id, pending);
  try {
    return await pending;
  } finally {
    loading.delete(id);
  }
}
async function roomFor(socket: Socket, host = false, active = true) {
  const { roomId, participantId, userId } = socket.data;
  const participant = await db.participant.findFirst({
    where: { id: participantId, roomId, userId },
    include: { room: true },
  });
  if (!participant || (host && participant.room.hostUserId !== userId))
    throw new Error("You do not have permission for this action.");
  if (active && participant.room.status !== "ACTIVE")
    throw new Error("This session has ended.");
  return participant.room;
}
function peers(id: string) {
  return [
    ...new Map(
      [...io.sockets.sockets.values()]
        .filter((s) => s.rooms.has(channel(id)))
        .map((s) => [
          s.data.participantId,
          { id: s.data.participantId, displayName: s.data.displayName },
        ]),
    ).values(),
  ];
}
function publicQuestion(q: QuizQuestion) {
  return {
    id: q.id,
    questionText: q.questionText,
    options: q.options,
    endsAt: q.endsAt.getTime(),
    serverNow: Date.now(),
    styledAfterPastExam: q.styledAfterPastExam,
  };
}
async function leaderboard(roomId: string) {
  return db.$queryRaw<
    {
      participantId: string;
      displayName: string;
      score: number;
      zeroProbability: boolean;
      rounds: number;
    }[]
  >`
    SELECT p.id AS "participantId", p."displayName", SUM(r.score)::float8 AS score,
      BOOL_OR(r."zeroProbability") AS "zeroProbability", COUNT(*)::int AS rounds
    FROM "QuizResult" r JOIN "QuizQuestion" q ON q.id=r."quizQuestionId"
    JOIN "Participant" p ON p.id=r."participantId"
    WHERE q."roomId"=${roomId} AND q."lockedAt" IS NOT NULL
    GROUP BY p.id,p."displayName" ORDER BY "zeroProbability" ASC,score DESC,p.id`;
}
async function reveal(roomId: string, round: Round) {
  if (round.locking) return;
  round.locking = true;
  clearTimeout(round.timer);
  try {
    // A deadline or the last participant can arrive while earlier DB writes are
    // still in flight. Reveal waits for them so nobody's accepted answer vanishes.
    await Promise.allSettled([...round.writes]);
    await db.quizQuestion.update({
      where: { id: round.question.id },
      data: { lockedAt: new Date() },
    });
    const results = await db.quizResult.findMany({
      where: { quizQuestionId: round.question.id },
      include: { participant: { select: { displayName: true } } },
    });
    io.to(channel(roomId)).emit("quiz-round-reveal", {
      questionId: round.question.id,
      correctOptionIndex: round.question.correctOptionIndex,
      explanation: round.question.explanation,
      results: results.map((r) => ({
        participantId: r.participantId,
        displayName: r.participant.displayName,
        distribution: r.submittedDistribution,
        score: r.zeroProbability ? null : r.score,
        zeroProbability: r.zeroProbability,
      })),
      leaderboard: await leaderboard(roomId),
    });
    const s = await state(roomId);
    s.round = undefined;
  } catch {
    round.locking = false;
    round.timer = setTimeout(() => void reveal(roomId, round), 2000);
    io.to(channel(roomId)).emit(
      "room-error",
      "Saving the round failed; retrying.",
    );
  }
}
async function answer(
  room: Room,
  question: string,
  s: State,
  kind = "answer",
  fixedChunks?: RetrievedChunk[],
) {
  const retrieved =
    fixedChunks || (await retrieve(room, question, "COURSE_MATERIAL", 5, true));
  if (!retrieved.length)
    throw new Error(
      "No matching course material. Upload a document or adjust the study focus.",
    );
  // Calibrated on the documented supported/unsupported regression questions.
  // A cross-encoder logit is not a probability. Strongly negative evidence is
  // withheld so generation cannot invent a mechanism from a related passage.
  const chunks = supportedPassages(retrieved);
  const citations = chunks.map((c) => ({
    id: c.id,
    sectionLabel: c.sectionLabel,
    filename: c.filename,
    similarity: c.similarity,
  }));
  const message = await db.chatMessage.create({
    data: {
      roomId: room.id,
      content: "",
      kind,
      status: "streaming",
      citedChunkIds: chunks.map((c) => c.id),
      citations,
    },
  });
  const wire = {
    ...message,
    citations,
    lowConfidence: !chunks.length || chunks[0].similarity < 0.5,
  };
  io.to(channel(room.id)).emit("answer-start", wire);
  if (kind === "simplified")
    io.to(channel(room.id)).emit("simplified-reexplanation", wire);
  io.to(channel(room.id)).emit("chunk-highlight", {
    chunkIds: chunks.map((c) => c.id),
  });
  await db.retrievalEvent.createMany({
    data: chunks.map((c) => ({ roomId: room.id, chunkId: c.id })),
  });
  chunks.forEach((c) => s.heat.add(c.id));
  let content = "";
  let pendingTokens = "";
  let tokenEvents = 0,
    emittedFrames = 0;
  const flushTokens = () => {
    if (!pendingTokens) return;
    emittedFrames++;
    io.to(channel(room.id)).emit("answer-chunk", {
      messageId: message.id,
      token: pendingTokens,
    });
    pendingTokens = "";
  };
  const tokenTimer = setInterval(flushTokens, 50);
  try {
    const stream = await groq().chat.completions.create({
      model: process.env.GROQ_ANSWER_MODEL || model(),
      temperature: 0.1,
      stream: true,
      max_completion_tokens: 1800,
      messages: [
        {
          role: "system",
          content: answerPrompt(kind === "simplified"),
        },
        {
          role: "user",
          content: JSON.stringify({
            question,
            studyFocus: room.studyFocusRaw,
            passages: chunks.map((c, i) => ({
              label: i + 1,
              section: c.sectionLabel,
              content: c.content,
            })),
          }),
        },
      ],
    });
    for await (const part of stream) {
      const token = part.choices[0]?.delta.content || "";
      if (token) tokenEvents++;
      content += token;
      pendingTokens += token;
    }
    flushTokens();
    await db.chatMessage.update({
      where: { id: message.id },
      data: { content, status: "complete" },
    });
    io.to(channel(room.id)).emit("answer-complete", {
      messageId: message.id,
      content,
    });
  } catch (error) {
    await db.chatMessage.update({
      where: { id: message.id },
      data: {
        content:
          content || "The answer could not be generated. Please try again.",
        status: "failed",
      },
    });
    io.to(channel(room.id)).emit("answer-complete", {
      messageId: message.id,
      content:
        content || "The answer could not be generated. Please try again.",
      failed: true,
    });
    throw error;
  } finally {
    clearInterval(tokenTimer);
    if (process.env.RAG_METRICS === "1")
      console.info(
        JSON.stringify({
          event: "answer-stream-metrics",
          tokenEvents,
          emittedFrames,
        }),
      );
  }
}
async function drainSimplifications(room: Room, s: State) {
  if (s.answering || s.ending) return;
  const messageId = s.pendingLost.values().next().value;
  if (!messageId) return;
  s.pendingLost.delete(messageId);
  if (s.simplified.has(messageId)) return;
  s.simplified.add(messageId);
  s.answering = true;
  try {
    const message = await db.chatMessage.findUniqueOrThrow({
      where: { id: messageId },
    });
    const chunks = await db.documentChunk.findMany({
      where: {
        id: { in: message.citedChunkIds },
        document: { roomId: room.id },
      },
      include: { document: true },
    });
    await answer(
      room,
      "Explain these passages again, much more simply.",
      s,
      "simplified",
      chunks.map((c) => ({
        ...c,
        filename: c.document.filename,
        similarity: 1,
      })),
    );
  } catch (error) {
    s.simplified.delete(messageId);
    throw error;
  } finally {
    s.answering = false;
  }
  await drainSimplifications(room, s);
}
io.on("connection", (socket) => {
  let lastAction = 0;
  function on(name: string, handler: (payload: any) => Promise<unknown>) {
    socket.on(name, async (payload, ack) => {
      try {
        if (
          name !== "join-room" &&
          !socket.rooms.has(channel(socket.data.roomId))
        )
          throw new Error("Join the room first.");
        if (name !== "join-room" && Date.now() - lastAction < 250)
          throw new Error("Please wait a moment.");
        lastAction = Date.now();
        const result = await handler(payload);
        if (typeof ack === "function")
          ack({ ok: true, ...((result as object) || {}) });
      } catch (error) {
        const safe =
          error instanceof z.ZodError
            ? "Invalid request."
            : error instanceof Error && !("status" in error)
              ? error.message
              : "The AI service is unavailable. Please try again shortly.";
        socket.emit("room-error", safe);
        if (typeof ack === "function") ack({ ok: false, error: safe });
      }
    });
  }
  on("join-room", async () => {
    const room = await roomFor(socket, false, false);
    const s = await state(room.id);
    s.lastUsed = Date.now();
    const participant = await db.participant.findUniqueOrThrow({
      where: { id: socket.data.participantId },
    });
    socket.data.displayName = participant.displayName;
    await socket.join(channel(room.id));
    io.to(channel(room.id)).emit("presence", peers(room.id));
    socket.emit("heatmap-update", s.heat.snapshot());
    socket.emit("leaderboard", await leaderboard(room.id));
    if (s.round) {
      socket.emit("quiz-question-start", publicQuestion(s.round.question));
      socket.emit("quiz-submission-status", {
        submitted: s.round.submissions.has(participant.id),
        eligible: s.round.eligible.has(participant.id),
      });
    }
    if (room.status === "ENDED")
      socket.emit("session-ended", { roomId: room.id });
    return { serverNow: Date.now() };
  });
  on("leave-room", async () => {
    const id = socket.data.roomId;
    await socket.leave(channel(id));
    io.to(channel(id)).emit("presence", peers(id));
  });
  on("ask-question", async (payload) => {
    const { question } = z
      .object({ question: z.string().trim().min(3).max(2000) })
      .parse(payload);
    const room = await roomFor(socket);
    const s = await state(room.id);
    if (s.answering || s.ending)
      throw new Error("Please wait for the current answer to finish.");
    s.answering = true;
    try {
      const message = await db.chatMessage.create({
        data: {
          roomId: room.id,
          participantId: socket.data.participantId,
          content: question,
          kind: "question",
        },
      });
      io.to(channel(room.id)).emit("chat-message", {
        ...message,
        displayName: socket.data.displayName,
      });
      await answer(room, question, s);
    } finally {
      s.answering = false;
      await drainSimplifications(room, s);
    }
  });
  on("lost-click", async (payload) => {
    const { messageId } = z.object({ messageId: z.string() }).parse(payload);
    const room = await roomFor(socket);
    const s = await state(room.id);
    if (s.ending) throw new Error("The session is ending.");
    const message = await db.chatMessage.findFirst({
      where: {
        id: messageId,
        roomId: room.id,
        participantId: null,
        status: { in: ["complete", "streaming"] },
      },
    });
    if (!message) throw new Error("This answer is unavailable.");
    await db.lostClick.upsert({
      where: {
        chatMessageId_participantId: {
          chatMessageId: messageId,
          participantId: socket.data.participantId,
        },
      },
      create: {
        roomId: room.id,
        chatMessageId: messageId,
        participantId: socket.data.participantId,
      },
      update: {},
    });
    const count = await db.lostClick.count({
      where: { chatMessageId: messageId },
    });
    io.to(channel(room.id)).emit("lost-count", { messageId, count });
    if (count >= 3 || count >= Math.ceil(peers(room.id).length / 2)) {
      if (!s.simplified.has(messageId)) s.pendingLost.add(messageId);
      await drainSimplifications(room, s);
    }
    return { count };
  });
  on("quiz-question-start", async () => {
    const room = await roomFor(socket, true);
    const s = await state(room.id);
    if (s.round || s.generating || s.ending)
      throw new Error("Finish the current round first.");
    s.generating = true;
    try {
      const question = await generateQuestion(room);
      const round: Round = {
        question,
        eligible: new Set(peers(room.id).map((p) => p.id)),
        submissions: new Map(),
        writes: new Set(),
        locking: false,
        timer: setTimeout(() => {}, 0),
      };
      s.round = round;
      round.timer = setTimeout(
        () => void reveal(room.id, round),
        Math.max(0, question.endsAt.getTime() - Date.now()),
      );
      io.to(channel(room.id)).emit(
        "quiz-question-start",
        publicQuestion(question),
      );
    } finally {
      s.generating = false;
    }
  });
  on("quiz-submit", async (payload) => {
    const { questionId, distribution } = z
      .object({
        questionId: z.string(),
        distribution: z.array(z.number()).length(4),
      })
      .parse(payload);
    validateDistribution(distribution);
    const room = await roomFor(socket);
    const round = (await state(room.id)).round;
    const id = socket.data.participantId;
    if (
      !round ||
      round.question.id !== questionId ||
      round.locking ||
      Date.now() >= round.question.endsAt.getTime()
    )
      throw new Error("This round is locked.");
    if (!round.eligible.has(id))
      throw new Error("You joined during this round. Play in the next one.");
    if (round.submissions.has(id))
      throw new Error("Your probabilities are already locked in.");
    // Reserve before awaiting persistence: duplicate submissions cannot race.
    round.submissions.set(id, distribution);
    const score = properScoringRule(
      distribution,
      round.question.correctOptionIndex,
    );
    const write = db.quizResult
      .create({
        data: {
          quizQuestionId: questionId,
          participantId: id,
          submittedDistribution: distribution,
          score: Number.isFinite(score) ? score : 0,
          zeroProbability: !Number.isFinite(score),
        },
      })
      .then((r) => r);
    round.writes.add(write);
    try {
      await write;
    } catch (e) {
      round.submissions.delete(id);
      throw e;
    } finally {
      round.writes.delete(write);
    }
    if (round.submissions.size >= round.eligible.size)
      await reveal(room.id, round);
  });
  on("end-session", async () => {
    const room = await roomFor(socket, true);
    const s = await state(room.id);
    if (s.answering || s.generating || s.ending || s.round)
      throw new Error("Wait for the answer or quiz round to finish.");
    s.ending = true;
    io.to(channel(room.id)).emit("session-ending");
    try {
      await buildSummary(room.id, s.heat.snapshot());
      io.to(channel(room.id)).emit("session-ended", { roomId: room.id });
    } finally {
      s.ending = false;
    }
  });
  socket.on("disconnect", () => {
    io.to(channel(socket.data.roomId)).emit(
      "presence",
      peers(socket.data.roomId),
    );
  });
});
setInterval(() => {
  for (const [id, s] of states) {
    if (peers(id).length) {
      s.lastUsed = Date.now();
      io.to(channel(id)).emit("heatmap-update", s.heat.snapshot());
    } else if (
      !s.answering &&
      !s.round &&
      !s.ending &&
      Date.now() - s.lastUsed > 600000
    )
      states.delete(id);
  }
}, 4000).unref();
// On restart, mark interrupted answers and lock persisted rounds; submissions are
// durable but never exposed until locked. Reconnecting clients recover via REST.
async function start() {
  await db.chatMessage.updateMany({
    where: { status: "streaming" },
    data: { status: "failed" },
  });
  await db.quizQuestion.updateMany({
    where: { lockedAt: null },
    data: { lockedAt: new Date() },
  });
  http.listen(Number(process.env.PORT) || 3001, "0.0.0.0", () =>
    console.log("Study Room realtime listening"),
  );
}
start().catch(() => {
  console.error("Database connection failed during startup");
  process.exit(1);
});
