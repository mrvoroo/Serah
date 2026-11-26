"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { BookOpen, Clock, Home, LogOut, Sun } from "lucide-react";
import { session } from "@/lib/api";
import { disablePush } from "@/lib/push";
import { stopViewAs, viewAsInfo } from "@/lib/view-as";
import { useMotionAllowed } from "@/lib/tier";
import { useRequireRole } from "@/components/kid/kid-shell";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandMark } from "@/components/brand-logo";
import { HomeBack } from "@/components/home-back";
import { cn } from "@/lib/utils";

// غلاف صفحات ولي الأمر: شريط علوي وتنقل سفلي (الرئيسية، صلاتي، الأذكار، القرآن)
const NAV = [
  { href: "/parent/", label: "الرئيسية", icon: Home },
  { href: "/parent/prayer/", label: "صلاتي", icon: Clock },
  { href: "/parent/azkar/", label: "الأذكار", icon: Sun },
  { href: "/parent/quran/", label: "القرآن", icon: BookOpen },
];

export function ParentShell({ children }: { children: ReactNode }) {
  const user = useRequireRole(["parent"]);
  const path = usePathname();
  const router = useRouter();
  const animate = useMotionAllowed();
  // الخروج يوقف إشعارات الجهاز (حتى لا تصل لصاحب حساب آخر على نفس الجهاز)
  const logout = async () => {
    if (viewAsInfo()) return stopViewAs();
    await Promise.race([disablePush().catch(() => {}), new Promise((r) => setTimeout(r, 3000))]);
    session.clear(); router.replace("/parent/login/");
  };
  return (
    <div className="relative flex min-h-svh flex-col">
      <header className="sticky top-0 z-30 px-3 pt-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 rounded-3xl border bg-card/85 px-3 py-2 shadow-soft backdrop-blur-md">
          <Link href="/parent/" className="flex items-center gap-2" aria-label="المُنْتَهَى — الرئيسية"><BrandMark /></Link>
          <div className="flex items-center gap-2">
            <HomeBack />
            <ThemeToggle />
            <button type="button" onClick={logout} aria-label="خروج" className="grid size-11 place-items-center rounded-2xl bg-secondary text-secondary-foreground"><LogOut className="size-5" /></button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-6 pt-4">{user ? children : null}</main>
      {/* الشريط جزء من الصفحة (sticky) مش مثبّت على الشاشة (fixed): سفاري آيفون — خصوصًا التطبيق المثبّت على الشاشة الرئيسية —
          كان يزحزح العناصر الثابتة لنص الشاشة أثناء السكرول، ودلوقتي آخر الصفحة دايمًا يطلع فوقه */}
      <nav aria-label="التنقل الرئيسي" data-bottom-nav className="sticky bottom-0 z-40 mx-auto w-full max-w-md px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between rounded-[28px] border bg-card/90 p-2 shadow-soft backdrop-blur-md">
          {NAV.map((n) => {
            const on = n.href === "/parent/" ? path === "/parent" || path === "/parent/" : path.startsWith(n.href.replace(/\/$/, ""));
            const Icon = n.icon;
            return (
              <Link key={n.href} href={n.href} aria-current={on ? "page" : undefined} aria-label={n.label} className="relative flex h-12 flex-1 items-center justify-center gap-1.5 rounded-[20px] text-sm font-bold">
                {on && <motion.span layoutId="parent-nav" className="absolute inset-0 rounded-[20px] bg-hero" transition={animate ? { type: "spring", stiffness: 420, damping: 32 } : { duration: 0 }} />}
                <Icon className={cn("relative size-5", on ? "text-white" : "text-muted-foreground")} />
                <span className={cn("relative", on ? "text-white" : "sr-only")}>{n.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
