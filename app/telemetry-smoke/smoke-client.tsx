"use client";
import { useState } from "react";
import { operation } from "@/lib/telemetry";
export default function SmokeClient() {
  const [crash, setCrash] = useState(false);
  if (crash)
    throw new TypeError(
      "Synthetic browser boundary failure: private-study-sentinel",
    );
  return (
    <main id="main-content" className="shell" data-sentry-block>
      <h1>Synthetic telemetry checks</h1>
      <p>This screen is gated and disabled in production.</p>
      <button onClick={() => setCrash(true)}>Browser error</button>
      <button
        onClick={() =>
          operation("telemetry.smoke", { count: 1 }, () =>
            fetch("/api/search?q=private-study-sentinel"),
          )
        }
      >
        Browser trace
      </button>
    </main>
  );
}
