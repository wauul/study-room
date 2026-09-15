"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Download,
  Mail,
  ArrowUpRight,
  Check,
  Leaf,
  RefreshCw,
} from "lucide-react";
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
      setNotice(
        `${b.sent} personalized ${b.sent === 1 ? "copy sent" : "copies sent"}. Check your inbox.`,
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
      <main id="main-content" tabIndex={-1} className="shell">
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="notice" role="status">
            {notice}
          </p>
        )}
        {!data ? (
          <div className="empty" aria-busy={!error} role="status">
            {error ? <BookOpen size={40} /> : <span className="spinner" />}
            <h2>
              {error ? "The rundown isn’t available." : "Gathering your notes…"}
            </h2>
            <Link className="button secondary" href="/">
              Back to your rooms
            </Link>
          </div>
        ) : (
          <>
            <div className="intro">
              <div>
                <span className="eyebrow">
                  The session rundown / {data.roomName}
                </span>
                <h1 style={{ marginTop: 18 }}>
                  A little clearer.
                  <br />
                  <em>A little further.</em>
                </h1>
                <p>
                  Here’s what you worked through together, {data.displayName}.
                  <br />
                  And a few good places to pick up next time.
                </p>
              </div>
              <div className="summary-mark">
                <Leaf size={40} />
              </div>
            </div>
            <div className="row" style={{ flexWrap: "wrap", marginBottom: 35 }}>
              <button
                onClick={pdf}
                disabled={!!busy}
                aria-busy={busy === "pdf"}
              >
                <Download size={16} />
                {busy === "pdf" ? "Preparing your PDF…" : "Download my PDF"}
              </button>
              <button
                className="secondary"
                onClick={() => email()}
                aria-busy={busy === "email"}
                disabled={!!busy}
              >
                <Mail size={16} />
                {busy === "email" ? "Sending your copy…" : "Email me a copy"}
              </button>
              {data.isHost && (
                <button
                  className="quiet"
                  disabled={!!busy}
                  onClick={() => email(true)}
                >
                  Send to all participants
                  <ArrowUpRight size={15} />
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
                    What clicked
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
                      There isn’t enough evidence to call a topic mastered yet.
                      That’s a useful place to start.
                    </p>
                  )}
                </section>
                <section className="summary-section">
                  <h2>Worth another look</h2>
                  {data.summary.strugglePoints.length ? (
                    data.summary.strugglePoints.map((p, i) => (
                      <article className="insight" key={i}>
                        <div className="row between">
                          <h3>{p.topic}</h3>
                          <span className="tag">{p.severity} priority</span>
                        </div>
                        <p>{p.evidence}</p>
                        {p.explanation && (
                          <p className="explanation">{p.explanation}</p>
                        )}
                        {p.severity === "high" && (
                          <button
                            className="quiet"
                            style={{ fontSize: 11, marginTop: 10 }}
                            disabled={!!busy}
                            onClick={() => regenerate(p.sourceChunkId)}
                          >
                            <RefreshCw size={13} />
                            {busy === p.sourceChunkId
                              ? "Finding simpler words…"
                              : "Explain it even more simply"}
                          </button>
                        )}
                      </article>
                    ))
                  ) : (
                    <p className="muted">
                      No clear struggle signal was recorded. A quiz next time
                      can help check understanding.
                    </p>
                  )}
                </section>
              </div>
              <aside>
                <section className="summary-section">
                  <span className="eyebrow">Keep the momentum</span>
                  <h2 style={{ marginTop: 12 }}>Your next small steps.</h2>
                  {data.summary.studyTips.map((tip, i) => (
                    <div
                      className="insight row"
                      key={i}
                      style={{ alignItems: "flex-start" }}
                    >
                      <span
                        className="accent"
                        style={{ fontFamily: "var(--serif)", fontSize: 23 }}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <p>{tip}</p>
                    </div>
                  ))}
                  <p
                    style={{
                      fontFamily: "var(--serif)",
                      fontStyle: "italic",
                      lineHeight: 1.8,
                      marginTop: 20,
                    }}
                  >
                    {data.summary.suggestedNextSteps}
                  </p>
                </section>
                <section className="summary-section">
                  <h2>Your confidence record</h2>
                  <p
                    className="muted"
                    style={{ fontSize: 11, lineHeight: 1.7 }}
                  >
                    A personal reflection. Higher scores mean better-calibrated
                    confidence.
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
                            % on the correct answer
                          </small>
                          <strong className="accent">
                            {r.zeroProbability ? "−∞" : r.score.toFixed(3)}
                          </strong>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p style={{ marginTop: 20 }} className="muted">
                      You didn’t submit a quiz answer this session.
                    </p>
                  )}
                </section>
              </aside>
            </div>
            <Link href="/rooms/new" className="button secondary">
              Make room for another session
              <ArrowUpRight size={16} />
            </Link>
            <Link
              href={`/rooms/${id}/notes`}
              className="button secondary"
              style={{ marginLeft: 12 }}
            >
              Read saved notes & discussion
            </Link>
          </>
        )}
      </main>
    </>
  );
}
