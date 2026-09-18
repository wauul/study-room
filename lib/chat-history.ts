import { db } from "./db";
import { HttpError } from "./auth";
export const CHAT_PAGE_SIZE = 50;
export async function chatHistory(roomId: string, before?: string | null) {
  let boundary: { createdAt: Date; id: string } | null = null;
  if (before) {
    boundary = await db.chatMessage.findFirst({
      where: { id: before, roomId },
      select: { id: true, createdAt: true },
    });
    if (!boundary) throw new HttpError(400, "Invalid history cursor");
  }
  const rows = await db.chatMessage.findMany({
    where: {
      roomId,
      ...(boundary
        ? {
            OR: [
              { createdAt: { lt: boundary.createdAt } },
              { createdAt: boundary.createdAt, id: { lt: boundary.id } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      content: true,
      participantId: true,
      kind: true,
      status: true,
      citations: true,
      createdAt: true,
      participant: { select: { displayName: true } },
      _count: { select: { lostClicks: true } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: CHAT_PAGE_SIZE + 1,
  });
  const hasMore = rows.length > CHAT_PAGE_SIZE;
  const messages = rows
    .slice(0, CHAT_PAGE_SIZE)
    .reverse()
    .map(({ participant, _count, ...m }) => ({
      ...m,
      displayName: participant?.displayName,
      lostCount: _count.lostClicks,
    }));
  return { messages, nextCursor: hasMore ? messages[0].id : null };
}
