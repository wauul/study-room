"use client";
import { useState } from "react";
import Header from "@/components/Header";
import Dialog from "@/components/Dialog";
export default function Unsubscribe() {
  const [confirm, setConfirm] = useState(false),
    [done, setDone] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <>
      <Header />
      <main id="main-content" tabIndex={-1} className="shell article-page">
        <h1>{done ? "You’re unsubscribed." : "A quieter inbox?"}</h1>
        <p className="page-lead">
          {done
            ? "You won’t receive future newsletters from this subscription."
            : "You can stop Study Room newsletter emails here. Your account and study rooms will stay available."}
        </p>
        {!done && (
          <button onClick={() => setConfirm(true)}>
            Unsubscribe from newsletters
          </button>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {confirm && (
          <Dialog
            title="Unsubscribe from newsletters?"
            onClose={() => setConfirm(false)}
            busy={busy}
          >
            <p>You will stop receiving study tips and product updates.</p>
            <div className="row">
              <button
                className="secondary"
                disabled={busy}
                onClick={() => setConfirm(false)}
              >
                Keep my subscription
              </button>
              <button
                disabled={busy}
                aria-busy={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const token = new URLSearchParams(location.search).get(
                      "token",
                    );
                    const r = await fetch("/api/newsletter/unsubscribe", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ token }),
                    });
                    if (!r.ok)
                      throw new Error(
                        "This unsubscribe link is incomplete. Use the full link from your newsletter.",
                      );
                    setDone(true);
                    setConfirm(false);
                  } catch (e) {
                    setError((e as Error).message);
                    setConfirm(false);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? "Saving…" : "Yes, unsubscribe"}
              </button>
            </div>
          </Dialog>
        )}
      </main>
    </>
  );
}
