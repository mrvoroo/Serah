"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { LayoutDashboard, Users, Headphones, Upload, MessageSquareHeart, Settings, LogOut, Menu, ShieldCheck, UserCog, ScrollText, Map, Sparkles, ClipboardCheck, NotebookPen, Info, Radio, Clock, BookHeart, School, BookOpen } from "lucide-react";
import { session, type Role } from "@/lib/api";
import { ROLE_LABEL, stopViewAs, viewAsInfo } from "@/lib/view-as";
import { useRequireRole } from "@/components/kid/kid-shell";
import { ThemeToggle } from "@/components/theme-toggle";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn, teacherTitle } from "@/lib/utils";
import { EncouragementCloud } from "@/components/teacher/encouragement-cloud";
import { BrandMark } from "@/components/brand-logo";
import { HomeBack } from "@/components/home-back";
import { useLiveReady } from "@/components/live/live-banner";

const RANK: Record<Role, number> = { student: 0, teacher: 1, admin: 2, superadmin: 3 };

// كل عنصر يظهر لمن رتبته >= min (المطوّر يرى كل شيء)
export const TEACHER_NAV: { href: string; label: string; icon: typeof Users; min?: Role }[] = [
  { href: "/admin/", label: "لوحة المطوّر", icon: ShieldCheck, min: "superadmin" },
  { href: "/admin/users/", label: "المستخدمون", icon: UserCog, min: "superadmin" },
  { href: "/teacher/", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/teacher/students/", label: "الطلاب", icon: Users },
  { href: "/teacher/classes/", label: "الفصول", icon: School, min: "admin" },
  { href: "/teacher/team/", label: "المعلمات", icon: UserCog, min: "admin" },
  { href: "/teacher/live/", label: "المحاضرة المباشرة", icon: Radio },
  { href: "/teacher/quran/", label: "القرآن الكريم", icon: BookOpen },
  { href: "/teacher/prayer/", label: "جدول الصلوات", icon: Clock },
  { href: "/teacher/prayer-content/", label: "محتوى الصلاة", icon: BookHeart, min: "admin" },
  { href: "/teacher/lectures/", label: "المحاضرات", icon: Headphones },
  { href: "/teacher/upload/", label: "رفع تسجيل", icon: Upload },
  { href: "/teacher/quizzes/", label: "الاختبارات", icon: ClipboardCheck },
  { href: "/teacher/homework/", label: "الواجبات", icon: NotebookPen },
  { href: "/teacher/suggestions/", label: "الاقتراحات", icon: MessageSquareHeart },
  { href: "/kid/journey/", label: "رحلة الأنبياء", icon: Sparkles },
  { href: "/teacher/journey/", label: "إدارة الرحلة", icon: Map, min: "admin" },
  { href: "/teacher/audit/", label: "سجل العمليات", icon: ScrollText, min: "admin" },
  { href: "/teacher/settings/", label: "الإعدادات", icon: Settings },
  { href: "/about/", label: "من نحن", icon: Info },
];

function Brand({ role }: { role?: Role }) {
  return (
    <Link href={role === "superadmin" ? "/admin/" : "/teacher/"} className="flex items-center gap-2" aria-label="المُنْتَهَى — الرئيسية">
      <BrandMark />
    </Link>
  );
}

function NavList({ onNavigate, id, role }: { onNavigate?: () => void; id: string; role?: Role }) {
  const path = usePathname();
  const rank = role ? RANK[role] : 0;
  const live = useLiveReady();
  return (
    <nav aria-label="قائمة المعلمة" className="flex flex-col gap-1">
      {TEACHER_NAV.filter((n) => (!n.min || rank >= RANK[n.min]) && (live || n.href !== "/teacher/live/")).map((n) => {
        const exact = n.href === "/teacher/" || n.href === "/admin/";
        const bare = n.href.replace(/\/$/, "");
        const on = exact ? path === bare || path === n.href : path === bare || path.startsWith(n.href); // حتى لا يُضاء «جدول الصلوات» داخل «محتوى الصلاة»
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
      <aside className="sticky top-0 hidden h-svh flex-col gap-4 overflow-hidden border-e bg-card/60 p-4 backdrop-blur lg:flex">
        <Brand role={role} />
        {/* القائمة تسكرول وحدها (الشعار فوق وبطاقة الحساب تحت ثابتين) حتى لو زادت العناصر */}
        <div data-testid="side-nav-scroll" className="-mx-2 min-h-0 flex-1 overflow-y-auto overscroll-contain px-2"><NavList id="side" role={role} /></div>
        <div className="flex shrink-0 items-center justify-between rounded-2xl bg-secondary/60 p-3">
          <div className="min-w-0"><p className="truncate font-bold">{teacherTitle(user?.name, user?.role)}</p><p className="text-xs text-muted-foreground">{role ? ROLE_LABEL[role] : ""}</p></div>
          <button type="button" onClick={logout} aria-label="خروج" className="grid size-10 place-items-center rounded-xl hover:bg-secondary"><LogOut className="size-5" /></button>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b bg-background/80 px-4 py-3 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger render={<button type="button" aria-label="فتح القائمة" className="grid size-11 place-items-center rounded-2xl bg-secondary lg:hidden"><Menu className="size-5" /></button>} />
              <SheetContent side="right" className="w-72 gap-4 overflow-hidden p-4">
                <SheetHeader className="p-0"><SheetTitle className="sr-only">القائمة</SheetTitle><Brand role={role} /></SheetHeader>
                <div className="-mx-2 min-h-0 flex-1 overflow-y-auto overscroll-contain px-2"><NavList id="sheet" role={role} onNavigate={() => setOpen(false)} /></div>
                <div className="flex shrink-0 items-center justify-between rounded-2xl bg-secondary/60 p-3">
                  <div className="min-w-0"><p className="truncate font-bold">{teacherTitle(user?.name, user?.role)}</p><p className="text-xs text-muted-foreground">{role ? ROLE_LABEL[role] : ""}</p></div>
                  <button type="button" onClick={logout} className="flex h-10 items-center gap-2 rounded-xl px-3 font-bold text-destructive hover:bg-destructive/10"><LogOut className="size-5" /> خروج</button>
                </div>
              </SheetContent>
            </Sheet>
            <div className="lg:hidden"><Brand role={role} /></div>
            <p className="hidden font-heading text-lg font-extrabold lg:block">أهلًا {teacherTitle(user?.name, user?.role)}</p>
          </div>
          <div className="flex items-center gap-2"><HomeBack /><ThemeToggle /></div>
        </header>
        <main className="mx-auto max-w-6xl p-4 lg:p-6">{user ? children : null}</main>
        {user && user.role !== "superadmin" && <EncouragementCloud />}
      </div>
    </div>
  );
}
