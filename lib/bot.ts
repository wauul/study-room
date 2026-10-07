import { HttpError } from "./errors";
export async function verifyBot(token: unknown, action: "signup" | "login" | "verify", ip: string, fetcher: typeof fetch = fetch, env: Record<string, string | undefined> = process.env) {
  if (typeof token !== "string" || !token || token.length > 2048) throw new HttpError(400, "Complete the security check.");
  const secret = env.TURNSTILE_SECRET_KEY;
  const host = env.NEXTAUTH_URL ? new URL(env.NEXTAUTH_URL).hostname : "";
  if (!secret || !host || (env.NODE_ENV === "production" && /^(localhost|127\.0\.0\.1)$/.test(host)))
    throw new HttpError(503, "Security verification is unavailable.");
  try {
    const response = await fetcher("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST", body: new URLSearchParams({ secret, response: token, remoteip: ip }), signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new HttpError(503, "Security verification is unavailable.");
    const result = await response.json();
    if (result.success !== true || result.hostname !== host || result.action !== action)
      throw new HttpError(403, "Security verification failed. Please try again.");
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(503, "Security verification is unavailable.", { cause: error });
  }
}
