"use client";
import { useLanguage } from "@/components/LanguageProvider";

import { useState } from "react";
import Header from "@/components/Header";

export default function NewRoom() {
  const { t, locale } = useLanguage();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const values = Object.fromEntries(new FormData(e.currentTarget));
      const r = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await r.json();
      if (r.status === 401) {
        window.location.href = "/login?next=/rooms/new";
        return;
      }
      if (!r.ok) throw new Error(data.error);
      window.location.href = `/rooms/${data.id}`;
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <>
      <Header />
      <main id="main-content" tabIndex={-1} className="form-wrap">
        <h1>{t("Create a study room")}</h1>
        <p className="muted">
          {t(
            "Name your session, add your notes, and share the room link with your group.",
          )}
        </p>
        <form onSubmit={submit}>
          <label>
            {t("Room name")}
            <input
              name="name"
              placeholder={t("e.g. Biology — chapter 3")}
              maxLength={100}
              minLength={2}
              required
            />
          </label>
          <label>
            {t("Your display name")}
            <input
              name="displayName"
              placeholder={t("Name shown to the group")}
              maxLength={50}
              required
            />
          </label>
          <label>
            {t("Study focus")} <span className="muted">{t("Optional")}</span>
            <textarea
              name="studyFocus"
              maxLength={2000}
              placeholder={t(
                "Focus on chapter 3. Skip the historical background. Explain things with examples.",
              )}
            />
          </label>
          {error && (
            <p className="error" role="alert">
              {t(error)}
            </p>
          )}
          <button disabled={busy} aria-busy={busy}>
            {busy ? t("Preparing your room…") : t("Create room")}
          </button>
          <small>
            {t("Only people with your room link can join after signing in.")}
          </small>
        </form>
      </main>
    </>
  );
}
