"use client";
import { useState } from "react";
import Header from "@/components/Header";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
export default function VerifyPage() {
  const { t } = useLanguage();
  const [message, setMessage] = useState(""), [busy, setBusy] = useState(false), [done, setDone] = useState(false);
  async function confirm() {
    setBusy(true);
    try {
      const token = window.location.hash.slice(1);
      const r = await fetch("/api/account/verify", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      const result = await r.json(); if (!r.ok) throw new Error(result.error);
      window.history.replaceState(null, "", "/verify"); setDone(true); setMessage("Email verified. You can return to your rooms.");
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }
  return <><Header /><main id="main-content" className="shell"><h1>{t("Verify your email")}</h1><p>{t("Confirm to verify this email address. Links expire after one hour.")}</p><p role="status">{t(message)}</p>{!done && <button onClick={confirm} disabled={busy}>{t("Confirm email address")}</button>}<p><Link href="/account">{t("Return to account")}</Link></p></main></>;
}
