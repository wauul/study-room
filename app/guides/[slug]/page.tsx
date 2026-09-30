import { getLocale } from "@/lib/locale";
import { translator } from "@/lib/i18n";
import { notFound } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import CodeBlock from "@/components/CodeBlock";
import { getPosts } from "@/lib/content";
export default async function Post({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const locale = await getLocale();
  const t = translator(locale);
  const posts = getPosts(locale);
  const { slug } = await params;
  const p = posts.find((p) => p.slug === slug);
  if (!p) notFound();
  return (
    <>
      <Header />
      <main id="main-content" tabIndex={-1} className="shell article-page">
        <Link className="text-link" href="/guides">
          {t("← Back to the journal")}
        </Link>
        <article>
          <h1>{p.title}</h1>
          <p className="meta-label">{p.category}</p>
          <p className="page-lead">{p.intro}</p>
          <p className="post-date">
            {t("Last updated")}
            <time dateTime={p.updated}>{t("15 September 2026")}</time> · Study
            Room
          </p>
          {p.paragraphs.map((text, i) => (
            <section key={text}>
              <p>{text}</p>
            </section>
          ))}
          {p.code && (
            <CodeBlock>
              <code>{p.code}</code>
            </CodeBlock>
          )}
        </article>
        <Link href="/rooms/new" className="button">
          {t("Create a study room")}
        </Link>
      </main>
    </>
  );
}
