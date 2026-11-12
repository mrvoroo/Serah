"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, type PanInfo } from "motion/react";
import confetti from "canvas-confetti";
import { Check, ChevronLeft, ChevronRight, Hand } from "lucide-react";
import { RT } from "@/components/religious-text";
import { cn } from "@/lib/utils";
import { g } from "@/lib/kid-text";
import { useMotionAllowed } from "@/lib/tier";
import { times } from "@/lib/salah-extras";

// أذكار ما بعد الصلاة كمجموعة كروت تفاعلية: قائمة صغيرة فوق للتنقل، وكارت كبير يضغط الطفل في أي مكان فيه ليعدّ.
// إطار الكارت يمتلئ بنور ذهبي حسب ما أنجز (٣٣ ضغطة = دورة كاملة)، ومع كل ضغطة شعاع ونبضة، وبعد آخر ضغطة
// ينتقل تلقائيًا للكارت التالي. كل الحركة تتوقف مع «تقليل الحركة».
export type DeckZikr = { id: string; text: string; count: number; ref: string; virtue?: string; extra?: boolean; grade?: string };

const ar = (n: number) => n.toLocaleString("ar-EG");
// أول كلمات الذكر للقائمة (بدون علامات الآيات)
// (والسور بدون البسملة حتى لا تتشابه)
const short = (t: string) => t.replace(/[﴿﴾]/g, "").replace(/^\s*بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ\s*/, "").split(/\s+/).slice(0, 4).join(" ");

// إطار يمتلئ بالنسبة: مستطيل مدوّر بخط طوله = النسبة
function ProgressFrame({ pct, done, pulse }: { pct: number; done: boolean; pulse: number }) {
  const animate = useMotionAllowed();
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 size-full overflow-visible" preserveAspectRatio="none">
      <defs>
        <linearGradient id="zk-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFE08A" /><stop offset="50%" stopColor="#FFB020" /><stop offset="100%" stopColor="#FFE08A" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="calc(100% - 4px)" height="calc(100% - 4px)" rx="26" fill="none" strokeWidth="4" className="stroke-gold/15" />
      <motion.rect x="2" y="2" width="calc(100% - 4px)" height="calc(100% - 4px)" rx="26" fill="none" strokeWidth="4" strokeLinecap="round"
        stroke={done ? "#10b981" : "url(#zk-gold)"} pathLength={1}
        initial={false} animate={{ pathLength: Math.max(0.001, pct) }} transition={animate ? { type: "spring", stiffness: 120, damping: 20 } : { duration: 0 }}
        style={{ filter: done ? "drop-shadow(0 0 6px rgba(16,185,129,.7))" : "drop-shadow(0 0 7px rgba(255,190,60,.85))" }} />
      {/* شعاع يلف حول الإطار مع كل ضغطة */}
      {animate && pulse > 0 && !done && (
        <motion.rect key={pulse} x="2" y="2" width="calc(100% - 4px)" height="calc(100% - 4px)" rx="26" fill="none" strokeWidth="5" strokeLinecap="round"
          stroke="#FFF4C2" pathLength={1} strokeDasharray="0.06 0.94"
          initial={{ strokeDashoffset: 0, opacity: 1 }} animate={{ strokeDashoffset: -1, opacity: 0 }} transition={{ duration: 0.9, ease: "easeOut" }}
          style={{ filter: "drop-shadow(0 0 8px #FFD25A)" }} />
      )}
    </svg>
  );
}

type Props = {
  list: DeckZikr[];
  label: string;
  remaining: (z: DeckZikr) => number;
  countOf: (z: DeckZikr) => number;
  onTap: (z: DeckZikr) => void;
  // محتوى خاص لبعض الكروت (آية الكرسي)
  renderBody?: (z: DeckZikr, done: boolean) => ReactNode | null;
  // بعد ما يخلص كل الكروت
  onAllDone?: () => void;
};

