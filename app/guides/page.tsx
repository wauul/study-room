import { getLocale } from "@/lib/locale";
import { translator } from "@/lib/i18n";
import Header from "@/components/Header";
import Newsletter from "@/components/Newsletter";
import Link from "next/link";
import { getPosts } from "@/lib/content";
export default async function Guides() {
  const locale = await getLocale();
  const t = translator(locale);
  const posts = getPosts(locale);
  return (
    <>
      <Header />
      <main id="main-content" tabIndex={-1} className="shell">
        <h1>{t("Study journal")}</h1>
        <p className="page-lead">
          {t(
            "Practical ways to ask better questions, use uncertainty, and plan your next session.",
          )}
        </p>
        <div className="journal-grid">
          {posts.map((p, i) => (
            <article className="journal-card" key={p.slug}>
              <Link href={"/guides/" + p.slug}>
                <div className={"journal-art art-" + i}>
                  <span aria-hidden="true">{["[?]", "100%", "[n]"][i]}</span>
                  <span>{[t("Ask"), t("Forecast"), t("Revisit")][i]}</span>
                </div>
                <div className="journal-body">
                  <h2>{p.title}</h2>
                  <p className="meta-label">{p.category}</p>
                  <p>{p.intro}</p>
                  <small>
                    {t("Last updated")}{" "}
                    <time dateTime={p.updated}>{t("15 September 2026")}</time>
                  </small>
                  <span className="accent">{t("Read the note")}</span>
                </div>
              </Link>
            </article>
          ))}
        </div>
        <Newsletter />
      </main>
    </>
  );
}
