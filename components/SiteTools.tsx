"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUp, MessageCircle, ArrowUpRight } from "lucide-react";
import Dialog from "./Dialog";
import { trackedUrl } from "@/lib/content";
import { rememberSearchOrigin, searchReturnPath } from "@/lib/search-navigation";
export default function SiteTools() {
  const [progress, setProgress] = useState(0),
    [top, setTop] = useState(false),
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
    const update = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      setProgress(max > 0 ? Math.min(100, (scrollY / max) * 100) : 0);
      setTop(scrollY > 350);
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
        if (path === "/search" && window.matchMedia("(max-width: 800px)").matches) router.push(searchReturnPath());
        else { rememberSearchOrigin(); router.push("/search"); }
      }
    };
    addEventListener("keydown", key);
    return () => {
      removeEventListener("scroll", update);
      removeEventListener("resize", update);
      removeEventListener("keydown", key);
      observer.disconnect();
    };
  }, [path, router]);
  return (
    <>
      <div
        className="scroll-progress"
        aria-hidden="true"
        style={{ transform: `scaleX(${progress / 100})` }}
      />
      <div className="floating-tools">
        {top && (
          <button
            className="secondary icon-button"
            aria-label="Back to top"
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
          aria-label="Contact Study Room"
          onClick={() => setContact(true)}
        >
          <MessageCircle size={19} />
          <span>Let’s talk</span>
        </button>
      </div>
      {contact && (
        <Dialog title="A little help?" onClose={() => setContact(false)}>
          <p>
            Find an answer in our help guide or report a problem to the project
            maintainer.
          </p>
          <div className="stack">
            <Link
              className="button secondary"
              href="/help"
              onClick={() => setContact(false)}
            >
              Browse help & FAQ
            </Link>
            <a
              className="button"
              href={trackedUrl(
                "https://github.com/wauul/study-room/issues/new",
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              Contact via GitHub <ArrowUpRight size={17} />
            </a>
            <small>
              GitHub issues are public. Please leave passwords and private study
              notes out of your report.
            </small>
          </div>
        </Dialog>
      )}
      {cookies && (
        <aside className="cookie-banner" aria-label="Cookie information">
          <div>
            <strong>A small note about cookies.</strong>
            <p>
              We use essential cookies to keep you signed in. Your theme
              preference stays on this device. No optional analytics cookies are
              used.
            </p>
            <Link href="/privacy">Privacy details</Link>
          </div>
          <button
            onClick={() => {
              try {
                localStorage.setItem("study-cookie-notice", "acknowledged");
              } catch {}
              setCookies(false);
            }}
          >
            Got it
          </button>
        </aside>
      )}
    </>
  );
}
