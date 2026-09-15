"use client";
import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
export default function Newsletter() {
  const [state, setState] = useState(""),
    [error, setError] = useState("");
  return (
    <section className="newsletter" aria-labelledby="newsletter-heading">
      <div>
        <span className="eyebrow">A note for your next session</span>
        <h2 id="newsletter-heading">Stay curious.</h2>
        <p>
          Occasional study tips and product updates. A little encouragement for
          your inbox.
        </p>
      </div>
      {state === "success" ? (
        <div className="newsletter-success" role="status">
          <CheckCircle2 size={30} />
          <h3>You’re on the list.</h3>
          <p>
            Thanks for making room for us. You can unsubscribe from any future
            newsletter.
          </p>
        </div>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            setState("busy");
            setError("");
            try {
              const r = await fetch("/api/newsletter", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: form.get("email"),
                  consent: form.get("consent") === "on",
                  website: form.get("website"),
                }),
              });
              const b = await r.json();
              if (!r.ok) throw new Error(b.error);
              setState("success");
            } catch (e) {
              setError((e as Error).message);
              setState("");
            }
          }}
        >
          <label htmlFor="newsletter-email">Email address</label>
          <div className="newsletter-input">
            <input
              id="newsletter-email"
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              maxLength={254}
              required
            />
            <button disabled={state === "busy"} aria-busy={state === "busy"}>
              {state === "busy" ? "Joining…" : "Count me in"}
              <ArrowRight size={16} />
            </button>
          </div>
          <label className="check-label">
            <input name="consent" type="checkbox" required />
            I’d like occasional Study Room emails.
          </label>
          <label className="honeypot" aria-hidden="true">
            Website
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
        </form>
      )}
    </section>
  );
}
