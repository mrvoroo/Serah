"use client";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Particles } from "@/components/ui/particles";
import { useTier } from "@/lib/tier";

// غبار نجوم خفيف خلف شاشات الأطفال، يتغير لونه مع الثيم ويتوقف على الأجهزة الضعيفة
export function Ambient() {
  const tier = useTier();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || tier === "static" || tier === "low") return null;
  const dark = resolvedTheme !== "light";
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
      <div className="absolute inset-0 bg-[radial-gradient(60%_45%_at_80%_0%,var(--glow),transparent_70%),radial-gradient(50%_40%_at_10%_90%,var(--glow),transparent_70%)]" />
      <Particles className="absolute inset-0" quantity={tier === "high" ? 70 : 40} staticity={40} ease={60} size={dark ? 0.6 : 0.8} color={dark ? "#FFE7B0" : "#7B5CFF"} refresh={false} key={dark ? "d" : "l"} />
    </div>
  );
}
