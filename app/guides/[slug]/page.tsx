import { notFound } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import CodeBlock from "@/components/CodeBlock";
import { posts } from "@/lib/content";
export default async function Post({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = posts.find((p) => p.slug === slug);
  if (!p) notFound();
  return (
    <>
      <Header />
      <main id="main-content" tabIndex={-1} className="shell article-page">
        <Link className="text-link" href="/guides">
          ← Back to the journal
        </Link>
        <article>
          <span className="eyebrow">{p.category}</span>
          <h1>{p.title}</h1>
          <p className="page-lead">{p.intro}</p>
          <p className="post-date">
            Last updated <time dateTime={p.updated}>15 September 2026</time> ·
            Study Room
          </p>
          {p.paragraphs.map((text, i) => (
            <section key={text}>
              <span className="step-number">0{i + 1}</span>
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
          Put it into practice ↗
        </Link>
      </main>
    </>
  );
}
