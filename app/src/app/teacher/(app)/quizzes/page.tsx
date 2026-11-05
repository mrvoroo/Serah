"use client";
import { useState } from "react";
import { toast } from "sonner";
import { BarChart3, Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { api, session, type Quiz, type QuizFull, type QuizResults } from "@/lib/api";
import { invalidate, useApi } from "@/hooks/use-api";
import { QuizEditor, type QuizDraft } from "@/components/teacher/quiz-editor";
import { useProphetOptions } from "@/components/teacher/lecture-editor";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BlurFade } from "@/components/ui/blur-fade";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Icon3D } from "@/components/icon3d";
import { cn, questionCount } from "@/lib/utils";

const n = (v: number) => v.toLocaleString("ar-EG");

export default function TeacherQuizzes() {
  const { data, loading, error, reload } = useApi<Quiz[]>("quizzes");
  const [draft, setDraft] = useState<QuizDraft | null>(null);
  const [resultsFor, setResultsFor] = useState<Quiz | null>(null);
  const [delFor, setDelFor] = useState<Quiz | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const isAdmin = ["admin", "superadmin"].includes(session.user()?.role ?? "");
  const prophets = useProphetOptions();
  const prophetName = (id?: string) => prophets.find((p) => p.value === id)?.label;
  const refresh = () => { invalidate("quizzes"); reload(); };

  const run = async (key: string, fn: () => Promise<unknown>, ok?: string) => {
    setPending(key);
    try { await fn(); if (ok) { toast.success(ok); refresh(); } return true; } catch (e) { toast.error((e as Error).message); return false; } finally { setPending(null); }
  };
  const edit = (z: Quiz) => run(`e${z.quiz_id}`, async () => {
    const full = await api<QuizFull>("quiz", { quiz_id: z.quiz_id });
    setDraft({ quiz_id: z.quiz_id, title: z.title, prophet_id: z.prophet_id, questions: full.questions });
  });
  const toggle = (z: Quiz, on: boolean) => run(z.quiz_id, () => api("setQuizStatus", { quiz_id: z.quiz_id, status: on ? "published" : "draft" }), on ? "تم نشر الاختبار للأطفال" : "تم إخفاء الاختبار");
  const del = async () => { if (delFor && await run("del", () => api("deleteQuiz", { quiz_id: delFor.quiz_id }), "تم حذف الاختبار")) setDelFor(null); };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3"><Icon3D name="clipboard" size={48} float /><div><h1 className="font-heading text-2xl font-extrabold">الاختبارات</h1><p className="text-sm text-muted-foreground">أسئلة اختيار من متعدد، والنجوم حسب الدرجة (أقصاها ٢٠ نجمة)</p></div></div>
        <Button variant="hero" size="lg2" onClick={() => setDraft({ title: "", prophet_id: "", questions: [] })}><Plus /> اختبار جديد</Button>
      </div>
      {error && !data && <p className="rounded-[24px] border bg-card p-6 text-center text-destructive">{error} <Button variant="link" onClick={reload}>إعادة المحاولة</Button></p>}
      {loading && !data ? [0, 1].map((i) => <Skeleton key={i} className="h-32 rounded-[24px]" />) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {(data ?? []).map((z, i) => (
            <BlurFade key={z.quiz_id} delay={0.03 * Math.min(i, 10)}>
              <li data-testid="quiz-card" className="flex flex-col gap-3 rounded-[24px] border bg-card p-4 shadow-soft">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-heading text-lg font-extrabold leading-snug">{z.title}</p>
                    <p className="text-sm text-muted-foreground">{questionCount(z.count)} · حلّه {n(z.results ?? 0)}{prophetName(z.prophet_id) && ` · ${prophetName(z.prophet_id)}`}</p>
                  </div>
                  {z.status === "published" ? <Badge className="rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">منشور</Badge> : <Badge className="rounded-full bg-gold text-[#3A2400]">مسودة</Badge>}
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="lg2" className="flex-1" aria-label={`نتائج ${z.title}`} onClick={() => setResultsFor(z)}><BarChart3 /> النتائج</Button>
                  {(z.status === "draft" || isAdmin) && !z.results && (
                    <Button variant="secondary" size="icon-xl" aria-label={`تعديل ${z.title}`} disabled={!!pending} onClick={() => edit(z)}>{pending === `e${z.quiz_id}` ? <Loader2 className="animate-spin" /> : <Pencil />}</Button>
                  )}
                  {(z.status === "draft" || isAdmin) && <Button variant="ghost" size="icon-xl" className="text-destructive" aria-label={`حذف ${z.title}`} onClick={() => setDelFor(z)}><Trash2 /></Button>}
                </div>
                {!!z.results && <p className="text-xs text-muted-foreground">حلّه أطفال، فلا تتغير أسئلته — للتعديل أنشئي اختبارًا جديدًا</p>}
                {!isAdmin && z.status === "published" && !z.results && <p className="text-xs text-muted-foreground">منشور — التعديل والحذف للأدمن</p>}
                {isAdmin ? (
                  <label className="flex items-center justify-between rounded-2xl bg-secondary/50 p-3 font-bold">
                    تمت المراجعة — ظاهر للأطفال
                    <Switch checked={z.status === "published"} disabled={pending === z.quiz_id} onCheckedChange={(v) => toggle(z, v)} />
                  </label>
                ) : z.status === "draft" && <p className="rounded-2xl bg-secondary/50 p-3 text-sm text-muted-foreground">ينتظر مراجعة الأدمن ونشره</p>}
              </li>
            </BlurFade>
          ))}
          {data?.length === 0 && <p className="col-span-full rounded-[24px] border bg-card p-6 text-center text-muted-foreground">لا توجد اختبارات بعد — ابدئي بأول اختبار</p>}
        </ul>
      )}

      <QuizEditor draft={draft} onClose={() => setDraft(null)} onSaved={refresh} />
      <ResultsDialog quiz={resultsFor} onClose={() => setResultsFor(null)} />
      <Dialog open={!!delFor} onOpenChange={(o) => !o && setDelFor(null)}>
        <DialogContent className="rounded-[28px] sm:max-w-sm">
          <DialogHeader><DialogTitle>حذف «{delFor?.title}»؟</DialogTitle><DialogDescription>تُحذف الأسئلة والنتائج، والنجوم التي أخذها الأطفال تبقى لهم</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="destructive" size="lg2" disabled={!!pending} onClick={del}>حذف</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// النتائج: نسبة الصواب في كل سؤال، ودرجة كل طفل وإجابته في كل سؤال
