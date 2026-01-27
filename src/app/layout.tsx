import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lendy - Your Personal Book Lending Library",
  description: "Track the books you own, lend, and borrow with a cute pixel-art interface. Your cozy book lending library.",
  metadataBase: new URL("https://lendy.vercel.app"),
  keywords: ["books", "lending", "library", "book tracker", "borrowing", "reading"],
  authors: [{ name: "Lendy" }],
  creator: "Lendy",
  openGraph: {
    title: "Lendy - Your Personal Book Lending Library",
    description: "Track the books you own, lend, and borrow with a cute pixel-art interface. Your cozy book lending library.",
    url: "https://lendy.vercel.app",
    siteName: "Lendy",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lendy - Your Personal Book Lending Library",
    description: "Track the books you own, lend, and borrow with a cute pixel-art interface. Your cozy book lending library.",
    creator: "@lendy",
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
