import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lendy - Your Personal Book Lending Library",
  description: "Track the books you own, lend, and borrow with a beautiful, minimal interface.",
  metadataBase: new URL("https://lendy.vercel.app"),
  openGraph: {
    title: "Lendy - Your Personal Book Lending Library",
    description: "Track the books you own, lend, and borrow with a beautiful, minimal interface.",
    url: "https://lendy.vercel.app",
    siteName: "Lendy",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "Lendy - Book Lending Library",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lendy - Your Personal Book Lending Library",
    description: "Track the books you own, lend, and borrow with a beautiful, minimal interface.",
    images: ["/og-image.svg"],
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
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
