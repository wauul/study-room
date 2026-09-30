"use client";

import { useLanguage } from "@/components/LanguageProvider";
import Link from "next/link";
import { trackedUrl } from "@/lib/content";
export default function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="site-footer">
      <div>
        <Link className="brand" href="/">
          <span className="brand-symbol" aria-hidden="true">
            [ ]
          </span>
          Study Room
        </Link>
        <p>{t("Read, question, and check")}</p>
      </div>
      <nav aria-label={t("Footer navigation")}>
        <Link href="/guides">{t("Study journal")}</Link>
        <Link href="/help">{t("Help")}</Link>
        <Link href="/privacy">{t("Privacy")}</Link>
        <a
          href={trackedUrl("https://github.com/wauul/study-room")}
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub ↗
        </a>
      </nav>
      <small>{t("Shared learning, grounded in your notes.")}</small>
    </footer>
  );
}
