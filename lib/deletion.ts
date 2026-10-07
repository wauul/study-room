import type { Prisma } from "@prisma/client";
export async function deleteRoom(tx: Prisma.TransactionClient, roomId: string) {
  // Quiz source foreign keys are restrictive, so remove quizzes before their passages.
  await tx.quizQuestion.deleteMany({ where: { roomId } });
  await tx.room.delete({ where: { id: roomId } });
}
export async function deleteAccount(tx: Prisma.TransactionClient, userId: string) {
  const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
  const rooms = await tx.room.findMany({ where: { hostUserId: userId }, select: { id: true } });
  for (const room of rooms) await deleteRoom(tx, room.id);
  const participants = await tx.participant.findMany({ where: { userId }, select: { id: true } });
  const ids = participants.map(p => p.id);
  await tx.quizResult.deleteMany({ where: { participantId: { in: ids } } });
  await tx.lostClick.deleteMany({ where: { participantId: { in: ids } } });
  await tx.chatMessage.deleteMany({ where: { participantId: { in: ids } } });
  await tx.reportDelivery.deleteMany({ where: { participantId: { in: ids } } });
  await tx.participant.deleteMany({ where: { userId } });
  await tx.emailVerification.deleteMany({ where: { userId } });
  await tx.newsletterSubscriber.deleteMany({ where: { email: user.email } });
  await tx.securityAudit.updateMany({ where: { OR: [{ actorId: userId }, { targetId: { in: [userId, ...ids] } }] }, data: { actorId: null, targetId: null } });
  await tx.user.delete({ where: { id: userId } });
}
