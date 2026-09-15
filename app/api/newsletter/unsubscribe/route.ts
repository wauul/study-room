import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError, checkOrigin } from "@/lib/http";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const { token } = z
      .object({ token: z.string().regex(/^[a-f0-9]{64}$/) })
      .parse(await req.json());
    await db.newsletterSubscriber.updateMany({
      where: { unsubscribeToken: token },
      data: { unsubscribedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
