"use client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FileText, Moon, Sparkles, Sun } from "lucide-react";
import { AzkarDeck, type DeckZikr } from "@/components/kid/prayer/azkar-deck";
import { RT } from "@/components/religious-text";
import { Icon3D } from "@/components/icon3d";
import { AudioPlayer } from "@/components/audio-player";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/use-api";
import { useHydrated } from "@/hooks/use-hydrated";
import { api, driveImage } from "@/lib/api";
import { g } from "@/lib/kid-text";
import { loadPlace } from "@/lib/prayer";
import { KID_ORDER, PERIOD_NAME, currentPeriod, fitsPeriod, loadCounts, saveCounts, textFor, titleFor, todayIso, logicalDay, zikrById, type Period, type Release } from "@/lib/azkar";
import { cn } from "@/lib/utils";

// أذكار الصباح والمساء للطفل: تظهر فقط الأذكار التي فتحتها المعلمة لفصله، وآخر ذكر فُتح هو «ذكر الأسبوع».
// ضوابط الشيخ: النص كاملًا بلا تعديل، والتبسيط في سطر الشرح فقط، وبلا تخريج
function Attachment({ r }: { r: Release }) {
  if (!r.file_id) return null;
  if (r.file_kind === "image") return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={driveImage(r.file_id, 900)} alt={r.file_name || "صورة من المعلمة"} loading="lazy" className="mt-3 w-full rounded-2xl border object-contain" />
  );
  if (r.file_kind === "audio") return <AudioPlayer id={r.file_id} className="mt-3" />;
  return (
    <a href={`https://drive.google.com/file/d/${encodeURIComponent(r.file_id)}/view`} target="_blank" rel="noopener noreferrer"
      className="mt-3 flex items-center gap-2 rounded-2xl bg-secondary p-3 font-bold"><FileText className="size-5" /> {r.file_name || "ملف من المعلمة"}</a>
  );
}

