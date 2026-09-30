"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Languages } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

const languages = [
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
] as const;

export default function LanguageMenu() {
  const { t, locale, setLocale } = useLanguage();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const control = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();
  const selectedIndex = languages.findIndex(
    (language) => language.value === locale,
  );

  useEffect(() => {
    if (!open) return;
    items.current[activeIndex]?.focus();
  }, [open, activeIndex]);

  useEffect(() => {
    if (!open) return;
    function dismissOutside(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !control.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", dismissOutside);
    return () => document.removeEventListener("pointerdown", dismissOutside);
  }, [open]);

  function show(index = selectedIndex) {
    setActiveIndex(index);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    trigger.current?.focus();
  }

  return (
    <div
      className="language-control"
      ref={control}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        type="button"
        className="secondary language-trigger"
        ref={trigger}
        id={`${id}-trigger`}
        aria-label={`${t("Language")}: ${languages[selectedIndex].label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? `${id}-menu` : undefined}
        onClick={() => (open ? close() : show())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            show(event.key === "ArrowDown" ? 0 : languages.length - 1);
          }
        }}
      >
        <Languages className="language-icon" size={16} aria-hidden="true" />
        <span lang={locale}>{languages[selectedIndex].label}</span>
        <ChevronDown className="language-chevron" size={14} aria-hidden="true" />
      </button>
      {open ? (
        <div
          className="language-menu"
          id={`${id}-menu`}
          role="menu"
          aria-labelledby={`${id}-trigger`}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              close();
              return;
            } else if (event.key === "Tab") {
              // Let the browser move focus before removing the focused menu item.
              requestAnimationFrame(() => setOpen(false));
              return;
            }
            let index: number;
            switch (event.key) {
              case "ArrowDown":
                index = (activeIndex + 1) % languages.length;
                break;
              case "ArrowUp":
                index = (activeIndex + languages.length - 1) % languages.length;
                break;
              case "Home":
                index = 0;
                break;
              case "End":
                index = languages.length - 1;
                break;
              default:
                if (event.altKey || event.ctrlKey || event.metaKey) return;
                index = event.key.length === 1
                  ? languages.findIndex((language) =>
                      language.label.toLowerCase().startsWith(event.key.toLowerCase()),
                    )
                  : -1;
            }
            if (index !== -1) {
              event.preventDefault();
              setActiveIndex(index);
            }
          }}
        >
          {languages.map((language, index) => (
            <button
              key={language.value}
              type="button"
              className="language-option"
              role="menuitemradio"
              aria-checked={locale === language.value}
              lang={language.value}
              tabIndex={activeIndex === index ? 0 : -1}
              ref={(element) => {
                items.current[index] = element;
              }}
              onFocus={() => setActiveIndex(index)}
              onClick={() => {
                close();
                if (locale !== language.value) setLocale(language.value);
              }}
            >
              <span>{language.label}</span>
              {locale === language.value ? (
                <Check size={16} aria-hidden="true" />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
