"use client";
import { useLanguage } from "@/components/LanguageProvider";
import LanguageMenu from "@/components/LanguageMenu";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  rememberSearchOrigin,
  searchReturnPath,
} from "@/lib/search-navigation";
import { useEffect, useRef, useState } from "react";
import {
  Search,
  Menu,
  X,
  Plus,
  Sun,
  Moon,
} from "lucide-react";
export default function Header() {
  const { t } = useLanguage();
  const header = useRef<HTMLElement>(null);
  const [theme, setTheme] = useState("light"),
    [open, setOpen] = useState(false);
  const path = usePathname();
  const router = useRouter();
  const [mobile, setMobile] = useState(false);
  const searchOpen = mobile && path === "/search";
  useEffect(() => {
    const element = header.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      document.documentElement.style.setProperty(
        "--sticky-header-height",
        `${element.getBoundingClientRect().height}px`,
      );
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 800px)");
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    try {
      setTheme(document.documentElement.dataset.theme || "light");
    } catch {}
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      let preference = "system";
      try {
        preference = localStorage.getItem("study-theme") || "system";
      } catch {}
      if (preference === "system") {
        const next = media.matches ? "dark" : "light";
        document.documentElement.dataset.theme = next;
        setTheme(next);
      }
    };
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    setOpen(false);
  }, [path]);
  function changeTheme() {
    const value =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    setTheme(value);
    document.documentElement.dataset.theme = value;
    try {
      localStorage.setItem("study-theme", value);
    } catch {}
  }
  return (
    <header className="topbar" ref={header}>
      <Link href="/" className="brand" aria-label={t("Study Room home")}>
        <span className="brand-symbol" aria-hidden="true">
          [ ]
        </span>
        Study Room
      </Link>
      <nav className="desktop-nav" aria-label={t("Main navigation")}>
        <Link href="/account" aria-current={path === "/account" ? "page" : undefined}>{t("Account")}</Link>
        <Link href="/" aria-current={path === "/" ? "page" : undefined}>
          {t("My rooms")}
        </Link>
        <Link
          href="/guides"
          aria-current={path.startsWith("/guides") ? "page" : undefined}
        >
          {t("Study journal")}
        </Link>
        <Link href="/help" aria-current={path === "/help" ? "page" : undefined}>
          {t("Help")}
        </Link>
      </nav>
      <div className="header-actions">
        <Link
          className={`search-launch${searchOpen ? " search-is-open" : ""}`}
          href={searchOpen ? "/" : "/search"}
          aria-label={searchOpen ? t("Close search") : t("Search Study Room")}
          onClick={(event) => {
            if (
              event.ctrlKey ||
              event.metaKey ||
              event.shiftKey ||
              event.altKey
            )
              return;
            if (searchOpen) {
              event.preventDefault();
              router.push(searchReturnPath());
            } else rememberSearchOrigin();
          }}
        >
          {searchOpen ? <X size={17} /> : <Search size={17} />}
          <span>{searchOpen ? t("Close search") : t("Search")}</span>
          <kbd>/</kbd>
        </Link>
        <button
          type="button"
          className="secondary icon-button theme-toggle"
          aria-label={t(
            theme === "dark" ? "Switch to light mode" : "Switch to dark mode",
          )}
          title={t(
            theme === "dark" ? "Switch to light mode" : "Switch to dark mode",
          )}
          aria-pressed={theme === "dark"}
          onClick={changeTheme}
        >
          {theme === "dark" ? (
            <Moon size={18} aria-hidden="true" />
          ) : (
            <Sun size={18} aria-hidden="true" />
          )}
        </button>
        <LanguageMenu key={path} />
        <Link href="/rooms/new" className="button header-create">
          <Plus size={16} />
          {t("New room")}
        </Link>
        <button
          className="secondary icon-button menu-toggle"
          aria-expanded={open}
          aria-controls="mobile-navigation"
          aria-label={open ? t("Close menu") : t("Open menu")}
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {open && (
        <nav
          id="mobile-navigation"
          className="mobile-nav"
          aria-label={t("Mobile navigation")}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              (document.querySelector(".menu-toggle") as HTMLElement)?.focus();
            }
          }}
        >
          <Link href="/">{t("My rooms")}</Link>
          <Link href="/search" onClick={rememberSearchOrigin}>
            {t("Search")}
          </Link>
          <Link href="/guides">{t("Study journal")}</Link>
          <Link
            href="/help"
            aria-current={path === "/help" ? "page" : undefined}
          >
            {t("Help")}
          </Link>
          <Link href="/rooms/new">{t("Create a room")}</Link>
          <Link href="/account">{t("Account")}</Link>
          <Link href="/login">{t("Sign in")}</Link>
        </nav>
      )}
    </header>
  );
}
