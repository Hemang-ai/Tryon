import type { Metadata } from "next";
import "./globals.css";

const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "https://tryon-hemangs-projects-e0d7efbf.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(productionUrl),
  title: "Try-it-on — Your personal fitting room",
  description: "A private, category-aware virtual fitting room for clothes, eyewear, jewelry, hats, watches, bags, and shoes.",
  openGraph: {
    title: "Try-it-on — Your personal fitting room",
    description: "Upload your photo, select a wearable, and preview your look with confidence.",
    type: "website",
    images: [{ url: "/try-it-on-og.png", width: 1200, height: 630, alt: "Try-it-on virtual fitting room" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Try-it-on — Your personal fitting room",
    description: "A private, adaptive virtual fitting room for every wearable category.",
    images: ["/try-it-on-og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
