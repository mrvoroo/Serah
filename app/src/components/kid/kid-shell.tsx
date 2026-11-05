"use client";
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Home, Headphones, Map, Trophy, LogOut, BookOpen, LayoutDashboard } from "lucide-react";
import { session, type User } from "@/lib/api";
import { stopViewAs, viewAsInfo } from "@/lib/view-as";
import { useMotionAllowed } from "@/lib/tier";
import { ThemeToggle } from "@/components/theme-toggle";
import ClickSpark from "@/components/ClickSpark";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/brand-logo";

const NAV = [
  { href: "/kid/", label: "الرئيسية", icon: Home },
  { href: "/kid/journey/", label: "الرحلة", icon: Map },
  { href: "/kid/lectures/", label: "المحاضرات", icon: Headphones },
  { href: "/kid/stars/", label: "النجوم", icon: Trophy },
];
// المعلمات والأدمن والمطوّر يفتحن الرحلة وصفحات الأنبياء والقرآن كما يراها الطفل، مع زر رجوع للوحة بدل تنقل الطفل
const STAFF_PATHS = /^\/kid\/(journey|prophet|quran|swords)(\/|$)/;
const STAFF_NAV = [
  { href: "/kid/journey/", label: "الرحلة", icon: Map },
  { href: "/kid/quran/", label: "القرآن", icon: BookOpen },
];

export const homeOf = (role: string) => (role === "student" ? "/kid/" : role === "superadmin" ? "/admin/" : "/teacher/");

export function useRequireRole(roles: string[]) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    const u = session.user();
    if (!u || !session.token()) { router.replace(roles.includes("student") ? "/" : "/teacher/login/"); return; }
    // داخل بحساب آخر: نرجعه لصفحته بدل صفحة الدخول
    if (!roles.includes(u.role)) { router.replace(homeOf(u.role)); return; }
    setUser(u);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return user;
}

export function KidShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const user = useRequireRole(STAFF_PATHS.test(path) ? ["student", "teacher", "admin", "superadmin"] : ["student"]);
  const staff = !!user && user.role !== "student";
  const nav = staff ? [...STAFF_NAV, { href: homeOf(user.role), label: "لوحتي", icon: LayoutDashboard }] : NAV;
  const router = useRouter();
  const animate = useMotionAllowed();
  const logout = () => { if (viewAsInfo()) return stopViewAs(); session.clear(); router.replace(staff ? "/teacher/login/" : "/"); };
  // التخطيط يبقى مركّبًا بين صفحات /kid، وفحص الدور يجري مرة واحدة: لو خرجت المعلمة من الرحلة/النبي/القرآن
  // (مثل رابط محاضرة في صفحة النبي) لصفحات الطفل فقط نرجعها للوحتها ولا نعرض الصفحة (حتى لا تُسجَّل لها حضور ونقاط)
  const staffBlocked = staff && !STAFF_PATHS.test(path);
  useEffect(() => { if (staffBlocked && user) router.replace(homeOf(user.role)); }, [staffBlocked, user, router]);

  const content = (
    <div className="relative min-h-svh pb-28">
      <header className="sticky top-0 z-30 px-3 pt-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 rounded-3xl border bg-card/85 px-3 py-2 shadow-soft backdrop-blur-md">
          <Link href={staff ? "/kid/journey/" : "/kid/"} className="flex items-center gap-2" aria-label="المُنْتَهَى — الرئيسية">
            <BrandMark />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button type="button" onClick={logout} aria-label="خروج" className="grid size-11 place-items-center rounded-2xl bg-secondary text-secondary-foreground"><LogOut className="size-5" /></button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 pt-4">{user && !staffBlocked ? children : null}</main>
      <nav aria-label="التنقل الرئيسي" className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-md pb-safe">
        <div className="flex items-center justify-between rounded-[28px] border bg-card/90 p-2 shadow-soft backdrop-blur-md">
          {nav.map((n) => {
            const on = n.href === "/kid/" ? path === "/kid" || path === "/kid/" : path.startsWith(n.href.replace(/\/$/, ""));
            const Icon = n.icon;
            return (
              <Link key={n.href} href={n.href} aria-current={on ? "page" : undefined} aria-label={n.label} className="relative flex h-12 flex-1 items-center justify-center gap-1.5 rounded-[20px] text-sm font-bold">
                {on && <motion.span layoutId="kid-nav" className="absolute inset-0 rounded-[20px] bg-hero" transition={animate ? { type: "spring", stiffness: 420, damping: 32 } : { duration: 0 }} />}
                <Icon className={cn("relative size-5", on ? "text-white" : "text-muted-foreground")} />
                <span className={cn("relative", on ? "text-white" : "sr-only")}>{n.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );

  // الغلاف ثابت دائمًا (والشرارات تتعطل فقط): لو تبدّل بين غلاف وبدونه عند تخفيف الأداء تُبنى الصفحة من جديد وتضيع حالتها (مثل الاختبار)
  return <ClickSpark disabled={!animate} sparkColor={["#FFC24D", "#9C8BFF", "#3FD08F"]} sparkCount={8} sparkRadius={22} shape="star" duration={500}>{content}</ClickSpark>;
}
