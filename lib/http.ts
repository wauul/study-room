import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { HttpError } from "./auth";
import { unstable_rethrow } from "next/navigation";
import { captureFailure } from "./telemetry";
export function apiError(error: unknown, operation = "http.request") {
  unstable_rethrow(error);
  if (error instanceof HttpError) {
    if (error.status >= 500) captureFailure(error.cause || error, operation);
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }
  if (error instanceof ZodError)
    return NextResponse.json(
      { error: error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  captureFailure(error, operation);
  console.error("Request failed");
  return NextResponse.json(
    {
      error:
        "The request could not be completed. Check the service configuration and try again.",
    },
    { status: 500 },
  );
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (
    origin &&
    origin !== new URL(request.url).origin &&
    origin !== process.env.NEXTAUTH_URL
  )
    throw new HttpError(403, "Invalid request origin.");
}
