import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NavBar } from "@/components/nav-bar";
import { LoadingScreen } from "@/components/ui/loading-screen";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HireReady AI — AI-Powered Mock Interview Coach",
  description: "Practice Smarter. Interview Better. Get personalized HR interview questions, real-time AI evaluation, adaptive follow-ups, and detailed performance reports powered by Generative AI.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body id="app-body" className="min-h-full flex flex-col">
        <LoadingScreen />
        <NavBar />
        <main id="app-main" className="flex-1">{children}</main>
        <footer id="app-footer" className="border-t border-white/10 bg-black py-4 text-center text-xs text-gray-500">
          HireReady AI — Practice Smarter. Interview Better.
        </footer>
      </body>
    </html>
  );
}
