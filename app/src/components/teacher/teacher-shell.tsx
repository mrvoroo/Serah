"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { LayoutDashboard, Users, Headphones, Upload, MessageSquareHeart, Settings, LogOut, Menu, ShieldCheck, UserCog, ScrollText, Map } from "lucide-react";
import { session, type Role } from "@/lib/api";
import { ROLE_LABEL, stopViewAs, viewAsInfo } from "@/lib/view-as";
import { useRequireRole } from "@/components/kid/kid-shell";
import { ThemeToggle } from "@/components/theme-toggle";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const RANK: Record<Role, number> = { student: 0, teacher: 1, admin: 2, superadmin: 3 };

// كل عنصر يظهر لمن رتبته >= min (المطوّر يرى كل شيء)
export const TEACHER_NAV: { href: string; label: string; icon: typeof Users; min?: Role }[] = [
  { href: "/admin/", label: "لوحة المطوّر", icon: ShieldCheck, min: "superadmin" },
  { href: "/admin/users/", label: "المستخدمون", icon: UserCog, min: "superadmin" },
  { href: "/teacher/", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/teacher/students/", label: "الطلاب", icon: Users },
  { href: "/teacher/lectures/", label: "المحاضرات", icon: Headphones },
  { href: "/teacher/upload/", label: "رفع تسجيل", icon: Upload },
  { href: "/teacher/suggestions/", label: "الاقتراحات", icon: MessageSquareHeart },
  { href: "/teacher/journey/", label: "رحلة الأنبياء", icon: Map, min: "admin" },
  { href: "/teacher/audit/", label: "سجل العمليات", icon: ScrollText, min: "admin" },
  { href: "/teacher/settings/", label: "الإعدادات", icon: Settings },
];

function Brand({ role }: { role?: Role }) {
  return (
    <Link href={role === "superadmin" ? "/admin/" : "/teacher/"} className="flex items-center gap-2 font-heading text-lg font-extrabold">
      <span className="grid size-10 place-items-center rounded-2xl bg-hero text-white">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
      </span>
      رحلة مع الأنبياء
    </Link>
  );
}

function NavList({ onNavigate, id, role }: { onNavigate?: () => void; id: string; role?: Role }) {
  const path = usePathname();
  const rank = role ? RANK[role] : 0;
  return (
    <nav aria-label="قائمة المعلمة" className="flex flex-col gap-1">
      {TEACHER_NAV.filter((n) => !n.min || rank >= RANK[n.min]).map((n) => {
        const exact = n.href === "/teacher/" || n.href === "/admin/";
        const bare = n.href.replace(/\/$/, "");
        const on = exact ? path === bare || path === n.href : path.startsWith(bare);
        const Icon = n.icon;
        return (
          <Link key={n.href} href={n.href} onClick={onNavigate} aria-current={on ? "page" : undefined}
            className={cn("relative flex h-12 items-center gap-3 rounded-2xl px-4 font-bold transition-colors", on ? "text-white" : "text-muted-foreground hover:bg-secondary hover:text-foreground")}>
            {on && <motion.span layoutId={`t-nav-${id}`} className="absolute inset-0 rounded-2xl bg-hero" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
            <Icon className="relative size-5" /><span className="relative">{n.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function TeacherShell({ children, roles = ["teacher", "admin", "superadmin"] }: { children: ReactNode; roles?: Role[] }) {
  const user = useRequireRole(roles);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const role = user?.role;
  const logout = () => { if (viewAsInfo()) return stopViewAs(); session.clear(); router.replace("/teacher/login/"); };

  return (
    <div className="min-h-svh lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 hidden h-svh flex-col gap-6 border-e bg-card/60 p-4 backdrop-blur lg:flex">
        <Brand role={role} />
        <NavList id="side" role={role} />
        <div className="mt-auto flex items-center justify-between rounded-2xl bg-secondary/60 p-3">
          <div className="min-w-0"><p className="truncate font-bold">{user?.name}</p><p className="text-xs text-muted-foreground">{role ? ROLE_LABEL[role] : ""}</p></div>
          <button type="button" onClick={logout} aria-label="خروج" className="grid size-10 place-items-center rounded-xl hover:bg-secondary"><LogOut className="size-5" /></button>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b bg-background/80 px-4 py-3 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger render={<button type="button" aria-label="فتح القائمة" className="grid size-11 place-items-center rounded-2xl bg-secondary lg:hidden"><Menu className="size-5" /></button>} />
              <SheetContent side="right" className="w-72 gap-6 p-4">
                <SheetHeader className="p-0"><SheetTitle className="sr-only">القائمة</SheetTitle><Brand role={role} /></SheetHeader>
                <NavList id="sheet" role={role} onNavigate={() => setOpen(false)} />
                <button type="button" onClick={logout} className="mt-auto flex h-12 items-center gap-3 rounded-2xl px-4 font-bold text-destructive hover:bg-destructive/10"><LogOut className="size-5" /> خروج</button>
              </SheetContent>
            </Sheet>
            <div className="lg:hidden"><Brand role={role} /></div>
            <p className="hidden font-heading text-lg font-extrabold lg:block">أهلًا {user?.name}</p>
          </div>
          <ThemeToggle />
        </header>
        <main className="mx-auto max-w-6xl p-4 lg:p-6">{user ? children : null}</main>
      </div>
    </div>
  );
}
