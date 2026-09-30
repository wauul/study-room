"use client";

import { useLanguage } from "@/components/LanguageProvider";
import Header from "@/components/Header";
export default function Loading() {
  const { t, locale } = useLanguage();
  return (
    <>
      <Header />
      <main id="main-content" tabIndex={-1} className="shell" aria-busy="true">
        <p className="search-status" role="status">
          <span className="spinner" />
          {t("Making room for you…")}
        </p>
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-line" />
        <div className="room-grid">
          {[1, 2, 3].map((n) => (
            <div className="skeleton skeleton-card" key={n} />
          ))}
        </div>
      </main>
    </>
  );
}
