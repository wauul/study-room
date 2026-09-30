"use client";
import { createContext, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Locale, localeCookie, translator } from "@/lib/i18n";

const LanguageContext = createContext({
  locale: "en" as Locale,
  t: translator("en"),
  setLocale: (_locale: Locale) => {},
});
export function LanguageProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const [locale, updateLocale] = useState(initialLocale);
  const router = useRouter();
  const value = useMemo(
    () => ({
      locale,
      t: translator(locale),
      setLocale(next: Locale) {
        document.cookie = `${localeCookie}=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
        document.documentElement.lang = next;
        updateLocale(next);
        router.refresh();
      },
    }),
    [locale, router],
  );
  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
export const useLanguage = () => useContext(LanguageContext);
