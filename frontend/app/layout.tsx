import type { Metadata } from "next";
import "@fontsource-variable/cormorant-garamond";
import "@fontsource-variable/manrope";
import "@daypicker/react/style.css";
import "@photo-sphere-viewer/core/index.css";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { Providers } from "@/components/layout/providers";
import { OnboardingBoundary } from "@/components/onboarding/onboarding-boundary";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000"),
  title: {
    default: "KEYRAK — Remarkable stays in Marrakesh",
    template: "%s | KEYRAK",
  },
  description:
    "Discover villas, riads, and apartments in Marrakesh through natural-language search and immersive property stories.",
  icons: {
    icon: { url: "/keyrak-tab-icon.ico?v=20260902-2", type: "image/x-icon" },
    shortcut: "/keyrak-tab-icon.ico?v=20260902-2",
    apple: "/keyrak-favicon.png?v=20260902-2",
  },
  openGraph: {
    type: "website",
    siteName: "KEYRAK",
    title: "KEYRAK — Marrakesh, in your own words.",
    description:
      "Discover villas, riads, and apartments in Marrakesh through natural-language search.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "KEYRAK — Marrakesh, in your own words." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "KEYRAK — Marrakesh, in your own words.",
    description: "Thoughtful stays and a simpler way to search Marrakesh.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased" data-scroll-behavior="smooth">
      <body className="flex min-h-full flex-col">
        <Providers>
          <OnboardingBoundary>
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </OnboardingBoundary>
        </Providers>
      </body>
    </html>
  );
}
