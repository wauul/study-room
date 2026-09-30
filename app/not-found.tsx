import { getLocale } from "@/lib/locale";
import { translator } from "@/lib/i18n";
import Link from "next/link";
import Header from "@/components/Header";
import { Search } from "lucide-react";
export default async function NotFound() {
  const locale = await getLocale();
  const t = translator(locale);
  return (
    <>
      <Header />
      <main id="main-content" tabIndex={-1} className="shell not-found">
        <h1>{t("Page not found")}</h1>
        <p className="meta-label">{t("Error 404")}</p>
        <p>
          {t(
            "This page is unavailable. Check the link, or return to your study rooms.",
          )}
        </p>
        <div className="row">
          <Link className="button" href="/">
            {t("Back to rooms")}
          </Link>
          <Link className="button secondary" href="/search">
            <Search size={17} />
            {t("Search the site")}
          </Link>
        </div>
      </main>
    </>
  );
}
