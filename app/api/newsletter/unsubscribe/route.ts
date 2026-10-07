import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError, checkOrigin } from "@/lib/http";
import { requestGuard } from "@/lib/guardrails";
import { jsonBody } from "@/lib/request-body";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    await requestGuard(req, "realtime", 30);
    const { token } = z
      .object({ token: z.string().regex(/^[a-f0-9]{64}$/) })
      .parse(await jsonBody(req));
    await db.newsletterSubscriber.updateMany({
      where: { unsubscribeToken: token },
      data: { unsubscribedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e, "http.request");
  }
}
