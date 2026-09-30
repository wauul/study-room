"use client";
import { useLanguage } from "@/components/LanguageProvider";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUp, MessageCircle, ArrowUpRight } from "lucide-react";
import Dialog from "./Dialog";
import { trackedUrl } from "@/lib/content";
import {
  rememberSearchOrigin,
  searchReturnPath,
} from "@/lib/search-navigation";
export default function SiteTools() {
  const { t } = useLanguage();
  const progress = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(false),
    [contact, setContact] = useState(false),
    [cookies, setCookies] = useState(false);
  const path = usePathname(),
    router = useRouter();
  useEffect(() => {
    try {
      setCookies(!localStorage.getItem("study-cookie-notice"));
    } catch {
      setCookies(true);
    }
  }, []);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const max = document.documentElement.scrollHeight - innerHeight;
        if (progress.current)
          progress.current.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
        setTop((previous) =>
          previous === scrollY > 350 ? previous : scrollY > 350,
        );
      });
    };
    update();
    addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update);
    const observer = new ResizeObserver(update);
    observer.observe(document.body);
    const key = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (
        e.key === "/" &&
        !e.ctrlKey &&
        !e.metaKey &&
        !el.closest("input,textarea,select,[contenteditable=true],dialog")
      ) {
        e.preventDefault();
        if (
          path === "/search" &&
          window.matchMedia("(max-width: 800px)").matches
        )
          router.push(searchReturnPath());
        else {
          rememberSearchOrigin();
          router.push("/search");
        }
      }
    };
    addEventListener("keydown", key);
    return () => {
      removeEventListener("scroll", update);
      removeEventListener("resize", update);
      removeEventListener("keydown", key);
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [path, router]);
  return (
    <>
      <div
        className="scroll-progress"
        aria-hidden="true"
        ref={progress}
        style={{ transform: "scaleX(0)" }}
      />
      <nav
        className="site-support-tools"
        aria-label={t("Help and page navigation")}
      >
        {top && (
          <button
            className="secondary icon-button"
            aria-label={t("Back to top")}
            onClick={() => {
              window.scrollTo({
                top: 0,
                behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
                  ? "instant"
                  : "smooth",
              });
              document
                .getElementById("main-content")
                ?.focus({ preventScroll: true });
            }}
          >
            <ArrowUp size={19} />
          </button>
        )}
        <button
          className="contact-button"
          aria-label={t("Get help with Study Room")}
          onClick={() => setContact(true)}
        >
          <MessageCircle size={19} />
          <span>{t("Help and feedback")}</span>
        </button>
      </nav>
      {contact && (
        <Dialog
          title={t("Help and feedback")}
          onClose={() => setContact(false)}
        >
          <p>
            {t(
              "Find an answer in our help guide or report a problem to the project maintainer.",
            )}
          </p>
          <div className="stack">
            <Link
              className="button secondary"
              href="/help"
              onClick={() => setContact(false)}
            >
              {t("Browse help & FAQ")}
            </Link>
            <a
              className="button"
              href={trackedUrl(
                "https://github.com/wauul/study-room/issues/new",
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("Contact via GitHub")}
              <ArrowUpRight size={17} />
            </a>
            <small>
              {t(
                "GitHub issues are public. Please leave passwords and private study notes out of your report.",
              )}
            </small>
          </div>
        </Dialog>
      )}
      {cookies && (
        <aside className="cookie-banner" aria-label={t("Cookie information")}>
          <div>
            <strong>{t("Essential cookies")}</strong>
            <p>
              {t(
                "We use essential cookies to keep you signed in. Your theme and language preferences stay on this device. No optional analytics cookies are used.",
              )}
            </p>
            <Link href="/privacy">{t("Privacy details")}</Link>
          </div>
          <button
            onClick={() => {
              try {
                localStorage.setItem("study-cookie-notice", "acknowledged");
              } catch {}
              setCookies(false);
            }}
          >
            {t("Got it")}
          </button>
        </aside>
      )}
    </>
  );
}
