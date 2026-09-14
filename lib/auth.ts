import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "./db";
import { getServerSession } from "next-auth";
export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (
          !credentials?.email ||
          !credentials.password ||
          credentials.password.length > 72
        )
          return null;
        const user = await db.user.findUnique({
          where: { email: credentials.email.trim().toLowerCase() },
        });
        if (
          !user ||
          !(await compare(credentials.password, user.hashedPassword))
        )
          return null;
        return {
          id: user.id,
          email: user.email,
          name: user.email.split("@")[0],
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user) (session.user as { id?: string }).id = token.sub;
      return session;
    },
  },
};
export async function requireUser() {
  const session = await getServerSession(authOptions);
  const id = (session?.user as { id?: string } | undefined)?.id;
  if (!id) throw new HttpError(401, "Please sign in.");
  return { id, email: session?.user?.email ?? "" };
}
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function membership(roomId: string, hostOnly = false) {
  const user = await requireUser();
  const room = await db.room.findUnique({
    where: { id: roomId },
    include: { participants: { where: { userId: user.id } } },
  });
  if (!room) throw new HttpError(404, "Room not found.");
  if (hostOnly ? room.hostUserId !== user.id : !room.participants.length)
    throw new HttpError(403, "This room is not available to you.");
  return { user, room, participant: room.participants[0] };
}
