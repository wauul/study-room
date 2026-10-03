"use client";
import { useLanguage } from "@/components/LanguageProvider";

import Link from "next/link";
import { useEffect } from "react";
import { captureFailure } from "@/lib/telemetry";
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t, locale } = useLanguage();
  useEffect(() => { if (!error.digest) captureFailure(error, "react.error"); }, [error]);
  return (
    <main id="main-content" tabIndex={-1} className="shell not-found">
      <h1>{t("This page couldn’t load")}</h1>
      <p>
        {t(
          "Try again. If the problem continues, return to your rooms or report it through Help.",
        )}
      </p>
      <div className="row">
        <button onClick={reset}>{t("Try again")}</button>
        <Link href="/" className="button secondary">
          {t("Back to rooms")}
        </Link>
        <Link href="/help" className="text-link">
          {t("Help")}
        </Link>
      </div>
    </main>
  );
}
