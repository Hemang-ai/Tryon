import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  metadataBase: new URL("https://mirra.style"),
  title: "MIRRA — See it on you",
  description: "A private, category-aware virtual fitting room for clothes, eyewear, jewelry, hats, watches, bags, and shoes.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "MIRRA — See it on you",
    description: "Upload your photo, select a wearable, and preview your look with confidence.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "MIRRA virtual try-on studio" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "MIRRA — See it on you",
    description: "A private, adaptive virtual fitting room for every wearable category.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
