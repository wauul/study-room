import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Study Room — A little clearer, together",
  description:
    "A shared table for your notes, questions, and lightbulb moments. Study together with grounded answers and honest confidence.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
