"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import confetti from "canvas-confetti";
import { ArrowLeft, ArrowRight, Check, Loader2, RotateCcw, Star, X } from "lucide-react";
import { toast } from "sonner";
import { api, driveImage, type QuizFull, type QuizSubmit } from "@/lib/api";
import { invalidate, useApi } from "@/hooks/use-api";
import { useMotionAllowed } from "@/lib/tier";
import { Zaid } from "@/components/zaid";
import { Icon3D } from "@/components/icon3d";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import { cn, questionCount } from "@/lib/utils";
import { RT } from "@/components/religious-text";

const n = (v: number) => v.toLocaleString("ar-EG");
const LETTERS = ["أ", "ب", "ج", "د"];

// الاختبار للطفل: سؤال في كل شاشة بأزرار كبيرة، ثم التصحيح من الخلفية واحتفال ونجوم (أول مرة فقط)
export function QuizPlayer({ id }: { id: string }) {
  const { data, loading, error, reload } = useApi<QuizFull>("quiz", { quiz_id: id }, { enabled: !!id });
  const [step, setStep] = useState(-1); // -1 البداية، ثم رقم السؤال
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<QuizSubmit | null>(null);
  const animate = useMotionAllowed();
  const router = useRouter();
  const heading = useRef<HTMLHeadingElement>(null);

  // كل شاشة جديدة تبدأ من أعلى، والتركيز ينتقل لعنوانها (لقارئ الشاشة ولوحة المفاتيح)
  useEffect(() => { window.scrollTo({ top: 0 }); if (step >= 0 || result) heading.current?.focus({ preventScroll: true }); }, [step, result]);
  useEffect(() => {
    if (!result || !animate || result.score * 2 < result.total) return;
    const colors = ["#FFC24D", "#8B6CFF", "#3FD08F"];
    confetti({ particleCount: 90, spread: 80, origin: { y: 0.4 }, colors, disableForReducedMotion: true });
  }, [result, animate]);

  if (!id) return <Empty text="الاختبار غير موجود" />;
  if (loading && !data) return <Skeleton className="h-80 rounded-[32px]" />;
  if (error && !data) return <Empty text={error} retry={/غير موجود/.test(error) ? undefined : reload} />;
  if (!data) return null;
  const qs = data.questions;
  if (!qs.length) return <Empty text="الاختبار ده لسه مفيهوش أسئلة" />;

  const restart = () => { setAnswers({}); setResult(null); setStep(0); };
  const submit = async () => {
    setSending(true);
    try {
      const r = await api<QuizSubmit>("submitQuiz", { quiz_id: id, answers });
      setResult(r);
      invalidate("quizzes"); invalidate("me"); invalidate("quiz");
    } catch (e) { toast.error((e as Error).message); } finally { setSending(false); }
  };

  if (result) {
    const pct = result.total ? result.score / result.total : 0;
    const mood = pct === 1 ? "cheer" : pct >= 0.5 ? "happy" : "helping";
    return (
      <div className="flex flex-col gap-4">
        <section className="flex flex-col items-center gap-2 rounded-[32px] bg-hero p-5 text-center text-white shadow-soft" aria-live="polite">
          <Zaid mood={mood} size={130} />
          <h1 ref={heading} tabIndex={-1} className="font-heading text-3xl font-extrabold outline-none">{pct === 1 ? "ما شاء الله! كله صح" : pct >= 0.5 ? "شاطر! برافو عليك" : "ولا يهمك، المرة الجاية أحسن إن شاء الله"}</h1>
          <p className="text-xl font-bold">جاوبت {n(result.score)} من {n(result.total)} صح</p>
          <p className="text-sm text-white/85">نتعلم قصص الأنبياء عشان نقتدي بيهم ونرضي ربنا</p>
          {result.first ? (
            <p className="flex items-center gap-2 rounded-2xl bg-white/15 px-4 py-2 text-lg font-extrabold">
              <Star className="size-6 fill-gold text-gold" /> كسبت <span className="font-heading text-2xl font-extrabold">{n(result.stars)}</span> نجمة
            </p>
          ) : <p className="rounded-2xl bg-white/15 px-4 py-2 text-sm">ده تدريب — النجوم بتتحسب أول مرة بس{result.best ? ` (نتيجتك الأولى ${n(result.best.score)} من ${n(result.best.total)})` : ""}</p>}
        </section>
        <h2 className="font-heading text-xl font-extrabold">الإجابات</h2>
        <ol className="flex flex-col gap-2">
          {qs.map((q, i) => {
            const r = result.review.find((x) => x.question_id === q.question_id);
            return (
              <li key={q.question_id} data-testid="review-item" className={cn("rounded-[22px] border-2 bg-card p-3", r?.ok ? "border-emerald-500/60" : "border-destructive/50")}>
                <p className="flex items-start gap-2 font-bold">
                  {r?.ok ? <Check className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-label="صح" /> : <X className="mt-0.5 size-5 shrink-0 text-destructive" aria-label="خطأ" />}
                  {n(i + 1)}. <RT text={q.text} />
                </p>
                {!r?.ok && r && r.chosen >= 0 && <p className="ms-7 text-sm text-muted-foreground">إجابتك: <RT text={q.options[r.chosen]} /></p>}
                {r && <p className="ms-7 font-bold text-emerald-700 dark:text-emerald-300">الإجابة الصح: <RT text={q.options[r.correct]} /></p>}
              </li>
            );
          })}
        </ol>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={restart} className={buttonVariants({ variant: "secondary", size: "xl" })}><RotateCcw /> حاول تاني</button>
          <button type="button" onClick={() => (window.history.length > 1 ? router.back() : router.push("/kid/tasks/"))} className={buttonVariants({ variant: "hero", size: "xl" })}>تمام</button>
        </div>
      </div>
    );
  }

  if (step < 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[32px] border bg-card p-6 text-center shadow-soft">
        <Zaid mood="thinking" size={140} />
        <h1 className="font-heading text-3xl font-extrabold">{data.quiz.title}</h1>
        <p className="text-lg text-muted-foreground">{questionCount(qs.length)} · اختار الإجابة الصح في كل سؤال</p>
        {data.mine ? (
          <p className="rounded-2xl bg-secondary px-4 py-2 font-bold">حليته قبل كده: {n(data.mine.score)} من {n(data.mine.total)} — تقدر تتدرب تاني</p>
        ) : <p className="flex items-center gap-1 rounded-2xl bg-gold/20 px-4 py-2 font-bold"><Star className="size-5 fill-gold text-gold" /> تكسب لحد ٢٠ نجمة</p>}
        <button type="button" onClick={() => setStep(0)} className={cn(buttonVariants({ variant: "hero", size: "xl" }), "mt-2 w-full max-w-xs")}>يلا نبدأ <ArrowLeft /></button>
      </div>
    );
  }

  const q = qs[step];
  const chosen = answers[q.question_id];
  const last = step === qs.length - 1;
  const answeredAll = qs.every((x) => answers[x.question_id] !== undefined);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="font-bold text-muted-foreground">سؤال {n(step + 1)} من {n(qs.length)}</span>
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuemin={0} aria-valuemax={qs.length} aria-valuenow={step + 1} aria-valuetext={`سؤال ${step + 1} من ${qs.length}`} aria-label="التقدم">
          <motion.div className="h-full rounded-full bg-hero" animate={{ width: `${((step + 1) / qs.length) * 100}%` }} transition={{ duration: animate ? 0.4 : 0 }} />
        </div>
      </div>
      <AnimatePresence mode="wait">
        <motion.section key={q.question_id} initial={animate ? { opacity: 0, x: -40 } : false} animate={{ opacity: 1, x: 0 }} exit={animate ? { opacity: 0, x: 40 } : undefined}
          transition={{ duration: 0.25 }} className="flex flex-col gap-3">
          <div className="flex items-start gap-3 rounded-[28px] border bg-card p-4 shadow-soft">
            <Icon3D name="thinking" size={48} />
            <h1 ref={heading} tabIndex={-1} className="flex-1 font-heading text-2xl font-extrabold leading-relaxed outline-none"><RT text={q.text} /></h1>
          </div>
          {q.image_file_id && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={driveImage(q.image_file_id, 800)} alt="صورة السؤال" referrerPolicy="no-referrer" className="max-h-44 w-full rounded-[24px] object-contain sm:max-h-64" />
          )}
          <div role="radiogroup" aria-label="الاختيارات" className="grid gap-3">
            {q.options.map((o, k) => (
              <button key={k} type="button" role="radio" aria-checked={chosen === k} onClick={() => setAnswers((a) => ({ ...a, [q.question_id]: k }))}
                className={cn("flex min-h-16 items-center gap-3 rounded-[22px] border-2 bg-card px-4 py-3 text-start text-lg font-bold shadow-soft transition-transform active:scale-[0.98]",
                  chosen === k ? "border-primary bg-primary/10 ring-4 ring-primary/20" : "border-border")}>
                <span className={cn("grid size-10 shrink-0 place-items-center rounded-full font-extrabold", chosen === k ? "bg-hero text-white" : "bg-secondary")}>{LETTERS[k]}</span>
                <span className="flex-1"><RT text={o} /></span>
              </button>
            ))}
          </div>
        </motion.section>
      </AnimatePresence>
      <div className="grid grid-cols-[auto_1fr] gap-3">
        <button type="button" aria-label="السؤال السابق" onClick={() => setStep(step - 1)} disabled={step === 0} className={buttonVariants({ variant: "secondary", size: "xl" })}><ArrowRight /></button>
        {last ? (
          <button type="button" disabled={!answeredAll || sending} onClick={submit} className={buttonVariants({ variant: "hero", size: "xl" })}>
            {sending && <Loader2 className="animate-spin" />} {answeredAll ? "سلّم الإجابات" : "جاوب كل الأسئلة الأول"}
          </button>
        ) : (
          <button type="button" disabled={chosen === undefined} onClick={() => setStep(step + 1)} className={buttonVariants({ variant: "hero", size: "xl" })}>التالي <ArrowLeft /></button>
        )}
      </div>
    </div>
  );
}

function Empty({ text, retry }: { text: string; retry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[28px] border bg-card p-6 text-center">
      <Zaid mood="surprised" size={100} />
      <p className="font-bold">{text}</p>
      {retry && <button type="button" className={buttonVariants({ variant: "hero", size: "lg2" })} onClick={retry}>حاول تاني</button>}
      <Link href="/kid/tasks/" className={buttonVariants({ variant: "secondary", size: "lg2" })}>رجوع للاختبارات</Link>
    </div>
  );
}
