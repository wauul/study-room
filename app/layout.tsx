import "./globals.css";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import SiteTools from "@/components/SiteTools";
import Footer from "@/components/Footer";
import { IBM_Plex_Sans } from "next/font/google";
import { LanguageProvider } from "@/components/LanguageProvider";
import { getLocale } from "@/lib/locale";
import { translator } from "@/lib/i18n";
import * as Sentry from "@sentry/nextjs";
const studySans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-study-sans",
});
export async function generateMetadata(): Promise<Metadata> {
  const t = translator(await getLocale());
  return {
    title: t("Study Room | Learn from your notes, together"),
    description: t(
      "Study together with answers cited from your course notes, confidence quizzes, and a clear plan for what to revise next.",
    ),
    other: { ...Sentry.getTraceData() },
  };
}
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const t = translator(locale);
  return (
    <html lang={locale} className={studySans.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('study-theme');document.documentElement.dataset.theme=t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light'}catch(e){}`,
          }}
        />
      </head>
      <body>
        <LanguageProvider initialLocale={locale}>
          <a className="skip-link" href="#main-content">
            {t("Skip to content")}
          </a>
          {children}
          <Footer />
          <SiteTools />
        </LanguageProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
