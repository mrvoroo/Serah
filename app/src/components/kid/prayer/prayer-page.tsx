"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Check, ChevronLeft, ChevronRight, LocateFixed, MapPin } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { g, isGirl } from "@/lib/kid-text";
import { useMotionAllowed } from "@/lib/tier";
import { cn } from "@/lib/utils";
import { Icon3D } from "@/components/icon3d";
import {
  addDays, fmtDay, fmtHijri, fmtTime, iso, loadPlace, PRAYER_IDS, PRAYER_NAMES, savePlace, startOfDay, startOfWeek, timesFor,
  type Place, type PrayerId,
} from "@/lib/prayer";
import { syncPush } from "@/lib/push";
import { NotifyCard } from "./notify-card";
import { SalahGuide } from "./salah-guide";

type View = "day" | "week" | "month";
type Log = Record<string, PrayerId[]>;
const VIEWS: { id: View; label: string }[] = [{ id: "day", label: "اليوم" }, { id: "week", label: "الأسبوع" }, { id: "month", label: "الشهر" }];
const ar = (n: number) => n.toLocaleString("ar-EG");

function range(view: View, anchor: Date): Date[] {
  if (view === "day") return [startOfDay(anchor)];
  if (view === "week") { const s = startOfWeek(anchor); return Array.from({ length: 7 }, (_, i) => addDays(s, i)); }
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1), n = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
  return Array.from({ length: n }, (_, i) => addDays(first, i));
}

