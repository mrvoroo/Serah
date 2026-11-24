"use client";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Check, Lightbulb } from "lucide-react";
import { useMotionAllowed } from "@/lib/tier";
import { RT } from "@/components/religious-text";
import { g } from "@/lib/kid-text";
import { shuffle, scoreOf, type Pair, type VP, type WhoRound } from "@/lib/games";
import { cn } from "@/lib/utils";

// لوحات الألعاب: كل لوحة تنادي onDone(النتيجة ٠–١٠٠) لما تخلص
const ar = (n: number) => n.toLocaleString("ar-EG");

// مطابقة: اختر من اليمين ثم ما يناسبه من اليسار (أسماء الله ومعانيها، الاسم والخُلق، النبي ورمزه)
export function MatchBoard({ pairs, leftLabel, rightLabel, onDone, noteOf }: { pairs: Pair[]; leftLabel: string; rightLabel: string; onDone: (score: number) => void; noteOf?: (id: string) => string }) {
  const animate = useMotionAllowed();
  const rights = useMemo(() => shuffle(pairs), [pairs]);
  const [sel, setSel] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const [wrong, setWrong] = useState(0);
  const [shake, setShake] = useState<string | null>(null);
  const choose = (id: string) => {
    if (!sel || done.includes(id)) return;
    if (id === sel) {
      const next = [...done, id]; setDone(next); setSel(null);
      try { navigator.vibrate?.(15); } catch { /* لا شيء */ }
      if (next.length === pairs.length) onDone(scoreOf(pairs.length, wrong));
    } else { setWrong((w) => w + 1); setShake(id); setTimeout(() => setShake(null), 450); }
  };
  return (
    <div className="grid grid-cols-2 gap-3">
      <p className="text-center text-sm font-bold text-muted-foreground">{leftLabel}</p>
      <p className="text-center text-sm font-bold text-muted-foreground">{rightLabel}</p>
      <ul className="flex flex-col gap-2">
        {pairs.map((p) => {
          const ok = done.includes(p.id);
          return (
            <li key={p.id}><button type="button" data-testid="match-left" disabled={ok} aria-pressed={sel === p.id} onClick={() => setSel(p.id)}
              className={cn("flex min-h-14 w-full items-center justify-center rounded-2xl border-2 px-2 py-2 text-center font-heading text-lg font-extrabold leading-snug transition",
                ok ? "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : sel === p.id ? "border-gold bg-gold/20 shadow-soft" : "border-transparent bg-card shadow-soft")}>
              {ok && <Check className="me-1 size-4 shrink-0" />}{p.left}</button></li>
          );
        })}
      </ul>
      <ul className="flex flex-col gap-2">
        {rights.map((p) => {
          const ok = done.includes(p.id);
          return (
            <li key={p.id}><motion.button type="button" data-testid="match-right" data-pair={p.id} disabled={ok || !sel} onClick={() => choose(p.id)}
              animate={animate && shake === p.id ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }} transition={{ duration: 0.4 }}
              className={cn("flex min-h-14 w-full items-center justify-center rounded-2xl border-2 px-2 py-2 text-center text-sm font-bold leading-6 transition",
                ok ? "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : shake === p.id ? "border-destructive bg-destructive/10" : sel ? "border-dashed border-primary/40 bg-card" : "border-transparent bg-card/70")}>
              {p.right}</motion.button></li>
          );
        })}
      </ul>
      {noteOf && done.length > 0 && noteOf(done[done.length - 1]) && <p aria-live="polite" className="col-span-2 rounded-2xl bg-emerald-500/10 p-3 text-center text-sm leading-7">💡 <RT text={noteOf(done[done.length - 1])} /></p>}
      <p className="col-span-2 text-center text-xs text-muted-foreground">{g("اختر", "اختاري")} من العمود الأول ثم ما يناسبه · الأخطاء: {ar(wrong)}</p>
    </div>
  );
}

// الترتيب: اضغط على الأنبياء بترتيب مجيئهم (الأول ثم الذي بعده…)
export function OrderBoard({ items, onDone }: { items: (VP & { sort: number })[]; onDone: (score: number) => void }) {
  const animate = useMotionAllowed();
  const order = useMemo(() => items.slice().sort((a, b) => a.sort - b.sort), [items]);
  const [picked, setPicked] = useState<string[]>([]);
  const [wrong, setWrong] = useState(0);
  const [shake, setShake] = useState<string | null>(null);
  const tap = (id: string) => {
    if (picked.includes(id)) return;
    if (order[picked.length].id === id) {
      const next = [...picked, id]; setPicked(next);
      if (next.length === order.length) onDone(scoreOf(order.length, wrong));
    } else { setWrong((w) => w + 1); setShake(id); setTimeout(() => setShake(null), 450); }
  };
  return (
    <div className="flex flex-col gap-3">
      <ol className="flex min-h-14 flex-wrap items-center gap-2 rounded-2xl border-2 border-dashed p-2" aria-label="ترتيبك">
        {picked.length === 0 && <li className="text-sm text-muted-foreground">{g("اضغط على أول نبي جه", "اضغطي على أول نبي جه")}…</li>}
        {picked.map((id, i) => <li key={id} className="rounded-full bg-emerald-500 px-3 py-1 text-sm font-bold text-white">{ar(i + 1)}. {order[i].honored}</li>)}
      </ol>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map((p) => (
          <motion.button key={p.id} type="button" data-testid="order-item" data-sort={p.sort} disabled={picked.includes(p.id)} onClick={() => tap(p.id)}
            animate={animate && shake === p.id ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }} transition={{ duration: 0.4 }}
            className={cn("min-h-14 rounded-2xl border-2 px-2 font-heading text-lg font-extrabold shadow-soft transition disabled:opacity-40",
              shake === p.id ? "border-destructive bg-destructive/10" : "border-transparent bg-card")}>
            {p.short}
          </motion.button>
        ))}
      </div>
      <p className="text-center text-xs text-muted-foreground">الأخطاء: {ar(wrong)}</p>
    </div>
  );
}

// «مين هو؟»: تلميحات عن نبي (من الأصعب للأسهل) واختيار الإجابة. كل تلميح إضافي أو خطأ يقلل نقاط الجولة
export function WhoBoard({ rounds, onDone }: { rounds: WhoRound[]; onDone: (score: number) => void }) {
  const [k, setK] = useState(0);
  const [shown, setShown] = useState(1);
  const [miss, setMiss] = useState<string[]>([]);
  const [got, setGot] = useState(false);
  const [pts, setPts] = useState<number[]>([]);
  const r = rounds[k];
  if (!r) return null;
  const pick = (id: string) => {
    if (got || miss.includes(id)) return;
    if (id === r.id) {
      setGot(true);
      const p = Math.max(0, 100 - (shown - 1) * 20 - miss.length * 30);
      const all = [...pts, p]; setPts(all);
      setTimeout(() => {
        if (k + 1 >= rounds.length) onDone(Math.round(all.reduce((a, b) => a + b, 0) / all.length));
        else { setK(k + 1); setShown(1); setMiss([]); setGot(false); }
      }, 900);
    } else setMiss((m) => [...m, id]);
  };
  return (
    <div className="flex flex-col gap-3">
      <p className="text-center text-sm font-bold text-muted-foreground">الجولة {ar(k + 1)} من {ar(rounds.length)}</p>
      <ul aria-live="polite" className="flex flex-col gap-2">
        {r.clues.slice(0, shown).map((c, i) => (
          <li key={i} className="flex items-start gap-2 rounded-2xl bg-card p-3 leading-7 shadow-soft"><Lightbulb className="mt-1 size-4 shrink-0 text-amber-500" /> {c}</li>
        ))}
      </ul>
      {shown < r.clues.length && !got && (
        <button type="button" onClick={() => setShown(shown + 1)} className="mx-auto rounded-2xl bg-secondary px-4 py-2 text-sm font-bold">تلميح كمان 💡</button>
      )}
      <div className="grid grid-cols-2 gap-2">
        {r.options.map((o) => (
          <button key={o.id} type="button" data-testid="who-option" data-ok={o.id === r.id ? "1" : "0"} disabled={miss.includes(o.id) || got} onClick={() => pick(o.id)}
            className={cn("min-h-14 rounded-2xl border-2 px-2 font-heading text-lg font-extrabold shadow-soft transition",
              got && o.id === r.id ? "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : miss.includes(o.id) ? "border-destructive/50 bg-destructive/10 opacity-60" : "border-transparent bg-card")}>
            {got && o.id === r.id ? o.honored : o.short}
          </button>
        ))}
      </div>
    </div>
  );
}
