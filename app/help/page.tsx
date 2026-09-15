import Header from "@/components/Header";
import Newsletter from "@/components/Newsletter";
import { faqs, trackedUrl } from "@/lib/content";
export default function Help() {
  return (
    <>
      <Header />
      <main id="main-content" tabIndex={-1} className="shell">
        <div className="help-intro">
          <span className="eyebrow">A little guidance</span>
          <h1>
            Good questions.
            <br />
            <em>Clear answers.</em>
          </h1>
          <p className="page-lead">
            Everything you need to settle in and get studying.
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
          Still have a question?{" "}
          <a
            className="text-link"
            href={trackedUrl("https://github.com/wauul/study-room/issues/new")}
            target="_blank"
            rel="noopener noreferrer"
          >
            Contact the maintainer ↗
          </a>
        </p>
        <Newsletter />
      </main>
    </>
  );
}
