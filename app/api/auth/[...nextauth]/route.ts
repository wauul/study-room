import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { requestGuard } from "@/lib/guardrails";
import { apiError } from "@/lib/http";
import { boundedBody } from "@/lib/request-body";
import { NextRequest } from "next/server";
const handler = NextAuth(authOptions);
export async function GET(req: Request, context: unknown) {
  try { await requestGuard(req, "realtime", 120); return await handler(req, context); }
  catch (error) { return apiError(error); }
}
export async function POST(req: Request, context: unknown) {
  try {
    await requestGuard(req, "realtime", 30);
    const bytes = await boundedBody(req);
    const bounded = new NextRequest(req.url, { method: "POST", headers: req.headers, body: bytes as BodyInit });
    return await handler(bounded, context);
  } catch (error) { return apiError(error); }
}
