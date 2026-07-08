import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { PostHogProvider } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const title = "Lendy · Your cozy book lending library";
const description =
  "Keep track of every book you own, and never lose one to a friend again. Lendy is a cozy pixel-art library for tracking, lending, and borrowing your books.";

export const metadata: Metadata = {
  title,
  description,
  metadataBase: new URL("https://lendy.vercel.app"),
  applicationName: "Lendy",
  keywords: [
    "books",
    "lending",
    "library",
    "book tracker",
    "borrowing",
    "reading",
    "personal library",
  ],
  authors: [{ name: "Lendy" }],
  creator: "Lendy",
  openGraph: {
    title,
    description,
    url: "https://lendy.vercel.app",
    siteName: "Lendy",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    creator: "@lendy",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#fdf6e3",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} antialiased`}>
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
