import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { apiError, checkOrigin } from "@/lib/http";
import { parseFocus } from "@/lib/ai";
export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json(
      await db.room.findMany({
        where: { participants: { some: { userId: user.id } } },
        include: {
          _count: { select: { participants: true, documents: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const user = await requireUser();
    const data = z
      .object({
        name: z.string().trim().min(2).max(100),
        displayName: z.string().trim().min(1).max(50),
        studyFocus: z.string().max(2000).default(""),
      })
      .parse(await req.json());
    const focus = await parseFocus(data.studyFocus);
    const room = await db.room.create({
      data: {
        name: data.name,
        hostUserId: user.id,
        studyFocusRaw: data.studyFocus,
        studyFocusBoost: focus.boost,
        studyFocusExclude: focus.exclude,
        participants: {
          create: {
            userId: user.id,
            displayName: data.displayName,
            email: user.email,
          },
        },
      },
    });
    return NextResponse.json(room, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
