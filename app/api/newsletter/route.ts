import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError, checkOrigin } from "@/lib/http";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
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
      .parse(await req.json());
    if (!data.website)
      await db.newsletterSubscriber.upsert({
        where: { email: data.email },
        create: {
          email: data.email,
          unsubscribeToken: randomBytes(32).toString("hex"),
        },
        update: { unsubscribedAt: null },
      });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
