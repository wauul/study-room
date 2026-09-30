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
        <p className="post-date">{t("Last updated 15 September 2026")}</p>
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
