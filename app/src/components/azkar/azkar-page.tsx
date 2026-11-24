"use client";
import { useEffect, useState } from "react";
import { BookOpenText, Moon, RotateCcw, Sun } from "lucide-react";
import { AzkarDeck, type DeckZikr } from "@/components/kid/prayer/azkar-deck";
import { RT } from "@/components/religious-text";
import { Icon3D } from "@/components/icon3d";
import { useHydrated } from "@/hooks/use-hydrated";
import { loadPlace } from "@/lib/prayer";
import { AZKAR_META, PERIOD_NAME, currentPeriod, lateMorning, listFor, loadCounts, saveCounts, textFor, titleFor, zikrById, type Period } from "@/lib/azkar";
import { cn } from "@/lib/utils";

// أذكار الصباح والمساء للكبار (المعلمات والأدمن وأولياء الأمور): كاملة أو مختصرة، بنفس كروت العدّ،
// ومع كل ذكر «الفضل والدليل» (الفضل، الأجر، الحديث، المرجع، الدرجة) كما راجعها الشيخ
const SHORT_KEY = "serah_me_short";
const ar = (n: number) => n.toLocaleString("ar-EG");

function Proof({ id }: { id: string }) {
  const z = zikrById(id);
  if (!z) return null;
  return (
    <details data-no-count className="relative mt-3 rounded-2xl bg-secondary/60 p-3 text-sm leading-7 open:bg-secondary">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-bold text-primary"><BookOpenText className="size-4" /> الفضل والدليل</summary>
      <dl className="mt-2 flex flex-col gap-2">
        {z.virtue && <div><dt className="font-bold">الفضل</dt><dd>{z.virtue}</dd></div>}
        {z.reward && <div><dt className="font-bold">الأجر</dt><dd>{z.reward}</dd></div>}
        {z.hadith && <div><dt className="font-bold">الحديث</dt><dd><RT text={z.hadith} /></dd></div>}
        {z.ref && <div><dt className="font-bold">المرجع</dt><dd className="text-muted-foreground">{z.ref}</dd></div>}
        {z.grade && <div><dt className="font-bold">الدرجة</dt><dd className="text-muted-foreground">{z.grade}</dd></div>}
        {z.gradeNote && <div><dt className="font-bold">تنبيه</dt><dd className="text-muted-foreground">{z.gradeNote}</dd></div>}
      </dl>
    </details>
  );
}

export function AzkarPage() {
  const hydrated = useHydrated();
  const [period, setPeriod] = useState<Period>("am");
  const [short, setShort] = useState(false);
  const [left, setLeft] = useState<Record<string, number>>({});
  const [round, setRound] = useState(0);
  // الفترة والعدّاد من الجهاز بعد التحميل (الخادم لا يعرف الوقت المحلي)
  useEffect(() => {
    if (!hydrated) return;
    const p = currentPeriod(loadPlace());
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPeriod(p); setLeft(loadCounts(p));
    try { setShort(localStorage.getItem(SHORT_KEY) === "1"); } catch { /* لا شيء */ }
  }, [hydrated]);

  const list: DeckZikr[] = listFor(period, short).map((z) => ({ id: z.id, title: titleFor(z, period), text: textFor(z, period), count: z.count, ref: "" }));
  const remaining = (z: DeckZikr) => Math.min(left[z.id] ?? z.count, z.count);
  const tap = (z: DeckZikr) => setLeft((l) => { const n = { ...l, [z.id]: Math.max(0, remaining(z) - 1) }; saveCounts(period, n); return n; });
  const doneAll = list.length > 0 && list.every((z) => remaining(z) === 0);
  const pickPeriod = (p: Period) => { setPeriod(p); setLeft(loadCounts(p)); setRound((r) => r + 1); };
  const pickShort = (v: boolean) => { setShort(v); try { localStorage.setItem(SHORT_KEY, v ? "1" : "0"); } catch { /* لا شيء */ } setRound((r) => r + 1); };
  const reset = () => { setLeft({}); saveCounts(period, {}); setRound((r) => r + 1); };
  const body = (d: DeckZikr) => {
    const z = zikrById(d.id);
    return (
      <>
        <p className="relative mt-3 text-xl leading-[2.2]"><RT text={d.text} /></p>
        {z?.sleepNote && <p className="relative mt-3 rounded-2xl bg-primary/10 p-3 text-sm leading-7">🌙 {z.sleepNote}</p>}
        <Proof id={d.id} />
      </>
    );
  };

  return (
    <section aria-labelledby="me-title" className="flex flex-col gap-4">
      <header className="flex items-center gap-3">
        <Icon3D name={period === "am" ? "sun" : "moon"} size={52} float />
        <div>
          <h1 id="me-title" className="font-heading text-2xl font-extrabold">{PERIOD_NAME[period]}</h1>
          <p className="text-sm text-muted-foreground">{ar(list.length)} ذكرًا · {short ? "النسخة المختصرة" : "النسخة الكاملة"}</p>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div role="radiogroup" aria-label="الفترة" className="flex gap-1 rounded-2xl bg-secondary p-1">
          {(["am", "pm"] as Period[]).map((p) => (
            <button key={p} type="button" role="radio" aria-checked={period === p} onClick={() => pickPeriod(p)}
              className={cn("flex h-10 items-center gap-1 rounded-xl px-3 text-sm font-bold transition", period === p ? "bg-hero text-white shadow-soft" : "text-secondary-foreground")}>
              {p === "am" ? <Sun className="size-4" /> : <Moon className="size-4" />} {p === "am" ? "الصباح" : "المساء"}
            </button>
          ))}
        </div>
        <div role="radiogroup" aria-label="النسخة" className="flex gap-1 rounded-2xl bg-secondary p-1">
          {[false, true].map((v) => (
            <button key={String(v)} type="button" role="radio" aria-checked={short === v} onClick={() => pickShort(v)}
              className={cn("h-10 rounded-xl px-3 text-sm font-bold transition", short === v ? "bg-gold text-[#3D2600] shadow-soft" : "text-secondary-foreground")}>{v ? "مختصرة" : "كاملة"}</button>
          ))}
        </div>
        <button type="button" onClick={reset} className="ms-auto flex h-10 items-center gap-1 rounded-xl px-3 text-sm font-bold hover:bg-secondary"><RotateCcw className="size-4" /> من جديد</button>
      </div>

      {hydrated && period === "am" && lateMorning(loadPlace()) && <p className="rounded-2xl bg-gold/10 p-3 text-sm leading-7">الأفضل أن تُقال أذكار الصباح بعد الفجر إلى طلوع الشمس، ومن فاتته فليقلها الآن 🤍</p>}
      {doneAll && <p className="rounded-2xl bg-emerald-500/15 p-3 text-center font-bold text-emerald-700 dark:text-emerald-300">تقبّل الله منكم، أتممتم {PERIOD_NAME[period]} 🤍</p>}
      {hydrated && <AzkarDeck key={`${period}:${short}:${round}`} list={list} label={PERIOD_NAME[period]} remaining={remaining} countOf={(z) => z.count} onTap={tap} renderBody={body} />}
      {AZKAR_META.source && <p className="text-xs leading-6 text-muted-foreground">{AZKAR_META.source}</p>}
    </section>
  );
}
