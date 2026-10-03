import { getLocale } from "@/lib/locale";
import { translator } from "@/lib/i18n";
import Header from "@/components/Header";
export default async function Privacy() {
  const locale = await getLocale();
  const t = translator(locale);
  return (
    <>
      <Header />
      <main id="main-content" tabIndex={-1} className="shell article-page">
        <h1>{t("Privacy, in plain words")}</h1>
        <p className="post-date">{t("Last updated 3 October 2026")}</p>
        <div className="prose">
          <h2>{t("Essential storage")}</h2>
          <p>
            {t(
              "Session and security cookies keep you signed in and protect forms. Theme preference, language preference and cookie-notice acknowledgement are stored locally in your browser. No optional analytics cookies are used.",
            )}
          </p>
          <h2>{t("Your study material")}</h2>
          <p>
            {t(
              "Accounts, room membership, extracted notes, discussions and quiz results are stored in Neon. Room participants can access shared material. Relevant passages are sent to Groq to generate answers. Personalized emails are delivered through Resend when requested.",
            )}
          </p>
          <h2>{t("Application diagnostics")}</h2>
          <p>{t("We use Sentry, with data stored in the European Union, to detect application failures and measure performance. Diagnostic events contain error types, code locations, sanitized route patterns, timings, counts and release identifiers. We remove exception text, account identifiers, emails, credentials, invite tokens, document names and content, study questions, answers, quiz submissions and generated reports before sending these events. Sentry receives network connection information when a browser sends diagnostics.")}</p>
          <p>{t("Session replay and profiling are disabled by default. Replay requires a separate, explicit consent step before it can start. If enabled, page text and inputs are masked, study panes and documents are blocked, and network bodies are excluded. Application source maps are uploaded separately to make code locations readable; they contain application code, not your study material.")}</p>
          <h2>{t("Newsletter")}</h2>
          <p>
            {t(
              "Signing up stores your email and consent date for occasional Study Room newsletters. Future campaigns must include an unsubscribe link. Signing up does not automatically send a message.",
            )}
          </p>
          <h2>{t("External links")}</h2>
          <p>
            {t(
              "Outbound web links include campaign labels identifying Study Room as the source. Those labels contain no account, email, room, or document data. External sites have their own privacy practices.",
            )}
          </p>
        </div>
      </main>
    </>
  );
}
