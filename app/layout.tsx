import "./globals.css";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import SiteTools from "@/components/SiteTools";
import Footer from "@/components/Footer";
import { Lora } from "next/font/google";
const lora = Lora({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-lora",
});
export const metadata: Metadata = {
  title: "Study Room — A little clearer, together",
  description:
    "A shared table for your notes, questions, and lightbulb moments. Study together with grounded answers and honest confidence.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={lora.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('study-theme');document.documentElement.dataset.theme=t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light'}catch(e){}`,
          }}
        />
      </head>
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        {children}
        <Footer />
        <SiteTools />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
