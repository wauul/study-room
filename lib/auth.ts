import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { oauthProviders } from "./oauth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { compare } from "bcryptjs";
import { db } from "./db";
import { getServerSession } from "next-auth";
import { captureFailure } from "./telemetry";
import { HttpError } from "./errors";
export { HttpError } from "./errors";
import { featureEnabled, rateLimit, requestIp } from "./guardrails";
import { verifyBot } from "./bot";
import { minimizeProviderAccount } from "./provider-secrets";
// NextAuth handles adapter errors internally, so capture them at the database boundary.
const adapter = new Proxy(PrismaAdapter(db), {
  get(target, property, receiver) {
    const method = Reflect.get(target, property, receiver);
    if (typeof method !== "function") return method;
    return async (...args: unknown[]) => {
      try {
        if (property === "createUser") await featureEnabled("signup");
        if (property === "linkAccount") args[0] = minimizeProviderAccount(args[0] as Record<string, unknown>);
        return await Reflect.apply(method, target, args);
      } catch (error) {
        captureFailure(error, "auth.database");
        throw error;
      }
    };
  },
});
export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  adapter,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/login", error: "/login" },
  providers: [
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        const ip = requestIp(new Headers(req.headers as HeadersInit));
        await rateLimit("realtime", `login-ip:${ip}`, 10);
        if (
          !credentials?.email ||
          !credentials.password ||
          Buffer.byteLength(credentials.password, "utf8") > 72
        )
          return null;
        await rateLimit("realtime", `login-email:${credentials.email.trim().toLowerCase()}`, 10, 900);
        await verifyBot(req.body?.botToken, "login", ip);
        let user;
        try {
          user = await db.user.findUnique({
            where: { email: credentials.email.trim().toLowerCase() },
          });
        } catch (error) {
          captureFailure(error, "auth.database");
          throw error;
        }
        if (
          !user ||
          !user.hashedPassword ||
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
    ...oauthProviders(process.env),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (user.email) user.email = user.email.trim().toLowerCase();
      // The app requires an email for membership and personal reports.
      return account?.type !== "oauth" || !!user.email;
    },
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
  const user = await db.user.findUnique({ where: { id }, select: { id: true, email: true, emailVerified: true } });
  if (!user) throw new HttpError(401, "Please sign in.");
  return user;
}
export async function requireVerifiedUser() {
  const user = await requireUser();
  verified(user);
  return user;
}
export function verified(user: { emailVerified: Date | null }) {
  if (!user.emailVerified) throw new HttpError(403, "Verify your email in Account before using this feature.");
}
export async function membership(roomId: string, hostOnly = false) {
  const user = await requireUser();
  const room = await db.room.findUnique({
    where: { id: roomId },
    include: { participants: { where: { userId: user.id, revokedAt: null } } },
  });
  if (!room) throw new HttpError(404, "Room not found.");
  if (hostOnly ? room.hostUserId !== user.id : !room.participants.length)
    throw new HttpError(403, "This room is not available to you.");
  return { user, room, participant: room.participants[0] };
}
