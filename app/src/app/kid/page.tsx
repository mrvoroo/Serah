"use client";
import Link from "next/link";
import { ArrowLeft, Bell, Play, X } from "lucide-react";
import { useState } from "react";
import { api, session, fmtDate, type Assignment, type Lecture, type Me, type Notice, type Quiz } from "@/lib/api";
import { RT } from "@/components/religious-text";
import { invalidate, useApi } from "@/hooks/use-api";
import { KidBuddy } from "@/components/kid-buddy";
import { Icon3D, type Icon3DName } from "@/components/icon3d";
import { BlurFade } from "@/components/ui/blur-fade";
import { NumberTicker } from "@/components/ui/number-ticker";
import { ShineBorder } from "@/components/ui/shine-border";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import { SuggestDialog } from "@/components/kid/suggest-dialog";
import SpotlightCard from "@/components/SpotlightCard";
import { cn } from "@/lib/utils";
import { g } from "@/lib/kid-text";
import { toast } from "sonner";

const TILES: { href: string; label: string; icon: Icon3DName; tone: string }[] = [
  { href: "/kid/journey/", label: "رحلة الأنبياء", icon: "rocket", tone: "from-[#7B5CFF] to-[#4B2FD1]" },
  { href: "/kid/lectures/", label: "المحاضرات", icon: "headphone", tone: "from-[#2FB5A3] to-[#167A6E]" },
  { href: "/kid/stars/", label: "لوحة النجوم", icon: "trophy", tone: "from-[#FFB020] to-[#E07A00]" },
  { href: "/kid/quran/", label: "القرآن الكريم", icon: "open-book", tone: "from-[#1FA37F] to-[#0E6B52]" },
  { href: "/kid/names/", label: "أسماء الله الحسنى", icon: "sparkles", tone: "from-[#3A2A8F] to-[#120A30]" },
];