export function PrayerPage() {
  const animate = useMotionAllowed();
  const [view, setView] = useState<View>("day");
  const [anchor, setAnchor] = useState(() => new Date());
  const [place, setPlace] = useState<Place>(() => (typeof window === "undefined" ? { name: "", lat: 24.7136, lng: 46.6753 } : loadPlace()));
  const [log, setLog] = useState<Log>({});
  const [loaded, setLoaded] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(() => new Date());
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(t); }, []);
  // جدول الإشعارات يتحدث مع فتح الصفحة (لو مفعّلة)
  useEffect(() => { syncPush(isGirl()); }, []);

  const days = useMemo(() => range(view, anchor), [view, anchor]);
  const today = iso(now);

  // نحمّل سجل المدى المعروض مرة واحدة لكل يوم
  useEffect(() => {
    const need = days.map(iso).filter((d) => !loaded.has(d));
    if (!need.length) return;
    let live = true;
    api<{ days: Log }>("prayerLog", { from: need[0], to: need[need.length - 1] })
      .then((r) => { if (!live) return; setLog((l) => ({ ...l, ...r.days })); setLoaded((s) => new Set([...s, ...need])); })
      .catch(() => { /* الصفحة تعمل بدون السجل */ });
    return () => { live = false; };
  }, [days, loaded]);

  const times = useMemo(() => Object.fromEntries(days.map((d) => [iso(d), timesFor(d, place)])), [days, place]);
  const todayTimes = useMemo(() => timesFor(now, place), [now, place]);
  const next = PRAYER_IDS.find((p) => todayTimes[p] > now);

  const canMark = (d: string, p: PrayerId) => d < today || (d === today && (times[d] ?? todayTimes)[p] <= now);

  const toggle = useCallback(async (d: string, p: PrayerId) => {
    const was = (log[d] ?? []).includes(p);
    const set = was ? (log[d] ?? []).filter((x) => x !== p) : [...(log[d] ?? []), p];
    setLog((l) => ({ ...l, [d]: set }));
    setBusy(d + p);
    try {
      const saved = await api<PrayerId[]>("markPrayer", { date: d, prayer: p, done: !was });
      setLog((l) => ({ ...l, [d]: saved }));
      if (!was && saved.length === 5) toast.success(g("ما شاء الله! صلّيت الصلوات الخمس 🌟", "ما شاء الله! صلّيتِ الصلوات الخمس 🌟"));
      else if (!was) toast.success(`تقبّل الله ${g("منك", "منكِ")} صلاة ${PRAYER_NAMES[p]} 🤍`);
    } catch (e) {
      setLog((l) => ({ ...l, [d]: was ? [...(l[d] ?? []), p] : (l[d] ?? []).filter((x) => x !== p) }));
      toast.error((e as Error).message);
    } finally { setBusy(null); }
  }, [log]);

  const locate = () => {
    if (!navigator.geolocation) return toast.error("الجهاز لا يدعم تحديد الموقع");
    navigator.geolocation.getCurrentPosition((pos) => {
      const p = { name: "موقعي", lat: +pos.coords.latitude.toFixed(3), lng: +pos.coords.longitude.toFixed(3), auto: true };
      savePlace(p); setPlace(p); syncPush(isGirl(), true); toast.success("تم ضبط المواقيت على موقعك");
    }, () => toast.error("لم نستطع تحديد الموقع — نستخدم المدينة الافتراضية"), { timeout: 10_000 });
  };
  const resetPlace = () => { savePlace(null); const p = loadPlace(); setPlace(p); syncPush(isGirl(), true); };

  const shift = (dir: number) => setAnchor((a) => view === "day" ? addDays(a, dir) : view === "week" ? addDays(a, dir * 7) : new Date(a.getFullYear(), a.getMonth() + dir, 1));
  const title = view === "day" ? fmtDay(days[0]) : view === "week" ? `${fmtDay(days[0], { day: "numeric", month: "short" })} – ${fmtDay(days[6], { day: "numeric", month: "short" })}`
    : fmtDay(days[0], { month: "long", year: "numeric" });
  const past = days.filter((d) => iso(d) <= today);
  const doneCount = past.reduce((n, d) => n + (log[iso(d)]?.length ?? 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <section className="relative overflow-hidden rounded-[32px] bg-[radial-gradient(ellipse_at_top,#1E6B5C_0%,#0B2E2A_75%)] p-5 text-white shadow-soft">
        <div className="flex items-start gap-3">
          <Icon3D name="mosque" size={56} float />
          <div className="min-w-0 flex-1">
            <h1 className="font-ruqaa text-4xl leading-tight text-[#FFD57A]">جدول الصلوات</h1>
            <p className="text-sm text-white/80">{fmtDay(now)} · {fmtHijri(now)}</p>
          </div>
        </div>
        {next ? (
          <p className="mt-3 rounded-2xl bg-white/10 px-4 py-2 text-center font-bold" aria-live="polite">
            الصلاة القادمة: {PRAYER_NAMES[next]} — {fmtTime(todayTimes[next])}
            <span className="ms-2 text-sm text-white/70">(بعد {ar(Math.max(1, Math.round((todayTimes[next].getTime() - now.getTime()) / 60e3)))} دقيقة)</span>
          </p>
        ) : <p className="mt-3 rounded-2xl bg-white/10 px-4 py-2 text-center font-bold">انتهت صلوات اليوم — {g("تصبح", "تصبحي")} على خير 🌙</p>}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5"><MapPin className="size-4" /> {place.name}</span>
          <button type="button" onClick={locate} className="flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 font-bold hover:bg-white/25"><LocateFixed className="size-4" /> استخدم موقعي</button>
          {place.auto && <button type="button" onClick={resetPlace} className="rounded-full px-3 py-1.5 text-white/70 underline">المدينة الافتراضية</button>}
        </div>
      </section>

      <div role="tablist" aria-label="عرض الجدول" className="grid grid-cols-3 rounded-2xl bg-secondary p-1">
        {VIEWS.map((v) => (
          <button key={v.id} type="button" role="tab" aria-selected={view === v.id} onClick={() => { setView(v.id); setAnchor(new Date()); }}
            className={cn("h-10 rounded-xl font-bold transition", view === v.id ? "bg-card shadow-soft" : "text-muted-foreground")}>{v.label}</button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => shift(-1)} aria-label="السابق" className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary"><ChevronRight className="size-5" /></button>
        <div className="min-w-0 flex-1 text-center">
          <h2 className="truncate font-heading text-lg font-extrabold">{title}</h2>
          {past.length > 0 && <p className="text-sm font-bold text-primary">{g("صلّيت", "صلّيتِ")} {ar(doneCount)} من {ar(past.length * 5)}</p>}
        </div>
        <button type="button" onClick={() => shift(1)} aria-label="التالي" className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary"><ChevronLeft className="size-5" /></button>
      </div>
      {iso(days[0]) > today || iso(days[days.length - 1]) < today ? (
        <button type="button" onClick={() => setAnchor(new Date())} className="mx-auto -mt-2 h-9 rounded-xl bg-secondary px-4 text-sm font-bold">رجوع لليوم</button>
      ) : null}

      {view === "day" ? (
        <ul className="grid gap-3 sm:grid-cols-5" aria-label="صلوات اليوم">
          {PRAYER_IDS.map((p, i) => {
            const d = iso(days[0]), done = (log[d] ?? []).includes(p), ok = canMark(d, p), isNext = d === today && p === next;
            return (
              <motion.li key={p} initial={animate ? { opacity: 0, y: 12 } : false} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <button type="button" aria-pressed={done} disabled={!ok || busy === d + p} onClick={() => toggle(d, p)}
                  aria-label={`${done ? "ألغِ" : g("صلّيت", "صلّيتِ")} ${PRAYER_NAMES[p]}`}
                  className={cn("flex w-full items-center gap-3 rounded-[24px] border p-4 text-start shadow-soft transition sm:flex-col sm:text-center",
                    done ? "border-emerald-500/50 bg-emerald-500/10" : "bg-card", isNext && "ring-2 ring-gold", !ok && "opacity-60")}>
                  <span className={cn("grid size-12 shrink-0 place-items-center rounded-full border-2 transition", done ? "border-emerald-500 bg-emerald-500 text-white" : "border-muted-foreground/30")}>
                    {done && <Check className="size-7" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-heading text-xl font-extrabold">{PRAYER_NAMES[p]}</span>
                    <span className="block text-muted-foreground">{fmtTime(times[d][p])}</span>
                  </span>
                  <span className="text-xs font-bold text-muted-foreground">{done ? g("صلّيتها ✓", "صلّيتِها ✓") : ok ? g("اضغط لما تصلي", "اضغطي لما تصلي") : "لم يحن وقتها"}</span>
                </button>
              </motion.li>
            );
          })}
          <li className="text-center text-sm text-muted-foreground sm:col-span-5">الشروق: {fmtTime(times[iso(days[0])].sunrise)}</li>
        </ul>
      ) : (
        <div className="overflow-hidden rounded-[24px] border bg-card shadow-soft">
          <div className="grid grid-cols-[minmax(4.5rem,1fr)_repeat(5,minmax(0,1fr))] gap-1 border-b bg-secondary/60 p-2 text-center text-xs font-bold sm:text-sm">
            <span>اليوم</span>{PRAYER_IDS.map((p) => <span key={p}>{PRAYER_NAMES[p]}</span>)}
          </div>
          <ol aria-label="جدول الأيام">
            {days.map((day) => {
              const d = iso(day), t = times[d];
              return (
                <li key={d} className={cn("grid grid-cols-[minmax(4.5rem,1fr)_repeat(5,minmax(0,1fr))] items-center gap-1 border-b p-2 last:border-0", d === today && "bg-gold/10")}>
                  <button type="button" onClick={() => { setView("day"); setAnchor(day); }} className="text-start text-xs font-bold sm:text-sm" aria-label={`عرض يوم ${fmtDay(day)}`}>
                    {fmtDay(day, { weekday: "short" })}<span className="block text-muted-foreground">{fmtDay(day, { day: "numeric", month: "short" })}</span>
                  </button>
                  {PRAYER_IDS.map((p) => {
                    const done = (log[d] ?? []).includes(p), ok = canMark(d, p);
                    return (
                      <button key={p} type="button" aria-pressed={done} disabled={!ok || busy === d + p} onClick={() => toggle(d, p)}
                        aria-label={`${PRAYER_NAMES[p]} ${fmtDay(day)}`}
                        className={cn("flex flex-col items-center gap-0.5 rounded-xl py-1.5 transition", done ? "bg-emerald-500/15" : ok ? "hover:bg-secondary" : "opacity-50")}>
                        <span className={cn("grid size-6 place-items-center rounded-full border-2", done ? "border-emerald-500 bg-emerald-500 text-white" : "border-muted-foreground/30")}>{done && <Check className="size-4" />}</span>
                        <span className="text-[10px] text-muted-foreground sm:text-xs">{fmtTime(t[p])}</span>
                      </button>
                    );
                  })}
                </li>
              );
            })}
          </ol>
        </div>
      )}
      <p className="text-xs leading-6 text-muted-foreground">المواقيت محسوبة تقريبيًا حسب موقعك، والمعتمد أذان المسجد القريب منك.</p>

      <NotifyCard />
      <SalahGuide />
    </div>
  );
}
