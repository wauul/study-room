import Link from "next/link";
import { trackedUrl } from "@/lib/content";
export default function Footer() {
  return (
    <footer className="site-footer">
      <div>
        <Link className="brand" href="/">
          study room<span className="accent">.</span>
        </Link>
        <p>Make room for understanding.</p>
      </div>
      <nav aria-label="Footer navigation">
        <Link href="/guides">Study journal</Link>
        <Link href="/help">Help & FAQ</Link>
        <Link href="/privacy">Privacy</Link>
        <a
          href={trackedUrl("https://github.com/wauul/study-room")}
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub ↗
        </a>
      </nav>
      <small>Built for curious minds.</small>
    </footer>
  );
}
