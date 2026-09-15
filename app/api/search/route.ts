import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { posts, faqs } from "@/lib/content";
import { apiError } from "@/lib/http";
export async function GET(req: Request) {
  try {
    const q = (new URL(req.url).searchParams.get("q") || "")
      .trim()
      .slice(0, 100);
    if (q.length < 2) return NextResponse.json({ results: [] });
    const matches = (s: string) => s.toLowerCase().includes(q.toLowerCase());
    const results = posts
      .filter((p) => matches([p.title, p.intro, ...p.paragraphs].join(" ")))
      .map((p) => ({
        title: p.title,
        description: p.intro,
        href: "/guides/" + p.slug,
        type: "Journal",
      }));
    faqs.forEach(([title, description], i) => {
      if (matches(title + " " + description))
        results.push({
          title,
          description,
          href: "/help#faq-" + i,
          type: "Help",
        });
    });
    const pages = [
      ["My spaces", "Your study rooms and session rundowns", "/"],
      [
        "Study journal",
        "Study tips, confidence scoring, and getting started",
        "/guides",
      ],
      [
        "Help & FAQ",
        "Answers about uploads, invitations, privacy and quizzes",
        "/help",
      ],
      [
        "Privacy",
        "Essential cookies, newsletter email and personal data",
        "/privacy",
      ],
      ["Create a room", "Start a collaborative study session", "/rooms/new"],
      ["Sign in", "Log in or create an account", "/login"],
    ];
    pages.forEach(([title, description, href]) => {
      if (matches(title + " " + description))
        results.push({ title, description, href, type: "Page" });
    });
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (userId) {
      const access = { participants: { some: { userId } } };
      const filter = { contains: q, mode: "insensitive" as const };
      const [rooms, chunks, messages, summaries] = await Promise.all([
        db.room.findMany({
          where: {
            ...access,
            OR: [{ name: filter }, { studyFocusRaw: filter }],
          },
          take: 15,
          orderBy: { createdAt: "desc" },
        }),
        db.documentChunk.findMany({
          where: {
            document: { room: access },
            OR: [
              { content: filter },
              { sectionLabel: filter },
              { document: { filename: filter } },
            ],
          },
          include: {
            document: { include: { room: { select: { status: true } } } },
          },
          take: 20,
        }),
        db.chatMessage.findMany({
          where: { room: access, content: filter, status: "complete" },
          include: { room: { select: { name: true, status: true } } },
          take: 15,
          orderBy: { createdAt: "desc" },
        }),
        db.$queryRaw<
          { roomId: string; name: string }[]
        >`SELECT s."roomId", r.name FROM "SessionSummary" s JOIN "Room" r ON r.id=s."roomId" WHERE EXISTS (SELECT 1 FROM "Participant" p WHERE p."roomId"=r.id AND p."userId"=${userId}) AND position(lower(${q}) in lower(s."resultJson"::text)) > 0 ORDER BY s."createdAt" DESC LIMIT 20`,
      ]);
      rooms.forEach((r) =>
        results.push({
          title: r.name,
          description: r.studyFocusRaw || "Your study space",
          href: `/rooms/${r.id}${r.status === "ENDED" ? "/summary" : ""}`,
          type: "Room",
        }),
      );
      chunks.forEach((c) =>
        results.push({
          title: c.sectionLabel || c.document.filename,
          description: c.content.slice(
            Math.max(0, c.content.toLowerCase().indexOf(q.toLowerCase()) - 50),
            Math.max(0, c.content.toLowerCase().indexOf(q.toLowerCase()) - 50) +
              220,
          ),
          href: `/rooms/${c.document.roomId}/notes#chunk-${c.id}`,
          type: "Document",
        }),
      );
      messages.forEach((m) =>
        results.push({
          title: m.room.name + " · Discussion",
          description: m.content.slice(
            Math.max(0, m.content.toLowerCase().indexOf(q.toLowerCase()) - 50),
            Math.max(0, m.content.toLowerCase().indexOf(q.toLowerCase()) - 50) +
              220,
          ),
          href: `/rooms/${m.roomId}/notes#message-${m.id}`,
          type: "Discussion",
        }),
      );
      summaries.forEach((s) =>
        results.push({
          title: s.name + " · Rundown",
          description:
            "Matching evidence and study recommendations in your session rundown.",
          href: `/rooms/${s.roomId}/summary`,
          type: "Rundown",
        }),
      );
    }
    return NextResponse.json(
      { results, signedIn: !!userId },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
