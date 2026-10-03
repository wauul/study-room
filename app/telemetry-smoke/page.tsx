import { notFound } from "next/navigation";
import { smokeEnabled } from "@/lib/telemetry/smoke";
import SmokeClient from "./smoke-client";
export const dynamic = "force-dynamic";
export default function SmokePage() {
  if (!smokeEnabled()) notFound();
  return <SmokeClient />;
}
