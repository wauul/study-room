"use client";
import * as Sentry from "@sentry/nextjs";
import { replayAllowed, replayPrivacyOptions } from "./replay-policy";
/** Call only from an explicit consent UI; never from login or cookie-notice dismissal. */
export async function setReplayConsent(consented: boolean) {
  if (!consented) {
    await Sentry.getReplay()?.stop();
    return;
  }
  if (
    process.env.NEXT_PUBLIC_SENTRY_REPLAY_ENABLED !== "true" ||
    !Sentry.getClient() ||
    !replayAllowed(window.location)
  )
    return;
  if (!Sentry.getReplay()) {
    const replay = await Sentry.lazyLoadIntegration("replayIntegration");
    Sentry.addIntegration(replay(replayPrivacyOptions));
  }
  Sentry.getReplay()?.start();
}
