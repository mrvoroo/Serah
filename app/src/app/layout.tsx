import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/providers";

const cairo = localFont({ src: "../fonts/cairo.woff2", variable: "--font-cairo", weight: "200 1000", display: "swap" });
const baloo = localFont({ src: "../fonts/baloo.woff2", variable: "--font-baloo", weight: "400 800", display: "swap" });
// خط الرقعة لأسماء الأنبياء في مجسم الرحلة (Aref Ruqaa، رخصة OFL)
const ruqaa = localFont({ src: "../fonts/ruqaa.woff2", variable: "--font-ruqaa", weight: "700", display: "swap", preload: false });

export const metadata: Metadata = {
  title: "المُنْتَهَى | Muntaha",
  description: "المُنْتَهَى — منصة رحلة مع الأنبياء والقرآن الكريم للأطفال",
  applicationName: "Muntaha",
  appleWebApp: { capable: true, title: "Muntaha", statusBarStyle: "black-translucent" },
  manifest: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/manifest.webmanifest`,
  icons: {
    icon: [{ url: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/brand/favicon-32.png`, sizes: "32x32", type: "image/png" }, { url: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/brand/icon-192.png`, sizes: "192x192", type: "image/png" }],
    apple: [{ url: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/brand/apple-touch-icon.png`, sizes: "180x180" }],
  },
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
    <html lang="ar" dir="rtl" suppressHydrationWarning className={`${cairo.variable} ${baloo.variable} ${ruqaa.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
