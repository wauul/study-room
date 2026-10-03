"use client";
import { useEffect, useState } from "react";
import { translator, localeCookie, type Locale } from "@/lib/i18n";
import { captureFailure } from "@/lib/telemetry";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [locale, setLocale] = useState<Locale>("en");
  useEffect(() => {
    const saved = document.cookie
      .split("; ")
      .find((value) => value.startsWith(`${localeCookie}=`))
      ?.split("=")[1];
    setLocale(
      saved === "fr" || (!saved && navigator.language.startsWith("fr"))
        ? "fr"
        : "en",
    );
    if (!error.digest) captureFailure(error, "react.global-error");
  }, [error]);
  const t = translator(locale);
  // Root layout, fonts and LanguageProvider may all have failed. Use plain HTML and local styles.
  return (
    <html lang={locale}>
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, sans-serif",
          color: "#202538",
          background: "#faf9fc",
        }}
      >
        <main
          id="main-content"
          tabIndex={-1}
          style={{ maxWidth: 640, margin: "10vh auto", padding: 24 }}
        >
          <h1>{t("This page couldn’t load")}</h1>
          <p>
            {t(
              "Try again. If the problem continues, return to your rooms or report it through Help.",
            )}
          </p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 20,
              alignItems: "center",
            }}
          >
            <button
              onClick={reset}
              style={{
                padding: "12px 20px",
                font: "inherit",
                cursor: "pointer",
              }}
            >
              {t("Try again")}
            </button>
            <a href="/">{t("Back to rooms")}</a>
            <a href="/help">{t("Help")}</a>
          </div>
        </main>
      </body>
    </html>
  );
}
