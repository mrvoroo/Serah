"use client";
import { motion } from "motion/react";
import { Icon3D, type Icon3DName } from "@/components/icon3d";
import { useMotionAllowed } from "@/lib/tier";
import { cn } from "@/lib/utils";

// أشكال الأطفال: أيقونات ثلاثية الأبعاد (تُخزَّن كـ 3d:اسم). القديمة (إيموجي مثل 🦁) تظهر كما هي
// لكن بنفس حركة الأيقونات: ظل، وتطفو، وتكبر عند مرور الماوس وتصغر عند الضغط
export const AVATARS: Icon3DName[] = ["star", "moon", "rocket", "gem", "crown", "sun", "sparkles", "bulb", "gift", "cap", "books", "trophy"];

export function KidAvatar({ value, size = 48, className, float = false, delay = 0 }: { value?: string; size?: number; className?: string; float?: boolean; delay?: number }) {
  const animate = useMotionAllowed();
  if (value?.startsWith("3d:")) return <Icon3D name={value.slice(3) as Icon3DName} size={size} className={className} float={float} delay={delay} />;
  return (
    <motion.span aria-hidden="true" data-avatar-emoji=""
      className={cn("pointer-events-auto grid shrink-0 select-none place-items-center leading-none drop-shadow-[0_8px_14px_rgba(0,0,0,0.25)]", className)}
      style={{ width: size, height: size, fontSize: size * 0.78 }}
      animate={animate && float ? { y: [0, -5, 0], rotate: [0, -3, 0] } : undefined}
      transition={animate && float ? { duration: 3.2, repeat: Infinity, ease: "easeInOut", delay } : undefined}
      whileHover={animate ? { scale: 1.12, rotate: -8 } : undefined}
      whileTap={animate ? { scale: 0.9, rotate: 6 } : undefined}>
      {value || "⭐"}
    </motion.span>
  );
}
