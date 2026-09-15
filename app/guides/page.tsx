import Header from "@/components/Header";
import Newsletter from "@/components/Newsletter";
import Link from "next/link";
import { posts } from "@/lib/content";
export default function Guides() {
  return (
    <>
      <Header />
      <main id="main-content" tabIndex={-1} className="shell">
        <span className="eyebrow">The study journal</span>
        <h1>
          A little perspective.
          <br />
          <em>A better way to learn.</em>
        </h1>
        <p className="page-lead">
          Practical notes for the moments between “I’m lost” and “I get it.”
        </p>
        <div className="journal-grid">
          {posts.map((p, i) => (
            <article className="journal-card" key={p.slug}>
              <Link href={"/guides/" + p.slug}>
                <div className={"journal-art art-" + i}>
                  <span>0{i + 1}</span>
                  <span>
                    {
                      [
                        "Start with a question.",
                        "Trust your uncertainty.",
                        "Leave with a next step.",
                      ][i]
                    }
                  </span>
                </div>
                <div className="journal-body">
                  <span className="eyebrow">{p.category}</span>
                  <h2>{p.title}</h2>
                  <p>{p.intro}</p>
                  <small>
                    Last updated{" "}
                    <time dateTime={p.updated}>15 September 2026</time>
                  </small>
                  <span className="accent">Read the note ↗</span>
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
