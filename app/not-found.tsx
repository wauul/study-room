import Link from "next/link";
import Header from "@/components/Header";
import { BookOpen, Search } from "lucide-react";
export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main-content" tabIndex={-1} className="shell not-found">
        <div className="lost-page">
          <span>4</span>
          <BookOpen size={100} />
          <span>4</span>
        </div>
        <span className="eyebrow">A page out of place</span>
        <h1>
          Let’s get you
          <br />
          <em>back on track.</em>
        </h1>
        <p>
          This page may have moved, or the link might be incomplete. Your next
          study session is still waiting.
        </p>
        <div className="row">
          <Link className="button" href="/">
            Back to my spaces
          </Link>
          <Link className="button secondary" href="/search">
            <Search size={17} />
            Search the site
          </Link>
        </div>
      </main>
    </>
  );
}
