import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { Header } from "@/components/header";
import { getCurrentUser } from "@/lib/current-user";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });

export const metadata: Metadata = {
  title: { default: "Protalone", template: "%s · Protalone" },
  description: "A catalog of popular websites and a private list of the sites you actually open.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <html lang="en" className={`${outfit.variable} ${fraunces.variable}`}>
      <body className="min-h-screen font-sans antialiased">
        <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-30 focus:rounded-lg focus:bg-card focus:px-3 focus:py-2">
          Skip to content
        </a>
        <Header email={user?.email ?? null} />
        <main id="content" className="mx-auto w-full max-w-6xl px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
