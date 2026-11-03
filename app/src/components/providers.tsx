"use client";
import { ThemeProvider } from "next-themes";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TierProvider } from "@/lib/tier";
import { SmoothScroll } from "@/components/smooth-scroll";

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
      navigator.serviceWorker.register(`${base}/sw.js`, { scope: `${base}/` }).catch(() => {});
    }
  }, []);
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange storageKey="serah-theme">
      <TierProvider>
        <SmoothScroll>{children}</SmoothScroll>
        <Toaster position="top-center" dir="rtl" richColors />
      </TierProvider>
    </ThemeProvider>
  );
}
