import { apiError } from "@/lib/http";
import { operation } from "@/lib/telemetry";
import { smokeAuthorized } from "@/lib/telemetry/smoke";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!smokeAuthorized(request)) return new Response(null, { status: 404 });
  const mode = new URL(request.url).searchParams.get("mode");
  if (mode === "server")
    throw new TypeError("Synthetic server failure: private-study-sentinel");
  if (mode === "caught") {
    try {
      throw new RangeError("Synthetic caught failure: private-study-sentinel");
    } catch (error) {
      return apiError(error, "telemetry.smoke");
    }
  }
  await operation("telemetry.smoke", { count: 1 }, async () => {
    await operation("embedding.generate", { provider: "local", count: 1 }, () =>
      Promise.resolve(),
    );
  });
  return Response.json({ ok: true });
}