// تغيّر الصلاة أو «من جديد»: الأب يغيّر key فيبدأ من أول كارت
export function AzkarDeck({ list, label, remaining, countOf, onTap, renderBody, onAllDone }: Props) {
  const animate = useMotionAllowed();
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const [pulse, setPulse] = useState(0);
  const [ripple, setRipple] = useState<{ x: number; y: number; k: number } | null>(null);
  const menu = useRef<HTMLOListElement>(null);
  const advance = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cur = list[Math.min(i, list.length - 1)];

  useEffect(() => () => { if (advance.current) clearTimeout(advance.current); }, []);
  // الكارت الحالي يبقى ظاهرًا في القائمة
  useEffect(() => { menu.current?.querySelector<HTMLElement>(`[data-idx="${i}"]`)?.scrollIntoView({ block: "nearest", inline: "center", behavior: animate ? "smooth" : "auto" }); }, [i, animate]);

  if (!cur) return null;
  const go = (k: number) => { if (k < 0 || k >= list.length || k === i) return; setDir(k > i ? 1 : -1); setI(k); setPulse(0); };
  const r = remaining(cur), c = countOf(cur), done = r === 0, pct = c ? (c - r) / c : 1;

  const tap = (e?: React.MouseEvent) => {
    if (done) return;
    if (e && (e.target as HTMLElement).closest("[data-no-count]")) return;
    if (e) { const b = (e.currentTarget as HTMLElement).getBoundingClientRect(); setRipple({ x: e.clientX - b.left, y: e.clientY - b.top, k: Date.now() }); }
    setPulse((p) => p + 1);
    try { navigator.vibrate?.(12); } catch { /* لا شيء */ }
    onTap(cur);
    if (r - 1 === 0) {
      // آخر ضغطة: ننتقل للكارت التالي غير المكتمل
      const nextIdx = list.findIndex((z, k) => k > i && remaining(z) > 0);
      const allDone = list.every((z) => z.id === cur.id || remaining(z) === 0);
      if (allDone) {
        onAllDone?.();
        if (animate) confetti({ particleCount: 90, spread: 75, origin: { y: 0.7 }, colors: ["#FFD25A", "#FFB020", "#10b981", "#ffffff"], disableForReducedMotion: true });
      } else if (nextIdx >= 0) {
        if (advance.current) clearTimeout(advance.current);
        advance.current = setTimeout(() => go(nextIdx), animate ? 750 : 300);
      }
    }
  };
  const onDragEnd = (_: unknown, info: PanInfo) => {
    // السحب في الاتجاه العربي: لليسار = التالي
    if (info.offset.x < -70) go(i + 1);
    else if (info.offset.x > 70) go(i - 1);
  };
  const body = renderBody?.(cur, done);

  return (
    <div className="flex flex-col gap-3">
      {/* قائمة الكروت: لمحة لكل ذكر وحلقة تقدّمه */}
      <ol ref={menu} aria-label={label} className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {list.map((z, k) => {
          const zr = remaining(z), zc = countOf(z), zd = zr === 0, on = k === i;
          return (
            <li key={z.id} data-idx={k} className="shrink-0 snap-center">
              <button type="button" onClick={() => go(k)} aria-current={on ? "step" : undefined}
                aria-label={`${ar(k + 1)}: ${short(z.text)}${zd ? " — تم" : zc > 1 ? ` — باقي ${ar(zr)}` : ""}`}
                className={cn("relative flex h-16 w-24 flex-col items-center justify-center gap-0.5 rounded-2xl border px-2 text-center text-xs font-bold transition",
                  on ? "border-gold bg-gold/15 shadow-soft" : zd ? "border-emerald-500/40 bg-emerald-500/10" : "bg-card")}>
                <span className={cn("grid size-6 place-items-center rounded-full text-[11px]", zd ? "bg-emerald-500 text-white" : "bg-secondary")}>{zd ? <Check className="size-3.5" /> : ar(k + 1)}</span>
                <span className="line-clamp-1 w-full text-[11px] text-muted-foreground">{short(z.text)}</span>
                {zc > 1 && !zd && <span aria-hidden className="absolute inset-x-2 bottom-1 h-1 overflow-hidden rounded-full bg-secondary"><span className="block h-full rounded-full bg-gold transition-all" style={{ width: `${((zc - zr) / zc) * 100}%` }} /></span>}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="relative">
        {/* كارت جديد يدخل من جهة التنقل (بدون انتظار خروج القديم حتى يبقى الضغط سريعًا) */}
          <motion.div key={cur.id}
            initial={animate ? { opacity: 0, x: dir * -60, scale: 0.97 } : false}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            drag={animate ? "x" : false} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.25} onDragEnd={onDragEnd}
            data-testid={cur.id === "kursi" && !cur.extra ? "kursi-card" : "zikr-card"}
            onClick={tap}
            className={cn("relative cursor-pointer select-none overflow-hidden rounded-[28px] p-5 shadow-soft transition-colors",
              done ? "bg-emerald-50 dark:bg-[#06261f]" : "bg-card")}>
            <ProgressFrame pct={pct} done={done} pulse={pulse} />
            {ripple && animate && (
              <motion.span key={ripple.k} aria-hidden className="pointer-events-none absolute rounded-full bg-gold/30"
                style={{ left: ripple.x - 20, top: ripple.y - 20, width: 40, height: 40 }}
                initial={{ scale: 0, opacity: 0.8 }} animate={{ scale: 6, opacity: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} />
            )}
            <div className="relative flex flex-wrap items-center gap-2 text-xs font-bold text-muted-foreground">
              <span className="grid size-7 place-items-center rounded-full bg-secondary">{ar(i + 1)}</span>
              <span>من {ar(list.length)}</span>
              {c > 1 && <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[#7A4D00] dark:text-gold">{times(c)}</span>}
              {cur.extra && <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[#7A4D00] dark:text-gold">اختارته المعلمة</span>}
            </div>
            {body ?? (
              <>
                <p className="relative mt-3 text-xl leading-[2.2]"><RT text={cur.text} /></p>
                {cur.virtue && <p className="relative mt-3 rounded-2xl bg-gold/10 p-3 text-sm leading-7">{cur.virtue}</p>}
                <p className="relative mt-2 text-xs text-muted-foreground">{cur.ref}{cur.grade && ` — ${cur.grade}`}</p>
              </>
            )}
            <div className="relative mt-4 flex items-center justify-between gap-3">
              <span className="flex items-center gap-1 text-xs font-bold text-muted-foreground">
                {done ? <span className="text-emerald-700 dark:text-emerald-300">{g("أحسنت", "أحسنتِ")} ✨</span> : <><Hand className="size-4" /> {g("اضغط في أي مكان على الكارت", "اضغطي في أي مكان على الكارت")}</>}
              </span>
              {/* زر للوحة المفاتيح وقارئ الشاشة (والضغط على الكارت كله يعمل نفس الشيء) */}
              <button type="button" data-no-count onClick={(e) => { e.stopPropagation(); tap(); }} disabled={done}
                aria-label={done ? `تم: ${short(cur.text)}` : c > 1 ? `عدّ: ${ar(r)} متبقية` : `قلته: ${short(cur.text)}`}
                className={cn("flex h-12 min-w-24 items-center justify-center gap-1 rounded-2xl px-4 text-lg font-extrabold tabular-nums transition active:scale-95",
                  done ? "bg-emerald-500 text-white" : "bg-gold text-[#3D2600] shadow-soft")}>
                {done ? <><Check className="size-5" /> تم</> : c > 1 ? <motion.span key={r} initial={animate ? { scale: 1.4 } : false} animate={{ scale: 1 }}>{ar(r)}</motion.span> : "قلته"}
              </button>
            </div>
          </motion.div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => go(i - 1)} disabled={i === 0} aria-label="الذكر السابق" className="flex h-11 items-center gap-1 rounded-2xl bg-secondary px-4 font-bold disabled:opacity-40"><ChevronRight className="size-5" /> السابق</button>
        <span className="text-sm font-bold text-muted-foreground">{ar(list.filter((z) => remaining(z) === 0).length)} / {ar(list.length)}</span>
        <button type="button" onClick={() => go(i + 1)} disabled={i === list.length - 1} aria-label="الذكر التالي" className="flex h-11 items-center gap-1 rounded-2xl bg-secondary px-4 font-bold disabled:opacity-40">التالي <ChevronLeft className="size-5" /></button>
      </div>
    </div>
  );
}
