import { membership } from "@/lib/auth";
import { apiError, checkOrigin } from "@/lib/http";
import { personalizedPdf } from "@/lib/pdf";
import { requestGuard, userGuard } from "@/lib/guardrails";
import { withLease } from "@/lib/work-budget";
export const runtime = "nodejs";
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    checkOrigin(req);
    await requestGuard(req, "exports", 10);
    const { id } = await params;
    const { participant, user } = await membership(id);
    await userGuard("exports", user.id, 5);
    const bytes = await withLease("compute:pdf", () => personalizedPdf(id, participant.id));
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="study-room-rundown.pdf"',
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return apiError(e, "pdf.export");
  }
}
