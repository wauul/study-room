import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError, checkOrigin } from "@/lib/http";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const input = z
      .object({
        email: z.string().email().max(254),
        password: z.string().min(10, "Use at least 10 characters.").max(72),
      })
      .parse(await req.json());
    await db.user.create({
      data: {
        email: input.email.toLowerCase().trim(),
        hashedPassword: await hash(input.password, 12),
      },
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002")
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    return apiError(e);
  }
}
