import Link from "next/link";
import { BookOpen } from "lucide-react";
export default function Header() {
  return (
    <header className="topbar">
      <Link href="/" className="brand">
        <BookOpen size={27} />
        study room<span className="accent">.</span>
      </Link>
      <nav className="toplinks">
        <Link href="/">Your study spaces</Link>
        <span className="eyebrow">A little clearer, together</span>
      </nav>
    </header>
  );
}
