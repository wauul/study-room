import { reserveEmail } from "./guardrails";
import { workSignal } from "./work-budget";
import { HttpError } from "./errors";
export async function sendMail(body: { to: string; subject: string; text: string; attachments?: { filename: string; content: string }[] }, idempotencyKey: string) {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM) throw new HttpError(503, "Email delivery is unavailable.");
  await reserveEmail();
  const result = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({ from: process.env.RESEND_FROM, ...body }),
    signal: AbortSignal.any([workSignal(), AbortSignal.timeout(15000)]),
  });
  if (!result.ok) throw new HttpError(502, "Email delivery could not be confirmed.");
  return result.json();
}
