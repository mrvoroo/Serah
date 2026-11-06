"use client";
import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { session } from "@/lib/api";
import { cn } from "@/lib/utils";

// رئيسية كل مستخدم حسب دوره: الطفل /kid/، والمعلمة والأدمن /teacher/، والمطوّر /admin/، والزائر صفحة الدخول
export const homeOf = (role?: string) => (!role ? "/" : role === "student" ? "/kid/" : role === "superadmin" ? "/admin/" : "/teacher/");

const noop = () => () => {};
export function useHome() {
  // في البناء المسبق بلا مستخدم «/»، وفي المتصفح حسب المستخدم الحالي
  return useSyncExternalStore(noop, () => homeOf(session.user()?.role), () => "/");
}

// زر «الرئيسية» أعلى الشاشة: يرجع المستخدم لرئيسيته، ويختفي وهو عليها
export function HomeBack({ className }: { className?: string }) {
  const home = useHome();
  const path = usePathname();
  const bare = home.replace(/\/$/, "");
  if (path === home || path === bare || (home === "/" && path === "")) return null;
  return (
    <Link href={home} aria-label="رجوع للرئيسية"
      className={cn("flex h-11 shrink-0 items-center gap-1 rounded-2xl bg-secondary px-3 text-sm font-bold text-secondary-foreground transition hover:bg-secondary/80", className)}>
      <ArrowRight className="size-4" /> الرئيسية
    </Link>
  );
}
