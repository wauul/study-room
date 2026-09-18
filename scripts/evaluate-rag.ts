/** Real-model regression run. DATABASE_URL/GROQ_API_KEY are required.
 * npx tsx scripts/evaluate-rag.ts [cases.json] [output.json]
 * Cases reference existing uploads; source text/results stay in ignored .tools. */
import "dotenv/config";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { db } from "../lib/db";
import { retrieve } from "../lib/rag/retrieval";
import { answerPrompt } from "../lib/rag/answer-prompt";
import { groq, model } from "../lib/ai";
type Case = {
  filename: string;
  question: string;
  expected?: string;
  unsupported?: boolean;
};
async function main() {
  const cases: Case[] = JSON.parse(
    await fs.readFile(process.argv[2] || "samples/rag-eval.json", "utf8"),
  );
  const output = process.argv[3] || ".tools/rag-after.json";
  const results = [];
  await fs.mkdir(".tools", { recursive: true });
  for (const c of cases) {
    const document = await db.document.findFirstOrThrow({
      where: { filename: c.filename },
      include: { room: true },
    });
    const start = performance.now();
    const candidates = await retrieve(
      document.room,
      c.question,
      "COURSE_MATERIAL",
      5,
      true,
    );
    const retrievalMs = performance.now() - start;
    const chunks =
      candidates[0]?.relevance !== undefined && candidates[0].relevance! < -5
        ? []
        : candidates;
    if (c.expected)
      assert.ok(
        chunks[0]?.content.toLowerCase().includes(c.expected.toLowerCase()),
        `Top passage must contain ${c.expected}`,
      );
    if (c.unsupported)
      assert.equal(
        chunks.length,
        0,
        `Unsupported question passed evidence gate: ${c.question}`,
      );
    const t = performance.now();
    let ttftMs = 0,
      answer = "";
    const stream = await groq().chat.completions.create({
      model: process.env.GROQ_ANSWER_MODEL || model(),
      temperature: 0.1,
      stream: true,
      max_completion_tokens: 1800,
      messages: [
        { role: "system", content: answerPrompt() },
        {
          role: "user",
          content: JSON.stringify({
            question: c.question,
            passages: chunks.map((p, i) => ({
              label: i + 1,
              section: p.sectionLabel,
              content: p.content,
            })),
          }),
        },
      ],
    });
    for await (const p of stream) {
      const token = p.choices[0]?.delta.content || "";
      if (token && !ttftMs) ttftMs = performance.now() - t;
      answer += token;
    }
    if (chunks.length)
      assert.match(
        answer,
        /[\[【]\d+[\]】]/,
        "Supported answer needs a citation",
      );
    if (c.unsupported)
      assert.match(
        answer,
        /do not|does not|not (?:contain|provide|establish)|cannot|insufficient|no (?:information|passages)|missing/i,
        "Unsupported answer must abstain",
      );
    const row = {
      ...c,
      retrievalMs,
      ttftMs,
      generationMs: performance.now() - t,
      chunks,
      candidates: candidates.map((p) => ({
        id: p.id,
        relevance: p.relevance,
        similarity: p.similarity,
      })),
      answer,
    };
    results.push(row);
    await fs.writeFile(output, JSON.stringify(results, null, 2));
    console.log(
      JSON.stringify({
        ...row,
        chunks: chunks.map((p) => ({ id: p.id, section: p.sectionLabel })),
        candidates: undefined,
      }),
    );
  }
}
main().finally(() => db.$disconnect());
