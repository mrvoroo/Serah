"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { BookOpen, Check, Loader2, RotateCcw, Sprout, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SurahName } from "@/components/religious-text";
import { invalidate, useApi } from "@/hooks/use-api";
import { api, session } from "@/lib/api";
import { g } from "@/lib/kid-text";
import { useMotionAllowed, useTier } from "@/lib/tier";
import { JUZ_KID, STAGE_NAME, ar, isoToday, stageOf, surahName, type Garden, type Stage } from "@/lib/eight";
import { cn } from "@/lib/utils";

// نخلة السورة حسب المرحلة: نواة ← فسيلة ← نخلة صغيرة ← نخلة ← نخلة مثمرة (رسم نباتي، بلا أشخاص)
// السعفة: عرق في المنتصف + خوص (خطوط متقطعة سميكة على نفس المنحنى فتطلع كوريقات مصفوفة)
type FrondSpec = [angle: number, len: number, side: 1 | -1];
function Frond({ x, y, a, len, side, k }: { x: number; y: number; a: number; len: number; side: 1 | -1; k: string }) {
  const d = `M0 0 Q ${len * 0.45} ${-len * 0.42} ${len} ${len * 0.12}`;
  return (
    <g transform={`translate(${x} ${y}) scale(${side} 1) rotate(${a})`}>
      <path d={d} fill="none" stroke={`url(#leaf-${k})`} strokeWidth={len * 0.34} strokeDasharray="1.1 1.25" strokeLinecap="round" />
      <path d={d} fill="none" stroke="#14532D" strokeWidth={0.9} strokeLinecap="round" />
    </g>
  );
}
const CROWNS: Record<number, { top: number; fronds: FrondSpec[] }> = {
  1: { top: 52, fronds: [[-62, 9, 1], [-62, 9, -1], [-88, 8, 1]] },
  2: { top: 42, fronds: [[-28, 13, 1], [-28, 13, -1], [4, 12, 1], [4, 12, -1], [-70, 11, 1], [-70, 11, -1]] },
  3: { top: 24, fronds: [[-38, 18, 1], [-38, 18, -1], [-6, 20, 1], [-6, 20, -1], [22, 16, 1], [22, 16, -1], [-75, 14, 1], [-75, 14, -1]] },
};
export function Palm({ stage, size = 72 }: { stage: Stage; size?: number }) {
  const k = `p${stage}`, crown = CROWNS[Math.min(stage, 3)], ripe = stage >= 4;
  const top = crown?.top ?? 54, curve = stage >= 3 ? 29 : 31;
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden data-stage={stage}>
      <defs>
        <linearGradient id={`leaf-${k}`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={ripe ? "#15803D" : "#16A34A"} /><stop offset="1" stopColor={ripe ? "#4ADE80" : "#86EFAC"} /></linearGradient>
        <linearGradient id={`trunk-${k}`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#7C4A1E" /><stop offset=".5" stopColor="#B07A3F" /><stop offset="1" stopColor="#6B3F17" /></linearGradient>
        <radialGradient id={`sand-${k}`} cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#E9C88E" /><stop offset="1" stopColor="#C89B5A" stopOpacity=".1" /></radialGradient>
      </defs>
      <ellipse cx="32" cy="58.5" rx="22" ry="4.5" fill={`url(#sand-${k})`} />
      {stage === 0 && (
        <g>
          <ellipse cx="32" cy="56" rx="9" ry="2.6" fill="#A87A45" opacity=".55" />
          <ellipse cx="32" cy="53.6" rx="5.2" ry="3.2" fill="#7A4318" transform="rotate(-12 32 53.6)" />
          <path d="M28.6 53.4 Q32 52.2 35.4 53.6" stroke="#4A2509" strokeWidth=".8" fill="none" />
          <ellipse cx="30.4" cy="52.4" rx="1.4" ry=".7" fill="#C8894A" opacity=".8" />
        </g>
      )}
      {stage >= 2 && (
        <g>
          <path d={`M32 58 Q ${curve} ${(58 + top) / 2} 32.6 ${top}`} fill="none" stroke={`url(#trunk-${k})`} strokeWidth={stage >= 3 ? 4.6 : 3.4} strokeLinecap="round" />
          {/* حلقات الجذع */}
          <path d={`M32 58 Q ${curve} ${(58 + top) / 2} 32.6 ${top}`} fill="none" stroke="#5A3312" strokeWidth={stage >= 3 ? 4.6 : 3.4} strokeDasharray=".7 2.1" opacity=".55" />
        </g>
      )}
      {crown && crown.fronds.map(([a, len, side], i) => <Frond key={i} x={32.6} y={top} a={a} len={len} side={side} k={k} />)}
      {ripe && (
        <g>
          {/* عراجين التمر تحت السعف */}
          {[[27.4, 27.5], [37.6, 27.5]].map(([cx, cy], j) => (
            <g key={j}>
              <path d={`M32.6 25 Q ${cx} ${cy - 2} ${cx} ${cy}`} stroke="#B45309" strokeWidth=".8" fill="none" />
              {[[0, 0], [-1.6, 1.4], [1.6, 1.4], [0, 2.8], [-1.2, 4], [1.2, 4], [0, 5.2]].map(([dx, dy], i) => (
                <ellipse key={i} cx={cx + dx} cy={cy + dy} rx="1.05" ry="1.35" fill={i % 3 === 0 ? "#92400E" : i % 3 === 1 ? "#D97706" : "#B45309"} />
              ))}
            </g>
          ))}
          <circle cx="32.6" cy="24" r="16" fill="#FDE68A" opacity=".12" />
        </g>
      )}
    </svg>
  );
}
export const Tree = Palm;

// الحديقة: ٣٧ نخلة من الناس صعودًا. الطفل يضغط نخلة ليراجع السورة (مرة في اليوم)، والمعلمة تؤكد الحفظ (onConfirm)
export function GardenGrid({ data, onPick, busy }: { data: Garden; onPick: (n: number) => void; busy?: number | null }) {
  const map = new Map(data.items.map((i) => [i.surah, i]));
  return (
    <ul data-testid="garden-grid" className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
      {JUZ_KID.map((s) => {
        const it = map.get(s.n), st = stageOf(it?.reviews ?? 0, !!it?.confirmed);
        return (
          // آخر نخلة (النبأ) لوحدها في آخر صف على الموبايل: في النص بدل الطرف
          <li key={s.n} className="max-sm:last:col-start-2">
            <button type="button" data-testid="tree" data-surah={s.n} onClick={() => onPick(s.n)} aria-label={`سورة ${s.name}: ${STAGE_NAME[st]}`}
              className={cn("flex w-full flex-col items-center gap-0.5 rounded-[22px] border bg-card p-2 text-center shadow-soft transition active:scale-95", st === 4 && "border-emerald-500/70 bg-emerald-500/5")}>
              {busy === s.n ? <Loader2 className="my-6 size-6 animate-spin" /> : <Tree stage={st} size={64} />}
              <span className="text-sm font-bold"><SurahName name={s.name} /></span>
              <span className="text-[11px] text-muted-foreground">{STAGE_NAME[st]}{it?.reviews ? ` (${ar(it.reviews)})` : ""}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}


// احتفال إتمام جزء عمّ: مشهد واحة ثلاثي الأبعاد (٣٧ نخلة تطلع حوالين عين ماء وقت الغروب)
export function OasisCelebration({ onClose }: { onClose: () => void }) {
  const tier = useTier();
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<{ dispose: () => void; replay: () => void } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    import("@/lib/scenes/oasis-scene.js").then(({ createOasisScene }) => {
      if (!alive || !canvas.current) return;
      try { scene.current = createOasisScene(canvas.current, { tier, palms: 37 }); } catch { setFailed(true); }
    }).catch(() => alive && setFailed(true));
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => { alive = false; scene.current?.dispose(); scene.current = null; document.body.style.overflow = prev; window.removeEventListener("keydown", esc); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="oasis-title" data-testid="oasis" className="fixed inset-0 z-[60] overflow-hidden bg-[#1d2a6b]">
      {failed ? (
        <div className="flex h-full items-end justify-center gap-1 bg-gradient-to-b from-[#1d2a6b] via-[#7a4d9c] to-[#f3a35b] pb-24">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => <Palm key={i} stage={4} size={i % 2 ? 96 : 120} />)}
        </div>
      ) : <canvas ref={canvas} className="absolute inset-0 size-full" aria-label="واحة فيها ٣٧ نخلة مثمرة حول عين ماء" />}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col items-center gap-1 bg-gradient-to-b from-black/45 to-transparent px-4 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))] text-center text-white">
        <p id="oasis-title" className="font-heading text-2xl font-extrabold drop-shadow sm:text-3xl">ما شاء الله! {g("زرعت", "زرعتِ")} واحة جزء عمّ كلها 🌴</p>
        <p className="max-w-md text-sm leading-7 text-white/90">٣٧ سورة = ٣٧ نخلة مثمرة. {g("ربنا يجعل القرآن ربيع قلبك ونور صدرك", "ربنا يجعل القرآن ربيع قلبكِ ونور صدركِ")} 🤍</p>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex justify-center gap-2 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        {!failed && <Button variant="secondary" size="lg2" onClick={() => scene.current?.replay()}><RotateCcw /> من الأول</Button>}
        <Button variant="gold" size="lg2" onClick={onClose} autoFocus><X /> رجوع للحديقة</Button>
      </div>
    </div>
  );
}

export function KidGarden() {
  const animate = useMotionAllowed();
  const { data, loading, error, reload } = useApi<Garden>("garden");
  const [pick, setPick] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [oasis, setOasis] = useState(false);
  // أول مرة يكتمل فيها الجزء: الواحة تفتح لوحدها (مرة واحدة لكل حساب على الجهاز)
  useEffect(() => {
    if (!data?.juz) return;
    const k = `serah_oasis:${session.user()?.user_id ?? "x"}`;
    try { if (!localStorage.getItem(k)) { localStorage.setItem(k, "1"); setOasis(true); } } catch { /* لا شيء */ } // eslint-disable-line react-hooks/set-state-in-effect
  }, [data?.juz]);
  const it = pick ? data?.items.find((i) => i.surah === pick) : undefined;
  const today = Number(isoToday().replace(/-/g, ""));
  const confirmed = data?.items.filter((i) => i.confirmed).length ?? 0;
  const review = async () => {
    if (!pick) return;
    setBusy(true);
    try {
      const r = await api<{ reviews: number; already: boolean }>("gardenReview", { surah: pick, date: isoToday() });
      if (r.already) toast(g("راجعتها النهارده خلاص — تعالَ بكرة 🌱", "راجعتيها النهارده خلاص — تعالي بكرة 🌱"));
      else { toast.success(`${g("نخلتك كبرت", "نخلتكِ كبرت")}! 🌴`); if (animate) confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 }, colors: ["#22C55E", "#F59E0B"] }); }
      invalidate("garden"); invalidate("me"); await reload(); setPick(null);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <section aria-labelledby="kg-title" className="flex flex-col gap-4">
      <header className="flex items-center gap-3">
        <span className="grid size-14 place-items-center rounded-2xl bg-emerald-500/15"><Sprout className="size-8 text-emerald-600" /></span>
        <div>
          <h1 id="kg-title" className="font-heading text-2xl font-extrabold">حديقة جزء عمّ</h1>
          <p className="text-sm text-muted-foreground">كل سورة نخلة، {g("وكل ما تراجعها", "وكل ما تراجعيها")} تكبر، ولما المعلمة تسمعها منك يطلع فيها التمر 🌴</p>
        </div>
      </header>
      {data && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-secondary p-3 text-sm font-bold" role="status">
          🌴 {ar(confirmed)} من {ar(data.items.length)} نخلة مثمرة{data.juz && ` · 🏆 ${g("أتممت", "أتممتِ")} جزء عمّ!`}
        </div>
      )}
      {data?.juz && (
        <button type="button" data-testid="open-oasis" onClick={() => setOasis(true)}
          className="flex items-center gap-3 rounded-[24px] bg-gradient-to-l from-[#f3a35b] via-[#7a4d9c] to-[#1d2a6b] p-4 text-start text-white shadow-soft transition active:scale-[0.98]">
          <Palm stage={4} size={56} />
          <span className="flex-1"><span className="block font-heading text-lg font-extrabold">{g("شاهد واحتك", "شاهدي واحتكِ")} 🌴</span><span className="text-sm text-white/85">٣٧ نخلة مثمرة {g("زرعتها", "زرعتيها")} بحفظ جزء عمّ</span></span>
        </button>
      )}
      {oasis && <OasisCelebration onClose={() => setOasis(false)} />}
      {loading && !data ? <Skeleton className="h-96 rounded-[28px]" /> : error && !data ? (
        <div className="rounded-[28px] border bg-card p-5 text-center"><p className="font-bold">تعذّر تحميل الحديقة</p><button type="button" onClick={() => reload()} className="mt-3 h-11 rounded-2xl bg-secondary px-4 font-bold">{g("حاول", "حاولي")} مرة أخرى</button></div>
      ) : data && <GardenGrid data={data} onPick={setPick} />}
      <p className="text-xs leading-6 text-muted-foreground">نواة ← فسيلة (مراجعة) ← نخلة صغيرة (٣ مراجعات) ← نخلة (٧ مراجعات) ← نخلة مثمرة (المعلمة أكدت الحفظ)</p>

      <Dialog open={!!pick} onOpenChange={(o) => !o && !busy && setPick(null)}>
        <DialogContent className="rounded-[28px] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>سورة {pick ? surahName(pick) : ""}</DialogTitle>
            <DialogDescription>{it?.confirmed ? `ما شاء الله! المعلمة أكدت ${g("حفظك", "حفظكِ")} لها 🌴` : g("راجع السورة من المصحف أو من حفظك، وبعدين اضغط «راجعتها»", "راجعي السورة من المصحف أو من حفظكِ، وبعدين اضغطي «راجعتها»")}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center"><Tree stage={stageOf(it?.reviews ?? 0, !!it?.confirmed)} size={120} /></div>
          <p className="text-center text-sm font-bold">{ar(it?.reviews ?? 0)} مراجعة{it?.last_day === today ? ` — ${g("راجعتها", "راجعتيها")} النهارده ✓` : ""}</p>
          <DialogFooter className="gap-2">
            <Link href={`/kid/quran/?s=${pick ?? 1}`} className={buttonVariants({ variant: "secondary", size: "lg2" })}><BookOpen /> {g("افتح", "افتحي")} المصحف</Link>
            <Button variant="hero" size="lg2" disabled={busy || it?.last_day === today} onClick={() => void review()}>{busy ? <Loader2 className="animate-spin" /> : <Check />} راجعتها</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

