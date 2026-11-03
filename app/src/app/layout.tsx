import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/providers";

const cairo = localFont({ src: "../fonts/cairo.woff2", variable: "--font-cairo", weight: "200 1000", display: "swap" });
const baloo = localFont({ src: "../fonts/baloo.woff2", variable: "--font-baloo", weight: "400 800", display: "swap" });

export const metadata: Metadata = {
  title: "رحلة مع الأنبياء",
  description: "منصة محاضرات سيرة الأنبياء وأسماء الله الحسنى للأطفال",
  manifest: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/manifest.webmanifest`,
  icons: { icon: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/icon.svg` },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#120A30" },
    { media: "(prefers-color-scheme: light)", color: "#7B5CFF" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning className={`${cairo.variable} ${baloo.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
