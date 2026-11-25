"use client";
import { useState } from "react";
import { motion } from "motion/react";
import { useMotionAllowed } from "@/lib/tier";
import { cn } from "@/lib/utils";

// أيقونات Fluent Emoji 3D (ترخيص MIT) مع حركة لطيفة عند المرور واللمس
export type Icon3DName =
  | "moon" | "star" | "glowing-star" | "sparkles" | "trophy" | "books" | "open-book" | "headphone" | "game" | "bulb"
  | "gift" | "fire" | "kaaba" | "mosque" | "calendar" | "chart" | "clipboard" | "memo" | "bell" | "students" | "mic"
  | "check" | "party" | "gem" | "rocket" | "beads" | "hourglass" | "cap" | "thinking" | "package" | "gear" | "key"
  | "speech" | "medal1" | "medal2" | "medal3" | "crown" | "wave" | "sun";

// بديل نصّي لو الصورة فشلت مرتين (نت ضعيف أو تحميل اتقطع على آيفون): إيموجي النظام بدل مربع «؟» المكسور
const FALLBACK: Record<Icon3DName, string> = {
  moon: "🌙", star: "⭐", "glowing-star": "🌟", sparkles: "✨", trophy: "🏆", books: "📚", "open-book": "📖", headphone: "🎧", game: "🎮", bulb: "💡",
  gift: "🎁", fire: "🔥", kaaba: "🕋", mosque: "🕌", calendar: "📅", chart: "📊", clipboard: "📋", memo: "📝", bell: "🔔", students: "🧑‍🎓", mic: "🎙️",
  check: "✅", party: "🎉", gem: "💎", rocket: "🚀", beads: "📿", hourglass: "⏳", cap: "🎓", thinking: "🤔", package: "📦", gear: "⚙️", key: "🔑",
  speech: "💬", medal1: "🥇", medal2: "🥈", medal3: "🥉", crown: "👑", wave: "👋", sun: "☀️",
};

export function Icon3D({ name, size = 48, className, float = false, delay = 0 }: { name: Icon3DName; size?: number; className?: string; float?: boolean; delay?: number }) {
  const animate = useMotionAllowed();
  // ٠ = الصورة العادية، ١ = إعادة المحاولة برابط جديد (يتخطى أي نسخة مخزّنة تالفة)، ٢ = الإيموجي البديل
  const [tries, setTries] = useState(0);
  const motionProps = {
    animate: animate && float ? { y: [0, -5, 0], rotate: [0, -3, 0] } : undefined,
    transition: animate && float ? { duration: 3.2, repeat: Infinity, ease: "easeInOut" as const, delay } : undefined,
    whileHover: animate ? { scale: 1.12, rotate: -8 } : undefined,
    whileTap: animate ? { scale: 0.9, rotate: 6 } : undefined,
  };
  if (tries >= 2) return (
    <motion.span aria-hidden="true" data-icon-fallback={name} className={cn("inline-grid select-none place-items-center leading-none", className)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.78) }} {...motionProps}>{FALLBACK[name] ?? "⭐"}</motion.span>
  );
  return (
    <motion.img
      key={tries}
      src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/3d/${name}.png${tries ? "?r=1" : ""}`}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      draggable={false}
      loading="lazy"
      decoding="async"
      onError={() => setTries((n) => n + 1)}
      className={cn("pointer-events-auto select-none drop-shadow-[0_8px_14px_rgba(0,0,0,0.25)]", className)}
      style={{ width: size, height: size }}
      {...motionProps}
    />
  );
}
