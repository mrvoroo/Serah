"use client";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";

// زر تبديل الوضع: الهلال من lucide (هلال حقيقي) والشمس
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = !mounted || resolvedTheme !== "light";
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={dark ? "التحويل للوضع الفاتح" : "التحويل للوضع الغامق"}
      className={cn("relative grid size-11 place-items-center overflow-hidden rounded-2xl bg-secondary text-secondary-foreground transition-transform active:scale-95", className)}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={dark ? "moon" : "sun"}
          initial={{ y: 18, rotate: -60, opacity: 0 }}
          animate={{ y: 0, rotate: 0, opacity: 1 }}
          exit={{ y: -18, rotate: 60, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 22 }}
          className="grid place-items-center"
        >
          {dark ? <Moon className="size-5 fill-current" /> : <Sun className="size-5" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
