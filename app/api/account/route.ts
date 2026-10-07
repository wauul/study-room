import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, checkOrigin } from "@/lib/http";
import { jsonBody } from "@/lib/request-body";
import { requestGuard } from "@/lib/guardrails";
import { deleteAccount } from "@/lib/deletion";
import { withLease } from "@/lib/work-budget";
export async function DELETE(req: Request) {
  try {
    checkOrigin(req); await requestGuard(req, "realtime", 5);
    const user = await requireUser();
    z.object({ confirmation: z.literal("DELETE") }).parse(await jsonBody(req));
    await withLease(`rooms:${user.id}`, () => db.$transaction(tx => deleteAccount(tx, user.id), { timeout: 30000 }));
    return Response.json({ ok: true });
  } catch (error) { return apiError(error); }
}
