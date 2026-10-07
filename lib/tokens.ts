import { SignJWT, jwtVerify } from "jose";
function key() {
  if (!process.env.SOCKET_SIGNING_SECRET)
    throw new Error("SOCKET_SIGNING_SECRET is missing");
  return new TextEncoder().encode(process.env.SOCKET_SIGNING_SECRET);
}
export async function roomToken(
  roomId: string,
  participantId: string,
  userId: string,
) {
  return new SignJWT({ roomId, participantId })
    .setSubject(userId)
    .setProtectedHeader({ alg: "HS256" })
    .setAudience("study-room-socket")
    .setIssuedAt()
    .setExpirationTime("30m")
    .sign(key());
}
export async function verifyRoomToken(token: string) {
  const { payload } = await jwtVerify(token, key(), {
    audience: "study-room-socket",
    algorithms: ["HS256"],
  });
  if (
    typeof payload.roomId !== "string" ||
    typeof payload.participantId !== "string" ||
    !payload.sub
  )
    throw new Error("Invalid room token");
  return {
    roomId: payload.roomId,
    participantId: payload.participantId,
    userId: payload.sub,
    expiresAt: (payload.exp || 0) * 1000,
  };
}
