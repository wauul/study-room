import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError, checkOrigin } from "@/lib/http";
import { jsonBody } from "@/lib/request-body";
import { requestGuard, requestIp, audit } from "@/lib/guardrails";
import { verifyBot } from "@/lib/bot";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    await requestGuard(req, "signup", 3);
    const input = z
      .object({
        email: z.string().email().max(254),
        password: z.string().min(10, "Use at least 10 characters.").max(72).refine(password => Buffer.byteLength(password, "utf8") <= 72, "Use a password no longer than 72 UTF-8 bytes."),
        botToken: z.string().min(1).max(2048),
      })
      .parse(await jsonBody(req));
    await verifyBot(input.botToken, "signup", requestIp(req.headers));
    const user = await db.user.create({
      data: {
        email: input.email.toLowerCase().trim(),
        hashedPassword: await hash(input.password, 12),
      },
    });
    await audit("account.register", user.id);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002")
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    return apiError(e, "http.request");
  }
}
