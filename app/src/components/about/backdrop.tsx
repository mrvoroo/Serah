"use client";
import { motion } from "motion/react";
import { Icon3D, type Icon3DName } from "@/components/icon3d";
import { useMotionAllowed } from "@/lib/tier";

// خلفية صفحات «من نحن»: شفق ملوّن متحرك وأيقونات ثلاثية الأبعاد تطفو
const FLOATERS: { name: Icon3DName; x: string; y: string; size: number; d: number }[] = [
  { name: "rocket", x: "6%", y: "12%", size: 64, d: 0 }, { name: "open-book", x: "84%", y: "9%", size: 70, d: 0.6 },
  { name: "moon", x: "90%", y: "46%", size: 56, d: 1.2 }, { name: "gem", x: "4%", y: "52%", size: 52, d: 0.9 },
  { name: "sparkles", x: "78%", y: "78%", size: 58, d: 0.3 }, { name: "bulb", x: "10%", y: "84%", size: 60, d: 1.5 },
  { name: "star", x: "50%", y: "4%", size: 44, d: 1.8 },
];
export function AboutBackdrop() {
  const animate = useMotionAllowed();
  return (<>
      {/* شفق متحرك */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {[["#7B5CFF", "-10%", "-10%"], ["#FFB020", "60%", "10%"], ["#1FA37F", "10%", "60%"], ["#FF6FB5", "70%", "70%"]].map(([c, l, t], i) => (
          <motion.div key={i} className="absolute size-[55vmax] rounded-full opacity-40 blur-[90px]" style={{ background: c, left: l, top: t }}
            animate={animate ? { x: [0, 60, -40, 0], y: [0, -50, 30, 0], scale: [1, 1.15, 0.95, 1] } : undefined}
            transition={{ duration: 18 + i * 4, repeat: Infinity, ease: "easeInOut" }} />
        ))}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#0B0620_75%)]" />
      </div>
      {/* أيقونات ثلاثية الأبعاد تطفو */}
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden sm:block">
        {FLOATERS.map((f) => (
          <motion.div key={f.name} className="absolute" style={{ left: f.x, top: f.y }}
            animate={animate ? { y: [0, -18, 0], rotate: [0, 8, -6, 0] } : undefined} transition={{ duration: 6 + f.d * 2, repeat: Infinity, ease: "easeInOut", delay: f.d }}>
            <Icon3D name={f.name} size={f.size} />
          </motion.div>
        ))}
      </div>

  </>);
}