function ResultsDialog({ quiz, onClose }: { quiz: Quiz | null; onClose: () => void }) {
  const { data, loading, error } = useApi<QuizResults>("quizResults", { quiz_id: quiz?.quiz_id }, { enabled: !!quiz });
  const done = data?.kids.filter((k) => k.done) ?? [];
  const avg = done.length ? Math.round((done.reduce((s, k) => s + (k.score ?? 0) / (k.total || 1), 0) / done.length) * 100) : 0;
  return (
    <Dialog open={!!quiz} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92svh] overflow-y-auto rounded-[28px] sm:max-w-2xl">
        <DialogHeader><DialogTitle>نتائج «{quiz?.title}»</DialogTitle>
          <DialogDescription>{data ? `حلّه ${n(done.length)} من ${n(data.kids.length)} · متوسط الدرجات ${n(avg)}٪` : " "}</DialogDescription></DialogHeader>
        {error && <p className="text-destructive">{error}</p>}
        {loading && !data ? <Skeleton className="h-40 rounded-2xl" /> : data && (
          <div className="grid gap-4">
            <section className="grid gap-2">
              <h3 className="font-bold">كل سؤال</h3>
              {data.questions.map((q, i) => {
                const p = data.per[i]; const pc = p?.answered ? Math.round((p.right / p.answered) * 100) : 0;
                return (
                  <div key={q.question_id} className="grid gap-1 rounded-2xl bg-secondary/40 p-3">
                    <div className="flex justify-between gap-2 text-sm"><span className="font-bold">{n(i + 1)}. {q.text}</span><span className="shrink-0 text-muted-foreground">{p?.answered ? `${n(pc)}٪ صح` : "—"}</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-background"><div className={cn("h-full rounded-full", pc >= 70 ? "bg-emerald-500" : pc >= 40 ? "bg-gold" : "bg-destructive")} style={{ width: `${pc}%` }} /></div>
                    <p className="text-xs text-muted-foreground">الإجابة: {q.options[q.correct ?? 0]}</p>
                  </div>
                );
              })}
            </section>
            <section className="grid gap-2">
              <h3 className="font-bold">كل طفل</h3>
              <ul className="grid gap-2">
                {data.kids.map((k) => (
                  <li key={k.user_id} data-testid="result-kid" className="flex flex-wrap items-center gap-2 rounded-2xl border p-3">
                    <span className="text-xl" aria-hidden>{k.avatar || "🙂"}</span>
                    <span className="flex-1 font-bold">{k.name}</span>
                    {k.done ? (
                      <>
                        <span className="flex gap-0.5" aria-label="إجاباته">
                          {k.answers?.map((a, i) => a === data.questions[i]?.correct
                            ? <Check key={i} aria-label={`سؤال ${i + 1} صح`} className="size-5 rounded bg-emerald-500/15 text-emerald-600" />
                            : <X key={i} aria-label={`سؤال ${i + 1} خطأ`} className="size-5 rounded bg-destructive/10 text-destructive" />)}
                        </span>
                        <Badge className="rounded-full bg-hero text-white">{n(k.score ?? 0)} / {n(k.total ?? 0)}</Badge>
                      </>
                    ) : <span className="text-sm text-muted-foreground">لم يحل بعد</span>}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
