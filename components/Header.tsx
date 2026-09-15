"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { rememberSearchOrigin, searchReturnPath } from "@/lib/search-navigation";
import { useEffect, useState } from "react";
import { BookOpen, Search, Moon, Sun, Menu, X, Plus } from "lucide-react";
export default function Header() {
  const [dark, setDark] = useState(false),
    [open, setOpen] = useState(false);
  const path = usePathname();
  const router = useRouter();
  useEffect(() => {
    setDark(document.documentElement.dataset.theme === "dark");
  }, []);
  useEffect(() => {
    setOpen(false);
  }, [path]);
  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    try {
      localStorage.setItem("study-theme", next ? "dark" : "light");
    } catch {}
  }
  return (
    <header className="topbar">
      <Link href="/" className="brand" aria-label="Study Room home">
        <span className="brand-symbol">
          <BookOpen size={21} />
        </span>
        study room<span className="accent">.</span>
      </Link>
      <nav className="desktop-nav" aria-label="Main navigation">
        <Link href="/" aria-current={path === "/" ? "page" : undefined}>
          My spaces
        </Link>
        <Link
          href="/guides"
          aria-current={path.startsWith("/guides") ? "page" : undefined}
        >
          Study journal
        </Link>
        <Link href="/help">Help & FAQ</Link>
      </nav>
      <div className="header-actions">
        <Link
          className="search-launch"
          href={path === "/search" ? "/" : "/search"}
          aria-label={path === "/search" ? "Close search" : "Search Study Room"}
          onClick={(event) => {
            if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
            if (path === "/search") {
              event.preventDefault();
              router.push(searchReturnPath());
            } else rememberSearchOrigin();
          }}
        >
          {path === "/search" ? <X size={17} /> : <Search size={17} />}
          <span>{path === "/search" ? "Close search" : "Search anything"}</span>
          <kbd>/</kbd>
        </Link>
        <button
          className="secondary icon-button"
          onClick={toggle}
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {dark ? <Sun size={19} /> : <Moon size={19} />}
        </button>
        <Link href="/rooms/new" className="button header-create">
          <Plus size={16} />
          New room
        </Link>
        <button
          className="secondary icon-button menu-toggle"
          aria-expanded={open}
          aria-controls="mobile-navigation"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {open && (
        <nav
          id="mobile-navigation"
          className="mobile-nav"
          aria-label="Mobile navigation"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              (document.querySelector(".menu-toggle") as HTMLElement)?.focus();
            }
          }}
        >
          <Link href="/">My spaces</Link>
          <Link href="/guides">Study journal</Link>
          <Link href="/help">Help & FAQ</Link>
          <Link href={path === "/search" ? "/" : "/search"} onClick={(event) => { if (path === "/search") { event.preventDefault(); router.push(searchReturnPath()); } else rememberSearchOrigin(); }}>{path === "/search" ? "Close search" : "Search the site"}</Link>
          <Link href="/rooms/new">Create a room</Link>
          <Link href="/login">Sign in</Link>
        </nav>
      )}
    </header>
  );
}
