import { getLocale } from "@/lib/locale";
import { translator } from "@/lib/i18n";
import Header from "@/components/Header";
import Newsletter from "@/components/Newsletter";
import { getFaqs, trackedUrl } from "@/lib/content";
export default async function Help() {
  const locale = await getLocale();
  const t = translator(locale);
  const faqs = getFaqs(locale);
  return (
    <>
      <Header />
      <main id="main-content" tabIndex={-1} className="shell">
        <div className="help-intro">
          <h1>{t("Help with Study Room")}</h1>
          <p className="page-lead">
            {t("How rooms, source material, quizzes, and saved reports work.")}
          </p>
        </div>
        <div className="faq-list">
          {faqs.map(([q, a], i) => (
            <details key={q} id={"faq-" + i}>
              <summary>
                <span className="faq-number">0{i + 1}</span>
                {q}
                <span className="faq-icon" aria-hidden="true">
                  +
                </span>
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
        <p className="help-contact">
          {t("Still have a question?")}{" "}
          <a
            className="text-link"
            href={trackedUrl("https://github.com/wauul/study-room/issues/new")}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("Contact the maintainer ↗")}
          </a>
        </p>
        <Newsletter />
      </main>
    </>
  );
}
