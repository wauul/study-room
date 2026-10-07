"use client";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "./LanguageProvider";
type TurnstileApi = { render(element: HTMLElement, options: { sitekey: string; action: string; callback: (token: string) => void; "expired-callback": () => void; "error-callback": () => void }): string; remove(id: string): void };
declare global { interface Window { turnstile?: TurnstileApi } }
export default function BotCheck({ action, onToken, resetKey = 0 }: { action: "signup" | "login" | "verify"; onToken: (token: string) => void; resetKey?: number }) {
  const { t } = useLanguage(), container = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  useEffect(() => {
    onToken("");
    if (!ready || !container.current || !window.turnstile || !sitekey) return;
    const api = window.turnstile;
    const id = api.render(container.current, { sitekey, action, callback: onToken, "expired-callback": () => onToken(""), "error-callback": () => onToken("") });
    return () => { api.remove(id); };
  }, [ready, action, sitekey, onToken, resetKey]);
  if (!sitekey) return <p role="status" className="muted">{t("Security verification is unavailable. Please try again later.")}</p>;
  return <><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={() => setReady(true)} /><div ref={container} aria-label={t("Security check")} /></>;
}