export function KidAzkar() {
  const hydrated = useHydrated();
  const { data, loading, error, reload } = useApi<Release[]>("kidAzkar");
  const [period, setPeriod] = useState<Period>("am");
  const [left, setLeft] = useState<Record<string, number>>({});
  const [round, setRound] = useState(0);
  const sent = useRef(false);
  useEffect(() => {
    if (!hydrated) return;
    const p = currentPeriod(loadPlace());
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPeriod(p); setLeft(loadCounts(p));
  }, [hydrated]);

  const rel = Array.isArray(data) ? data : [];
  const byId = new Map(rel.map((r) => [r.zikr_id, r]));
  const week = rel.find((r) => { const z = zikrById(r.zikr_id); return z && fitsPeriod(z, period); }) ?? rel.find((r) => zikrById(r.zikr_id));
  const list: DeckZikr[] = KID_ORDER.map(zikrById).filter((z): z is NonNullable<typeof z> => !!z && byId.has(z.id) && fitsPeriod(z, period))
    .map((z) => ({ id: z.id, title: titleFor(z, period), text: textFor(z, period), count: z.count, ref: "" }));
  const remaining = (z: DeckZikr) => Math.min(left[z.id] ?? z.count, z.count);
  const tap = (z: DeckZikr) => setLeft((l) => { const n = { ...l, [z.id]: Math.max(0, remaining(z) - 1) }; saveCounts(period, n); return n; });
  const doneAll = list.length > 0 && list.every((z) => remaining(z) === 0);
  const pick = (p: Period) => { setPeriod(p); setLeft(loadCounts(p)); setRound((r) => r + 1); sent.current = false; };

  // أكمل كل الأذكار المفتوحة له: نجمتان مرة في كل فترة (الخادم يمنع التكرار)
  const finished = async () => {
    // النجوم لفترة الوقت الحالي فقط (الصباح صباحًا والمساء مساءً)
    if (sent.current || period !== currentPeriod(loadPlace())) return;
    sent.current = true;
    try {
      const r = await api<{ stars: number }>("azkarDone", { period, date: todayIso(logicalDay(period)) });
      if (r.stars) toast.success(`${g("أحسنت", "أحسنتِ")}! ${g("كسبت", "كسبتِ")} ${r.stars.toLocaleString("ar-EG")} نجمة ⭐`);
    } catch { sent.current = false; }
  };
  // أكملها قبل كده اليوم (العدّاد محفوظ) ولم تُسجَّل نجومها (نت ضعيف): نسجّلها عند الفتح — الخادم يمنع التكرار
  useEffect(() => { if (doneAll) void finished(); }, [doneAll]); // eslint-disable-line react-hooks/exhaustive-deps
  const body = (d: DeckZikr) => {
    const z = zikrById(d.id), r = byId.get(d.id);
    return (
      <>
        <p className="relative mt-3 text-xl leading-[2.2]"><RT text={d.text} /></p>
        {z?.kidNote && <p className="relative mt-3 rounded-2xl bg-gold/10 p-3 text-sm leading-7">💡 {z.kidNote}</p>}
        {r?.note && <p className="relative mt-2 rounded-2xl bg-primary/10 p-3 text-sm leading-7"><b>من المعلمة:</b> {r.note}</p>}
        {r && <div data-no-count><Attachment r={r} /></div>}
      </>
    );
  };

  return (
    <section aria-labelledby="kaz-title" className="flex flex-col gap-4">
      <header className="flex items-center gap-3">
        <Icon3D name={period === "am" ? "sun" : "moon"} size={56} float />
        <div>
          <h1 id="kaz-title" className="font-heading text-2xl font-extrabold">{PERIOD_NAME[period]}</h1>
          <p className="text-sm text-muted-foreground">الأذكار حصنك بإذن الله، و{g("كل ما تكمّلها تكسب", "كل ما تكمّليها تكسبي")} نجمتين ⭐</p>
        </div>
      </header>

      <div role="radiogroup" aria-label="الفترة" className="flex w-fit gap-1 rounded-2xl bg-secondary p-1">
        {(["am", "pm"] as Period[]).map((p) => (
          <button key={p} type="button" role="radio" aria-checked={period === p} onClick={() => pick(p)}
            className={cn("flex h-11 items-center gap-1 rounded-xl px-4 font-bold transition", period === p ? "bg-hero text-white shadow-soft" : "text-secondary-foreground")}>
            {p === "am" ? <Sun className="size-4" /> : <Moon className="size-4" />} {p === "am" ? "الصباح" : "المساء"}
          </button>
        ))}
      </div>

      {loading && !data ? <Skeleton className="h-56 rounded-[28px]" /> : error && !data ? (
        <div className="rounded-[28px] border bg-card p-5 text-center">
          <p className="font-bold">تعذّر تحميل الأذكار</p>
          <button type="button" onClick={() => reload()} className="mt-3 rounded-2xl bg-secondary px-4 py-2 font-bold">حاول مرة أخرى</button>
        </div>
      ) : rel.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[28px] border bg-card p-6 text-center">
          <Icon3D name="gift" size={64} float />
          <p className="font-heading text-lg font-extrabold">{g("أذكارك جاية قريب", "أذكاركِ جاية قريب")} 🤍</p>
          <p className="text-sm leading-7 text-muted-foreground">المعلمة هتفتح لك ذكرًا جديدًا كل فترة، {g("وهيوصلك", "وهيوصلكِ")} إشعار أول ما يتفتح.</p>
        </div>
      ) : (
        <>
          {week && (() => { const z = zikrById(week.zikr_id)!; return (
            <div data-testid="week-zikr" className="relative overflow-hidden rounded-[28px] bg-hero p-4 text-white shadow-soft">
              <p className="flex items-center gap-1 text-sm font-bold text-white/85"><Sparkles className="size-4" /> ذكر الأسبوع</p>
              <p className="mt-1 font-heading text-xl font-extrabold">{titleFor(z, fitsPeriod(z, period) ? period : z.when === "evening" ? "pm" : "am")}</p>
              {z.kidNote && <p className="mt-1 text-sm leading-7 text-white/90">{z.kidNote}</p>}
              {!fitsPeriod(z, period) && <p className="mt-1 text-xs text-white/80">هذا الذكر يُقال في {z.when === "morning" ? "الصباح" : "المساء"}</p>}
            </div>
          ); })()}
          {doneAll && <p className="rounded-2xl bg-emerald-500/15 p-3 text-center font-bold text-emerald-700 dark:text-emerald-300">ما شاء الله! {g("أتممت", "أتممتِ")} {PERIOD_NAME[period]} 🌟</p>}
          {list.length > 0
            ? hydrated && <AzkarDeck key={`${period}:${round}:${list.length}`} list={list} label={PERIOD_NAME[period]} remaining={remaining} countOf={(z) => z.count} onTap={tap} renderBody={body} onAllDone={finished} />
            : <p className="rounded-2xl bg-secondary p-4 text-center text-sm font-bold">مفيش أذكار مفتوحة لهذه الفترة بعد</p>}
        </>
      )}
    </section>
  );
}
