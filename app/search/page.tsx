"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, ArrowUpRight } from "lucide-react";
import Header from "@/components/Header";
type Result = {
  title: string;
  description: string;
  href: string;
  type: string;
};
export default function SearchPage() {
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
  }, [q]);
  return (
    <>
      <Header />
      <main id="main-content" tabIndex={-1} className="shell search-page">
        <span className="eyebrow">Find your next lightbulb moment</span>
        <h1>It’s in here somewhere.</h1>
        <p className="page-lead">
          Search guides, help, and your private study material.
        </p>
        <label className="search-field">
          <Search size={23} />
          <span className="sr-only">Search the site</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Try confidence, biology, or a room name…"
            maxLength={100}
          />
        </label>
        <div role="status" aria-live="polite" className="search-status">
          {busy ? (
            <>
              <span className="spinner" />
              Searching your shelves…
            </>
          ) : error ? (
            error
          ) : q.trim().length < 2 ? (
            "Enter at least two characters to start."
          ) : (
            `${results.length} results${results.length === 0 ? " — try a different phrase." : ""}`
          )}
        </div>
        {!signedIn && q.length >= 2 && !busy && (
          <p className="notice">
            <Link href="/login">Sign in</Link> to include your own rooms, notes,
            and discussions.
          </p>
        )}
        <div className="search-results">
          {results.map((r, i) => (
            <Link className="search-result" href={r.href} key={r.href + i}>
              <div>
                <span className="eyebrow">{r.type}</span>
                <h2>{r.title}</h2>
                <p>{r.description}</p>
              </div>
              <ArrowUpRight size={20} />
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
