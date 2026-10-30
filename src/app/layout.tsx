import type { Metadata } from "next";
import { Creepster, Geist, Geist_Mono } from "next/font/google";
import { SpookyBackdrop } from "@/components/spooky";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display font for headings only; body text stays in Geist for readability.
const creepster = Creepster({
  variable: "--font-creepster",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Scream Team · iOMS Points",
  description: "Log iOMS requests as you work them and track team points.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${creepster.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SpookyBackdrop />
        <div className="relative z-10 flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
