import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError, checkOrigin } from "@/lib/http";
import { requestGuard, rateLimit } from "@/lib/guardrails";
import { jsonBody } from "@/lib/request-body";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    await requestGuard(req, "newsletter", 3);
    const data = z
      .object({
        email: z
          .string()
          .trim()
          .email()
          .max(254)
          .transform((s) => s.toLowerCase()),
        consent: z.literal(true),
        website: z.string().max(200).optional(),
      })
      .parse(await jsonBody(req));
    await rateLimit("newsletter", "global", 100, 86400);
    if (!data.website)
      await db.newsletterSubscriber.upsert({
        where: { email: data.email },
        create: {
          email: data.email,
          unsubscribeToken: randomBytes(32).toString("hex"),
        },
        // Public requests must never reactivate someone else's withdrawn consent.
        update: {},
      });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e, "http.request");
  }
}
