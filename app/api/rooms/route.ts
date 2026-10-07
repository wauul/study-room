import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, requireVerifiedUser, HttpError } from "@/lib/auth";
import { requestGuard, userGuard, audit } from "@/lib/guardrails";
import { jsonBody } from "@/lib/request-body";
import { withLease } from "@/lib/work-budget";
import { apiError, checkOrigin } from "@/lib/http";
import { parseFocus } from "@/lib/ai";
export async function GET(req: Request) {
  try {
    await requestGuard(req, "rooms", 60);
    const user = await requireUser();
    return NextResponse.json(
      await db.room.findMany({
        where: { participants: { some: { userId: user.id, revokedAt: null } } },
        include: {
          _count: { select: { participants: true, documents: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    );
  } catch (e) {
    return apiError(e, "http.request");
  }
}
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    await requestGuard(req, "rooms", 10);
    const user = await requireVerifiedUser();
    const policy = await userGuard("rooms", user.id, 3);
    const data = z
      .object({
        name: z.string().trim().min(2).max(100),
        displayName: z.string().trim().min(1).max(50),
        studyFocus: z.string().max(2000).default(""),
      })
      .parse(await jsonBody(req));
    return await withLease(`rooms:${user.id}`, async () => {
    if (await db.room.count({ where: { hostUserId: user.id } }) >= policy.maxRoomsPerUser)
      throw new HttpError(429, "Your room limit has been reached. Delete an old room first.");
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
    await audit("room.create", user.id, room.id);
    return NextResponse.json(room, { status: 201 });
    });
  } catch (e) {
    return apiError(e, "http.request");
  }
}
