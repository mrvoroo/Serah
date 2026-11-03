"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// مستوى الجهاز: يحدد كمية الحركة والمؤثرات
export type Tier = "high" | "mid" | "low" | "static";

export function detectTier(): Tier {
  if (typeof window === "undefined") return "mid";
  const q = new URLSearchParams(window.location.search).get("tier");
  if (q === "high" || q === "mid" || q === "low" || q === "static") return q;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "static";
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean; effectiveType?: string } };
  const mem = nav.deviceMemory ?? 4;
  const cores = nav.hardwareConcurrency ?? 4;
  const conn = nav.connection ?? {};
  if (conn.saveData || /(^|-)2g$/.test(conn.effectiveType ?? "") || mem <= 2 || cores <= 2) return "low";
  if (window.matchMedia("(max-width: 760px)").matches || mem <= 4 || cores <= 4) return "mid";
  return "high";
}

const TierContext = createContext<{ tier: Tier; setTier: (t: Tier) => void }>({ tier: "mid", setTier: () => {} });

export function TierProvider({ children }: { children: ReactNode }) {
  const [tier, setTier] = useState<Tier>("mid");
  useEffect(() => {
    const t = detectTier();
    setTier(t);
    document.documentElement.dataset.tier = t;
    // قياس سريع للإطارات: لو الجهاز يتعب نخفف تلقائيًا
    if (t === "static" || t === "low") return;
    let frames = 0, raf = 0;
    const start = performance.now();
    const tick = () => {
      frames++;
      if (performance.now() - start < 1500) raf = requestAnimationFrame(tick);
      else {
        const fps = frames / 1.5;
        if (fps < 40) { const down: Tier = t === "high" ? "mid" : "low"; setTier(down); document.documentElement.dataset.tier = down; }
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <TierContext.Provider value={{ tier, setTier }}>{children}</TierContext.Provider>;
}

export const useTier = () => useContext(TierContext).tier;
export const useMotionAllowed = () => { const t = useTier(); return t === "high" || t === "mid"; };
