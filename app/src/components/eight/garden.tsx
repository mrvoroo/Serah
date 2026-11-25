"use client";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { BookOpen, Check, Loader2, Sprout } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SurahName } from "@/components/religious-text";
import { invalidate, useApi } from "@/hooks/use-api";
import { api } from "@/lib/api";
import { g } from "@/lib/kid-text";
import { useMotionAllowed } from "@/lib/tier";
import { JUZ_KID, STAGE_NAME, ar, isoToday, stageOf, surahName, type Garden, type Stage } from "@/lib/eight";
import { cn } from "@/lib/utils";

// شجرة السورة حسب المرحلة: بذرة ← نبتة ← شجيرة ← شجرة ← شجرة مثمرة (رسم هندسي بسيط، بلا أشخاص)
export function Tree({ stage, size = 72 }: { stage: Stage; size?: number }) {
  const leaf = stage >= 4 ? "#16A34A" : "#22C55E";
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden data-stage={stage}>
      <ellipse cx="32" cy="58" rx="20" ry="4" fill="#A16207" opacity=".35" />
      {stage === 0 && <ellipse cx="32" cy="54" rx="5" ry="3.5" fill="#92400E" />}
      {stage >= 1 && <path d={`M32 57 L32 ${stage === 1 ? 46 : stage === 2 ? 38 : 30}`} stroke="#92400E" strokeWidth={stage >= 3 ? 4 : 2.5} strokeLinecap="round" />}
      {stage === 1 && <><ellipse cx="27" cy="45" rx="5" ry="3" fill={leaf} transform="rotate(-25 27 45)" /><ellipse cx="37" cy="45" rx="5" ry="3" fill={leaf} transform="rotate(25 37 45)" /></>}
      {stage === 2 && <><circle cx="32" cy="33" r="10" fill={leaf} /><circle cx="25" cy="38" r="6" fill={leaf} /><circle cx="39" cy="38" r="6" fill={leaf} /></>}
      {stage >= 3 && <><circle cx="32" cy="22" r="14" fill={leaf} /><circle cx="20" cy="29" r="9" fill={leaf} /><circle cx="44" cy="29" r="9" fill={leaf} /><circle cx="32" cy="32" r="9" fill="#15803D" opacity=".5" /></>}
      {stage >= 4 && [[24, 20], [38, 17], [44, 30], [20, 31], [32, 28]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.8" fill={i % 2 ? "#F43F5E" : "#F59E0B"} />)}
    </svg>
  );
}

// الحديقة: ٣٧ شجرة من الناس صعودًا. الطفل يضغط شجرة ليراجع السورة (مرة في اليوم)، والمعلمة تؤكد الحفظ (onConfirm)
export function GardenGrid({ data, onPick, busy }: { data: Garden; onPick: (n: number) => void; busy?: number | null }) {
  const map = new Map(data.items.map((i) => [i.surah, i]));
  return (
    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
      {JUZ_KID.map((s) => {
        const it = map.get(s.n), st = stageOf(it?.reviews ?? 0, !!it?.confirmed);
        return (
          <li key={s.n}>
            <button type="button" data-testid="tree" data-surah={s.n} onClick={() => onPick(s.n)} aria-label={`سورة ${s.name}: ${STAGE_NAME[st]}`}
              className={cn("flex w-full flex-col items-center gap-0.5 rounded-[22px] border bg-card p-2 text-center shadow-soft transition active:scale-95", st === 4 && "border-emerald-500/70 bg-emerald-500/5")}>
              {busy === s.n ? <Loader2 className="my-6 size-6 animate-spin" /> : <Tree stage={st} size={64} />}
              <span className="text-sm font-bold"><SurahName name={s.name} /></span>
              <span className="text-[11px] text-muted-foreground">{STAGE_NAME[st]}{it?.reviews ? ` · ${ar(it.reviews)}` : ""}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function KidGarden() {
  const animate = useMotionAllowed();
  const { data, loading, error, reload } = useApi<Garden>("garden");
  const [pick, setPick] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const it = pick ? data?.items.find((i) => i.surah === pick) : undefined;
  const today = Number(isoToday().replace(/-/g, ""));
  const confirmed = data?.items.filter((i) => i.confirmed).length ?? 0;
  const review = async () => {
    if (!pick) return;
    setBusy(true);
    try {
      const r = await api<{ reviews: number; already: boolean }>("gardenReview", { surah: pick, date: isoToday() });
      if (r.already) toast(g("راجعتها النهارده خلاص — تعالى بكرة 🌱", "راجعتيها النهارده خلاص — تعالي بكرة 🌱"));
      else { toast.success(`${g("شجرتك كبرت", "شجرتكِ كبرت")}! 🌳`); if (animate) confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 }, colors: ["#22C55E", "#F59E0B"] }); }
      invalidate("garden"); invalidate("me"); await reload(); setPick(null);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <section aria-labelledby="kg-title" className="flex flex-col gap-4">
      <header className="flex items-center gap-3">
        <span className="grid size-14 place-items-center rounded-2xl bg-emerald-500/15"><Sprout className="size-8 text-emerald-600" /></span>
        <div>
          <h1 id="kg-title" className="font-heading text-2xl font-extrabold">حديقة جزء عمّ</h1>
          <p className="text-sm text-muted-foreground">كل سورة شجرة، {g("وكل ما تراجعها", "وكل ما تراجعيها")} تكبر، ولما المعلمة تسمعها منك تطلع ثمارها 🍎</p>
        </div>
      </header>
      {data && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-secondary p-3 text-sm font-bold" role="status">
          🌳 {ar(confirmed)} من {ar(data.items.length)} سورة مثمرة{data.juz && ` · 🏆 ${g("أتممت", "أتممتِ")} جزء عمّ!`}
        </div>
      )}
      {loading && !data ? <Skeleton className="h-96 rounded-[28px]" /> : error && !data ? (
        <div className="rounded-[28px] border bg-card p-5 text-center"><p className="font-bold">تعذّر تحميل الحديقة</p><button type="button" onClick={() => reload()} className="mt-3 h-11 rounded-2xl bg-secondary px-4 font-bold">{g("حاول", "حاولي")} مرة أخرى</button></div>
      ) : data && <GardenGrid data={data} onPick={setPick} />}
      <p className="text-xs leading-6 text-muted-foreground">بذرة ← نبتة (مراجعة) ← شجيرة (٣ مراجعات) ← شجرة (٧ مراجعات) ← شجرة مثمرة (المعلمة أكدت الحفظ)</p>

      <Dialog open={!!pick} onOpenChange={(o) => !o && !busy && setPick(null)}>
        <DialogContent className="rounded-[28px] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>سورة {pick ? surahName(pick) : ""}</DialogTitle>
            <DialogDescription>{it?.confirmed ? `ما شاء الله! المعلمة أكدت ${g("حفظك", "حفظكِ")} لها 🍎` : g("راجع السورة من المصحف أو من حفظك، وبعدين اضغط «راجعتها»", "راجعي السورة من المصحف أو من حفظكِ، وبعدين اضغطي «راجعتها»")}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center"><Tree stage={stageOf(it?.reviews ?? 0, !!it?.confirmed)} size={120} /></div>
          <p className="text-center text-sm font-bold">{ar(it?.reviews ?? 0)} مراجعة{it?.last_day === today ? " · راجعتها النهارده ✓" : ""}</p>
          <DialogFooter className="gap-2">
            <Link href="/kid/quran/" className={buttonVariants({ variant: "secondary", size: "lg2" })}><BookOpen /> {g("افتح", "افتحي")} المصحف</Link>
            <Button variant="hero" size="lg2" disabled={busy || it?.last_day === today} onClick={() => void review()}>{busy ? <Loader2 className="animate-spin" /> : <Check />} راجعتها</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

