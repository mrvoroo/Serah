"use client";
import { motion, AnimatePresence } from "motion/react";
import { Check, ChevronDown, Star } from "lucide-react";
import salah from "@/content/salah.json";
import { RT } from "@/components/religious-text";
import { cn } from "@/lib/utils";
import { g } from "@/lib/kid-text";
import { useMotionAllowed } from "@/lib/tier";

// كارت آية الكرسي: مميَّز ثابت داخل أذكار ما بعد الصلاة، مع الحديث الصحيح في فضلها وشرح مبسّط للطفل
// النصوص في content/salah.json (kursiCard) ومراجَعة من الشيخ
type Card = {
  badge: string;
  great: { text: string; ref: string };
  hadith: { text: string; ref: string };
  explainTitle: string;
  explain: { part: string; meaning: string }[];
  done: { m: string; f: string };
};
const K = (salah as unknown as { kursiCard: Card }).kursiCard;

// نجوم تحفيزية حول الكارت (رموز فقط)، وتتوقف مع «تقليل الحركة»
const STARS = [
  { top: "6%", left: "6%", size: 14, delay: 0 },
  { top: "14%", left: "90%", size: 18, delay: 0.6 },
  { top: "48%", left: "2%", size: 10, delay: 1.2 },
  { top: "70%", left: "94%", size: 12, delay: 0.3 },
  { top: "92%", left: "40%", size: 10, delay: 0.9 },
];

export function KursiCard({ index, text, quranRef, remaining, onTap }: { index: string; text: string; quranRef: string; remaining: number; onTap: () => void }) {
  const animate = useMotionAllowed();
  const done = remaining === 0;
  return (
    <div data-testid="kursi-card" className="relative rounded-[26px] bg-gradient-to-br from-gold via-amber-300 to-gold p-[2px] shadow-soft">
      <div className={cn("relative overflow-hidden rounded-[24px] p-4", done ? "bg-emerald-50 dark:bg-[#06261f]" : "bg-card")}>
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {STARS.map((s, i) => (
            <motion.span key={i} className="absolute text-gold" style={{ top: s.top, left: s.left }}
              animate={animate ? { opacity: [0.25, 1, 0.25], scale: [0.8, 1.15, 0.8] } : undefined}
              transition={animate ? { duration: 2.6, repeat: Infinity, delay: s.delay, ease: "easeInOut" } : undefined}>
              <Star style={{ width: s.size, height: s.size }} fill="currentColor" strokeWidth={0} />
            </motion.span>
          ))}
        </div>
        <div className="relative flex flex-wrap items-center gap-2 text-xs font-bold">
          <span className="grid size-6 place-items-center rounded-full bg-secondary text-muted-foreground">{index}</span>
          <span className="flex items-center gap-1 rounded-full bg-gold px-3 py-1 text-[#3D2600]"><Star className="size-3.5" fill="currentColor" strokeWidth={0} /> آية الكرسي</span>
          <span className="rounded-full bg-gold/20 px-2 py-1 text-[#7A4D00] dark:text-gold">{K.badge}</span>
        </div>
        <p className="relative mt-3 text-xl leading-[2.2]"><RT text={text} /></p>
        <p className="relative mt-1 text-xs text-muted-foreground">{quranRef}</p>
        <div className="relative mt-3 rounded-2xl border border-gold/40 bg-gold/10 p-3 text-sm leading-7">
          <p className="font-bold"><RT text={K.hadith.text} /></p>
          <p className="mt-1 text-xs text-muted-foreground">{K.hadith.ref}</p>
        </div>
        <details className="group relative mt-3 rounded-2xl bg-secondary/50">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-2xl px-3 font-bold [&::-webkit-details-marker]:hidden">
            {K.explainTitle}
            <ChevronDown className="size-5 transition group-open:rotate-180" />
          </summary>
          <div className="flex flex-col gap-2 px-3 pb-3">
            <p className="text-sm leading-7"><RT text={K.great.text} /> <span className="text-xs text-muted-foreground">({K.great.ref})</span></p>
            <ul className="flex flex-col gap-2" aria-label="معاني الآية">
              {K.explain.map((e) => (
                <li key={e.part} className="rounded-xl bg-card p-2 text-sm leading-7">
                  <span className="block text-base"><RT text={e.part} /></span>
                  {e.meaning}
                </li>
              ))}
            </ul>
          </div>
        </details>
        <div className="relative mt-3 flex items-center justify-end">
          <button type="button" onClick={onTap} disabled={done} aria-label={done ? "تم: آية الكرسي" : "قرأتها: آية الكرسي"}
            className={cn("flex h-12 min-w-28 items-center justify-center gap-1 rounded-2xl px-5 font-bold transition active:scale-95", done ? "bg-emerald-500 text-white" : "bg-gold text-[#3D2600] shadow-soft")}>
            {done ? <><Check className="size-5" /> تم</> : <><Star className="size-4" fill="currentColor" strokeWidth={0} /> قرأتها</>}
          </button>
        </div>
        {/* منطقة الإعلان موجودة دائمًا (فارغة) حتى يقرأ قارئ الشاشة رسالة الإتمام عند ظهورها */}
        <div role="status" className="relative">
          <AnimatePresence>
            {done && (
              <motion.p initial={animate ? { opacity: 0, y: 8, scale: 0.95 } : false} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
                className="mt-3 rounded-2xl bg-emerald-500/15 p-3 text-center font-bold text-emerald-700 dark:text-emerald-300">
                {g(K.done.m, K.done.f)}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
