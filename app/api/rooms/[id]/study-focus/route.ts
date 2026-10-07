import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { membership, HttpError, verified } from "@/lib/auth";
import { requestGuard, userGuard } from "@/lib/guardrails";
import { jsonBody } from "@/lib/request-body";
import { parseFocus } from "@/lib/ai";
import { apiError, checkOrigin } from "@/lib/http";
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    checkOrigin(req);
    await requestGuard(req, "ai", 10);
    const { id } = await params;
    const { room, user } = await membership(id, true);
    verified(user); await userGuard("ai", user.id, 5);
    if (room.status !== "ACTIVE") throw new HttpError(409, "Session ended.");
    const { studyFocus } = z
      .object({ studyFocus: z.string().max(2000) })
      .parse(await jsonBody(req));
    const focus = await parseFocus(studyFocus);
    await db.room.update({
      where: { id },
      data: {
        studyFocusRaw: studyFocus,
        studyFocusBoost: focus.boost,
        studyFocusExclude: focus.exclude,
      },
    });
    return NextResponse.json({ ok: true, focus });
  } catch (e) {
    return apiError(e, "http.request");
  }
}
