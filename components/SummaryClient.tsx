"use client";
import { useLanguage } from "@/components/LanguageProvider";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Download, Mail, Check, RefreshCw } from "lucide-react";
import type { Rundown } from "@/lib/summary";
import Header from "./Header";
type SummaryData = {
  roomName: string;
  summary: Rundown;
  results: {
    id: string;
    score: number;
    zeroProbability: boolean;
    submittedDistribution: number[];
    quizQuestion: { questionText: string; correctOptionIndex: number };
  }[];
  isHost: boolean;
  displayName: string;
};
export default function SummaryClient({ id }: { id: string }) {
  const { t } = useLanguage();
  const [sentCount, setSentCount] = useState(0);
  const [data, setData] = useState<SummaryData | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState("");
  useEffect(() => {
    fetch(`/api/rooms/${id}/summary`)
      .then(async (r) => {
        if (r.status === 401) {
          window.location.href = `/login?next=/rooms/${id}/summary`;
          return;
        }
        const b = await r.json();
        if (!r.ok) throw new Error(b.error);
        setData(b);
      })
      .catch((e) => setError(e.message));
  }, [id]);
  async function pdf() {
    setBusy("pdf");
    setError("");
    try {
      const r = await fetch(`/api/rooms/${id}/summary/pdf`, { method: "POST" });
      if (!r.ok) throw new Error((await r.json()).error);
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = "study-room-rundown.pdf";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function email(all = false) {
    setBusy(all ? "all" : "email");
    setError("");
    try {
      const r = await fetch(`/api/rooms/${id}/summary/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all }),
      });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error);
      setSentCount(b.sent);
      setNotice(
        b.sent === 1
          ? "{count} personalized copy sent. Check your inbox."
          : "{count} personalized copies sent. Check your inbox.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function regenerate(sourceChunkId: string) {
    setBusy(sourceChunkId);
    try {
      const r = await fetch(`/api/rooms/${id}/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceChunkId }),
      });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error);
      setData((d) =>
        d
          ? {
              ...d,
              summary: {
                ...d.summary,
                strugglePoints: d.summary.strugglePoints.map((p) =>
                  p.sourceChunkId === sourceChunkId
                    ? { ...p, explanation: b.explanation }
                    : p,
                ),
              },
            }
          : d,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  return (
    <>
      <Header />
      <main id="main-content" tabIndex={-1} className="shell summary-page">
        {error && (
          <p className="error" role="alert">
            {t(error)}
          </p>
        )}
        {notice && (
          <p className="notice" role="status">
            {t(notice, { count: sentCount })}
          </p>
        )}
        {!data ? (
          <div className="empty" aria-busy={!error} role="status">
            {error ? <BookOpen size={40} /> : <span className="spinner" />}
            <h2>
              {error ? t("Rundown unavailable") : t("Gathering your notes…")}
            </h2>
            <Link className="button secondary" href="/">
              {t("Back to your rooms")}
            </Link>
          </div>
        ) : (
          <>
            <div className="intro">
              <div>
                <h1>{data.roomName}</h1>
                <p>
                  {t(
                    "Shared findings and next steps, with a personal confidence record for",
                  )}{" "}
                  {data.displayName}.
                </p>
              </div>
            </div>
            <div className="summary-actions">
              <p className="muted">{t("AI-generated study guidance. Check explanations against your course material.")}</p>
              <button
                onClick={pdf}
                disabled={!!busy}
                aria-busy={busy === "pdf"}
              >
                <Download size={16} />
                {busy === "pdf"
                  ? t("Preparing your PDF…")
                  : t("Download my PDF")}
              </button>
              <button
                className="secondary"
                onClick={() => email()}
                aria-busy={busy === "email"}
                disabled={!!busy}
              >
                <Mail size={16} />
                {busy === "email"
                  ? t("Sending your copy…")
                  : t("Email me a copy")}
              </button>
              {data.isHost && (
                <button
                  className="quiet"
                  disabled={!!busy}
                  onClick={() => email(true)}
                >
                  {t("Send to all participants")}
                </button>
              )}
            </div>
            <div className="summary-grid">
              <div>
                <section className="summary-section">
                  <h2>
                    <Check
                      size={21}
                      className="accent"
                      style={{ display: "inline", marginRight: 12 }}
                    />
                    {t("What clicked")}
                  </h2>
                  {data.summary.wellUnderstood.length ? (
                    data.summary.wellUnderstood.map((p, i) => (
                      <article className="insight" key={i}>
                        <h3>{p.topic}</h3>
                        <p>{p.evidence}</p>
                      </article>
                    ))
                  ) : (
                    <p className="muted">
                      {t(
                        "There isn’t enough evidence to call a topic mastered yet. That’s a useful place to start.",
                      )}
                    </p>
                  )}
                </section>
                <section className="summary-section">
                  <h2>{t("Worth another look")}</h2>
                  {data.summary.strugglePoints.length ? (
                    data.summary.strugglePoints.map((p, i) => (
                      <article className="insight" key={i}>
                        <div className="row between">
                          <h3>{p.topic}</h3>
                          <span className="tag">
                            {t("{severity} priority", {
                              severity: t(p.severity),
                            })}
                          </span>
                        </div>
                        <p>{p.evidence}</p>
                        <Link
                          className="text-link"
                          href={`/rooms/${id}/notes?chunk=${encodeURIComponent(p.sourceChunkId)}#chunk-${encodeURIComponent(p.sourceChunkId)}`}
                        >
                          {t("Read source passage")}
                        </Link>
                        {p.explanation && (
                          <p className="explanation">{p.explanation}</p>
                        )}
                        {p.severity === "high" && (
                          <button
                            className="quiet"
                            style={{ marginTop: 10 }}
                            disabled={!!busy}
                            onClick={() => regenerate(p.sourceChunkId)}
                          >
                            <RefreshCw size={13} />
                            {busy === p.sourceChunkId
                              ? t("Finding simpler words…")
                              : t("Explain it even more simply")}
                          </button>
                        )}
                      </article>
                    ))
                  ) : (
                    <p className="muted">
                      {t(
                        "No clear struggle signal was recorded. A quiz next time can help check understanding.",
                      )}
                    </p>
                  )}
                </section>
              </div>
              <aside>
                <section className="summary-section">
                  <h2>{t("Next study steps")}</h2>
                  {data.summary.studyTips.map((tip, i) => (
                    <div
                      className="insight row"
                      key={i}
                      style={{ alignItems: "flex-start" }}
                    >
                      <span
                        className="accent"
                        style={{ fontFamily: "var(--mono)", fontSize: 23 }}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <p>{tip}</p>
                    </div>
                  ))}
                  <p className="suggested-next-step">
                    {data.summary.suggestedNextSteps}
                  </p>
                </section>
                <section className="summary-section">
                  <h2>{t("Your confidence record")}</h2>
                  <p
                    className="muted"
                    style={{ fontSize: 13, lineHeight: 1.7 }}
                  >
                    {t(
                      "Your quiz submissions. A higher log score means you assigned more probability to the correct answer.",
                    )}
                  </p>
                  {data.results.length ? (
                    data.results.map((r, i) => (
                      <div className="insight" key={r.id}>
                        <p>
                          {i + 1}. {r.quizQuestion.questionText}
                        </p>
                        <div className="row between" style={{ marginTop: 10 }}>
                          <small>
                            {
                              r.submittedDistribution[
                                r.quizQuestion.correctOptionIndex
                              ]
                            }
                            {t("% on the correct answer")}
                          </small>
                          <strong className="accent">
                            {r.zeroProbability ? "−∞" : r.score.toFixed(3)}
                          </strong>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p style={{ marginTop: 20 }} className="muted">
                      {t("You didn’t submit a quiz answer this session.")}
                    </p>
                  )}
                </section>
              </aside>
            </div>
            <nav
              className="summary-navigation"
              aria-label={t("Continue studying")}
            >
              <Link href="/rooms/new" className="button secondary">
                {t("Create another room")}
              </Link>
              <Link href={`/rooms/${id}/notes`} className="button secondary">
                {t("Read saved notes & discussion")}
              </Link>
            </nav>
          </>
        )}
      </main>
    </>
  );
}