export default function KidHome() {
  const user = session.user();
  const me = useApi<Me>("me");
  const lectures = useApi<Lecture[]>("lectures");
  const latest = lectures.data?.[0];
  const heard = new Set(me.data?.attended ?? []);
  const newOnes = (lectures.data ?? []).filter((l) => !heard.has(l.lecture_id)).length;
  const quizzes = useApi<Quiz[]>("quizzes");
  // إشعارات الطفل (مثل تصحيح سؤال في اختبار حلّه)
  const notices = useApi<Notice[]>("notices");
  const [hidden, setHidden] = useState<string[]>([]);
  const readNotice = (id: string) => { setHidden((h) => [...h, id]); api("readNotice", { notice_id: id }).then(() => { invalidate("notices"); invalidate("me"); invalidate("quizzes"); }).catch(() => { setHidden((h) => h.filter((y) => y !== id)); toast.error("تعذّر الحفظ، حاول مرة أخرى"); }); };
  const hw = useApi<Assignment[]>("assignments");
  const todo = (quizzes.data ?? []).filter((z) => !z.mine).length + (hw.data ?? []).filter((a) => !a.status || a.status === "returned").length;

  return (
    <div className="flex flex-col gap-4">
      <BlurFade delay={0.05}>
        <section className="relative overflow-hidden rounded-[32px] bg-hero p-5 text-white shadow-soft">
          <div className="flex items-center gap-3">
            <KidBuddy mood="happy" size={110} />
            <div className="flex-1">
              <p className="text-white/80">السلام عليكم</p>
              <h1 className="font-heading text-3xl font-extrabold">يا {user?.name ?? g("بطل", "بطلة")}!</h1>
              <p className="mt-1 text-white/85">{newOnes > 0 ? `عندك ${newOnes} محاضرة جديدة تستناك` : g("جاهز لمغامرة جديدة؟", "جاهزة لمغامرة جديدة؟")}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 rounded-2xl bg-white/15 p-3 backdrop-blur">
              <Icon3D name="glowing-star" size={40} float />
              <div><p className="text-xs text-white/80">نجومي</p>
                {me.loading && !me.data ? <Skeleton className="h-7 w-12 bg-white/30" /> : <NumberTicker value={me.data?.points ?? 0} className="font-heading text-2xl font-extrabold text-white" />}
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-white/15 p-3 backdrop-blur">
              <Icon3D name="medal1" size={40} float delay={0.4} />
              <div><p className="text-xs text-white/80">ترتيبي</p>
                {me.loading && !me.data ? <Skeleton className="h-7 w-12 bg-white/30" /> : <p className="font-heading text-2xl font-extrabold">{me.data?.rank || "-"}<span className="text-sm font-bold text-white/70"> من {me.data?.total ?? 0}</span></p>}
              </div>
            </div>
          </div>
        </section>
      </BlurFade>

      {(notices.data ?? []).filter((x) => !hidden.includes(x.notice_id)).map((x) => (
        <div key={x.notice_id} role="status" data-testid="kid-notice" className="flex items-start gap-3 rounded-[24px] border-2 border-gold/60 bg-gold/15 p-4">
          <Bell className="mt-1 size-5 shrink-0 text-gold" aria-hidden />
          <p className="flex-1 font-bold leading-7"><RT text={x.text} /></p>
          <button type="button" aria-label="تمام، قرأته" onClick={() => readNotice(x.notice_id)} className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary"><X className="size-4" /></button>
        </div>
      ))}

      <BlurFade delay={0.12}>
        <h2 className="mb-2 font-heading text-xl font-extrabold">آخر محاضرة</h2>
        {lectures.loading && !lectures.data ? <Skeleton className="h-28 rounded-[28px]" /> : latest ? (
          <Link href={`/kid/lecture/?id=${latest.lecture_id}`} className="relative flex items-center gap-4 overflow-hidden rounded-[28px] border bg-card p-4 shadow-soft">
            {!heard.has(latest.lecture_id) && <ShineBorder shineColor={["#FFC24D", "#8B6CFF"]} borderWidth={2} />}
            <Icon3D name="open-book" size={64} float />
            <div className="min-w-0 flex-1">
              <p className="truncate font-heading text-lg font-extrabold">{latest.title}</p>
              <p className="text-sm text-muted-foreground">{fmtDate(latest.date)}</p>
            </div>
            <span className="grid size-14 place-items-center rounded-full bg-gold text-[#3A2400] btn-3d"><Play className="size-6 fill-current" /></span>
          </Link>
        ) : (
          <div className="rounded-[28px] border bg-card p-6 text-center text-muted-foreground">لا توجد محاضرات بعد، قريبًا إن شاء الله</div>
        )}
      </BlurFade>

      <BlurFade delay={0.15}>
        <Link href="/kid/tasks/" className="relative flex items-center gap-3 overflow-hidden rounded-[28px] bg-gradient-to-br from-[#FF7A59] to-[#D94A7A] p-4 text-white shadow-soft transition-transform active:scale-[0.98]">
          {todo > 0 && <ShineBorder shineColor={["#FFC24D", "#FFFFFF"]} borderWidth={2} />}
          <Icon3D name="thinking" size={56} float />
          <div className="flex-1">
            <p className="font-heading text-lg font-extrabold">اختبر نفسك</p>
            <p className="text-sm text-white/90">{todo > 0 ? `عندك ${todo.toLocaleString("ar-EG")} ${todo === 1 ? "حاجة جديدة" : "حاجات جديدة"} تستناك` : g("اختبارات وواجبات تكسب منها نجوم", "اختبارات وواجبات تكسبي منها نجوم")}</p>
          </div>
          <ArrowLeft className="size-6" />
        </Link>
      </BlurFade>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {TILES.map((t, i) => (
          <BlurFade key={t.href} delay={0.18 + i * 0.05} className={cn(i === TILES.length - 1 && "col-span-2 sm:col-span-1")}>
            <Link href={t.href} className={cn("flex flex-col items-center justify-center gap-2 rounded-[28px]", i === TILES.length - 1 ? "h-full min-h-28 sm:aspect-square" : "aspect-square", " bg-gradient-to-br p-2 text-center font-bold text-white shadow-soft transition-transform active:scale-95", t.tone)}>
              <Icon3D name={t.icon} size={54} float delay={i * 0.3} />
              <span className="text-sm leading-tight">{t.label}</span>
            </Link>
          </BlurFade>
        ))}
      </div>

      <BlurFade delay={0.34}>
        <SpotlightCard className="!rounded-[28px] !border-border !bg-card !p-4" spotlightColor="rgba(139, 108, 255, 0.25)">
          <div className="flex items-center gap-3">
            <Icon3D name="bulb" size={52} float />
            <div className="flex-1">
              <p className="font-heading text-lg font-extrabold">عندك فكرة؟</p>
              <p className="text-sm text-muted-foreground">{g("قول للمعلمة اقتراحك", "قولي للمعلمة اقتراحك")}</p>
            </div>
            <SuggestDialog trigger={<button type="button" className={buttonVariants({ variant: "secondary", size: "lg2" })}>{g("اقترح", "اقترحي")} <ArrowLeft /></button>} />
          </div>
        </SpotlightCard>
      </BlurFade>
      <Link href="/about/" className="mx-auto text-sm font-bold text-muted-foreground underline-offset-4 hover:underline">من نحن ✨</Link>
    </div>
  );
}
