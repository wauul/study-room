"use client";
import { useLanguage } from "@/components/LanguageProvider";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
export default function Newsletter() {
  const { t } = useLanguage();
  const [state, setState] = useState(""),
    [error, setError] = useState("");
  return (
    <section className="newsletter" aria-labelledby="newsletter-heading">
      <div>
        <h2 id="newsletter-heading">{t("Notes for your next session")}</h2>
        <p>
          {t(
            "Occasional study tips and product updates. Unsubscribe whenever you like.",
          )}
        </p>
      </div>
      {state === "success" ? (
        <div className="newsletter-success" role="status">
          <CheckCircle2 size={30} />
          <h3>{t("Subscription saved")}</h3>
          <p>
            {t(
              "Your email is saved. You can unsubscribe from any future newsletter.",
            )}
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
          <label htmlFor="newsletter-email">{t("Email address")}</label>
          <div className="newsletter-input">
            <input
              id="newsletter-email"
              name="email"
              type="email"
              placeholder={t("you@example.com")}
              autoComplete="email"
              maxLength={254}
              required
            />
            <button disabled={state === "busy"} aria-busy={state === "busy"}>
              {state === "busy" ? t("Subscribing…") : t("Subscribe")}
            </button>
          </div>
          <label className="check-label">
            <input name="consent" type="checkbox" required />
            {t("I’d like occasional Study Room emails.")}
          </label>
          <label className="honeypot" aria-hidden="true">
            {t("Website")}
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
          {error && (
            <p role="alert" className="error">
              {t(error)}
            </p>
          )}
        </form>
      )}
    </section>
  );
}
