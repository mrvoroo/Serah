"use client";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CalendarClock, CheckCircle2, ChevronLeft, Circle, Loader2, Star } from "lucide-react";
import { api, fmtDate, type Assignment, type Quiz } from "@/lib/api";
import { invalidate, useApi } from "@/hooks/use-api";
import { BlurFade } from "@/components/ui/blur-fade";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Icon3D } from "@/components/icon3d";
import { KidBuddy } from "@/components/kid-buddy";
import { cn, questionCount } from "@/lib/utils";
import { RT } from "@/components/religious-text";
import { g } from "@/lib/kid-text";

const n = (v: number) => v.toLocaleString("ar-EG");

// اختباراتي وواجباتي: الاختبارات المنشورة (مع نتيجتي لو حليتها) والواجبات مع زر «أنجزت»
export default function KidTasks() {
  const quizzes = useApi<Quiz[]>("quizzes");
  const hw = useApi<Assignment[]>("assignments");
  const [busy, setBusy] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const mark = async (a: Assignment, done: boolean) => {
    setBusy(a.assignment_id);
    try {
      await api("markAssignment", { assignment_id: a.assignment_id, done });
      toast.success(done ? "برافو! المعلمة هتراجع واجبك إن شاء الله ⭐" : "تمام، شلنا العلامة");
      invalidate("assignments"); hw.reload();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  };

  return (
    <div className="flex flex-col gap-5">
      <BlurFade>
        <div className="flex items-center gap-3">
          <Icon3D name="clipboard" size={56} float />
          <div>
            <h1 className="font-heading text-3xl font-extrabold">اختبر نفسك</h1>
            <p className="text-muted-foreground">{g("اختبارات وواجبات تكسب منها نجوم", "اختبارات وواجبات تكسبي منها نجوم")}</p>
          </div>
        </div>
      </BlurFade>

      <section className="flex flex-col gap-3" aria-labelledby="h-quizzes">
        <h2 id="h-quizzes" className="font-heading text-xl font-extrabold">الاختبارات</h2>
        {quizzes.loading && !quizzes.data && <Skeleton className="h-24 rounded-[28px]" />}
        {quizzes.error && !quizzes.data && <p className="rounded-[28px] border bg-card p-4 text-center">{quizzes.error} <button className="font-bold text-primary" onClick={quizzes.reload}>{g("حاول تاني", "حاولي تاني")}</button></p>}
        {quizzes.data?.length === 0 && (
          <div className="flex items-center gap-3 rounded-[28px] border bg-card p-4"><KidBuddy mood="thinking" size={80} /><p className="font-bold">لسه مفيش اختبارات، قريبًا إن شاء الله</p></div>
        )}
        <ul className="flex flex-col gap-3">
          {quizzes.data?.map((z, i) => (
            <BlurFade key={z.quiz_id} delay={0.04 * Math.min(i, 8)}>
              <li>
                <Link href={`/kid/quiz/?id=${z.quiz_id}`} className="flex items-center gap-3 rounded-[28px] border bg-card p-4 shadow-soft transition-transform active:scale-[0.98]">
                  <Icon3D name={z.mine ? "trophy" : "thinking"} size={52} />
                  <div className="min-w-0 flex-1">
                    <p className="font-heading text-lg font-extrabold leading-snug">{z.title}</p>
                    <p className="text-sm text-muted-foreground">{questionCount(z.count)}</p>
                  </div>
                  {z.mine ? (
                    <Badge className="gap-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"><Star className="size-4 fill-gold text-gold" />{n(z.mine.score)} من {n(z.mine.total)}</Badge>
                  ) : <Badge className="rounded-full bg-gold text-[#3A2400]">جديد</Badge>}
                  <ChevronLeft className="size-5 text-muted-foreground" />
                </Link>
              </li>
            </BlurFade>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="h-hw">
        <h2 id="h-hw" className="font-heading text-xl font-extrabold">الواجبات</h2>
        {hw.loading && !hw.data && <Skeleton className="h-24 rounded-[28px]" />}
        {hw.error && !hw.data && <p className="rounded-[28px] border bg-card p-4 text-center">{hw.error} <button className="font-bold text-primary" onClick={hw.reload}>{g("حاول تاني", "حاولي تاني")}</button></p>}
        {hw.data?.length === 0 && <p className="rounded-[28px] border bg-card p-4 text-center font-bold text-muted-foreground">مفيش واجبات دلوقتي</p>}
        <ul className="flex flex-col gap-3">
          {hw.data?.map((a, i) => {
            const approved = a.status === "approved", done = a.status === "done";
            return (
              <BlurFade key={a.assignment_id} delay={0.04 * Math.min(i, 8)}>
                <li data-testid="kid-homework" className={cn("flex flex-col gap-3 rounded-[28px] border bg-card p-4 shadow-soft", approved && "border-emerald-500/50")}>
                  <div className="flex items-start gap-3">
                    <Icon3D name={approved ? "medal1" : "memo"} size={48} />
                    <div className="min-w-0 flex-1">
                      <p className="font-heading text-lg font-extrabold leading-snug">{a.title}</p>
                      {a.due && <p className={cn("flex items-center gap-1 text-sm", !approved && !done && a.due < today ? "font-bold text-destructive" : "text-muted-foreground")}><CalendarClock className="size-4" /> التسليم {fmtDate(a.due)}{!approved && !done && a.due < today && g(" — فات الموعد، خلّصه بسرعة", " — فات الموعد، خلّصيه بسرعة")}</p>}
                      {a.details && <p className="mt-1 whitespace-pre-wrap leading-relaxed"><RT text={a.details} /></p>}
                    </div>
                  </div>
                  {approved ? (
                    <p className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500/15 p-3 font-bold text-emerald-700 dark:text-emerald-300"><Star className="size-5 fill-gold text-gold" /> المعلمة اعتمدته — أخدت ١٥ نجمة</p>
                  ) : (
                    <>
                      {a.status === "returned" && <p className="rounded-2xl bg-gold/20 p-3 text-sm font-bold">{g("المعلمة طلبت تعيده تاني، ولما تخلّصه اضغط «أنجزت» وترجع لك نجومك إن شاء الله", "المعلمة طلبت تعيديه تاني، ولما تخلّصيه اضغطي «أنجزت» وترجع لكِ نجومك إن شاء الله")}</p>}
                      {done ? (
                        <div className="flex flex-col items-center gap-1">
                          <p className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-lg font-extrabold text-white"><CheckCircle2 className="size-6" /> {g("أنجزت — مستني المعلمة", "أنجزت — مستنية المعلمة")}</p>
                          <button type="button" disabled={busy === a.assignment_id} onClick={() => mark(a, false)} className="p-2 text-sm font-bold text-muted-foreground underline">{g("لسه مخلصتش؟ شيل العلامة", "لسه مخلصتيش؟ شيلي العلامة")}</button>
                        </div>
                      ) : (
                        <button type="button" disabled={busy === a.assignment_id} onClick={() => mark(a, true)}
                          className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-gold text-lg font-extrabold text-[#3A2400] btn-3d transition-transform active:scale-95">
                          {busy === a.assignment_id ? <Loader2 className="animate-spin" /> : <Circle className="size-6" />} أنجزت
                        </button>
                      )}
                    </>
                  )}
                </li>
              </BlurFade>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
