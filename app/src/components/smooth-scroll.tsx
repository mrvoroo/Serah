"use client";
import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useTier } from "@/lib/tier";

gsap.registerPlugin(ScrollTrigger);

// سكرول ناعم (Lenis) مربوط بساعة GSAP حتى تبقى ScrollTrigger متزامنة بدون تقطيع
export function SmoothScroll({ children }: { children: ReactNode }) {
  const tier = useTier();
  useEffect(() => {
    if (tier === "static" || tier === "low") return;
    // naiveDimensions: نقرأ طول الصفحة الحقيقي كل مرة. <html> طوله ثابت (h-full) فـLenis لا يلاحظ
    // طول الصفحة الجديدة بعد التنقل (الرحلة مثلًا)، فتتوقف العجلة أو ترجع لأول الصفحة
    const lenis = new Lenis({ duration: 1.1, smoothWheel: true, touchMultiplier: 1.2, naiveDimensions: true });
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (t: number) => lenis.raf(t * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    (window as unknown as { __lenis?: Lenis }).__lenis = lenis;
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      delete (window as unknown as { __lenis?: Lenis }).__lenis;
    };
  }, [tier]);
  return <>{children}</>;
}
