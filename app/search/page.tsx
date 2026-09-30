"use client";
import { useLanguage } from "@/components/LanguageProvider";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import Header from "@/components/Header";
type Result = {
  title: string;
  description: string;
  href: string;
  type: string;
};
export default function SearchPage() {
  const { t, locale } = useLanguage();
  const [q, setQ] = useState(""),
    [results, setResults] = useState<Result[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setResults([]);
    setError("");
    if (q.trim().length < 2) {
      setBusy(false);
      return;
    }
    setBusy(true);
    const timer = setTimeout(async () => {
      try {
        const r = await fetch("/api/search?q=" + encodeURIComponent(q), {
          signal: controller.signal,
        });
        const b = await r.json();
        if (!r.ok) throw new Error(b.error);
        setResults(b.results);
        setSignedIn(b.signedIn);
      } catch (e) {
        if (!controller.signal.aborted) setError((e as Error).message);
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, locale]);
  return (
    <>
      <Header />
      <main id="main-content" tabIndex={-1} className="shell search-page">
        <h1>{t("Search Study Room")}</h1>
        <p className="page-lead">
          {t("Search guides, help, and your private study material.")}
        </p>
        <label className="search-field">
          <Search size={23} />
          <span className="sr-only">{t("Search the site")}</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("Try confidence, biology, or a room name…")}
            maxLength={100}
          />
        </label>
        <div role="status" aria-live="polite" className="search-status">
          {busy ? (
            <>
              <span className="spinner" />
              {t("Searching…")}
            </>
          ) : error ? (
            t(error)
          ) : q.trim().length < 2 ? (
            t("Enter at least two characters to start.")
          ) : (
            t(results.length === 1 ? "{count} result" : "{count} results", {
              count: results.length,
            }) + (results.length === 0 ? t(" — try a different phrase.") : "")
          )}
        </div>
        {!signedIn && q.length >= 2 && !busy && (
          <p className="notice">
            <Link href="/login">{t("Sign in")}</Link>{" "}
            {t("to include your own rooms, notes, and discussions.")}
          </p>
        )}
        <div className="search-results">
          {results.map((r, i) => (
            <Link className="search-result" href={r.href} key={r.href + i}>
              <div>
                <h2>{r.title}</h2>
                <p className="meta-label">{t(r.type)}</p>
                <p>{r.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
