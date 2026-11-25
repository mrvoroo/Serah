"use client";
import { useState } from "react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { Flag, Loader2, Minus, Plus, Square, Trash2, Users } from "lucide-react";
import { Icon3D } from "@/components/icon3d";
import { RT } from "@/components/religious-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { invalidate, useApi } from "@/hooks/use-api";
import { api, fmtDate } from "@/lib/api";
import { g } from "@/lib/kid-text";
import { useMotionAllowed } from "@/lib/tier";
import { useRequireRole } from "@/components/kid/kid-shell";
import { ClassSelect, useClassScope } from "@/components/teacher/class-picker";
import { SEASONS, ar, isoToday, type Challenge, type Season } from "@/lib/eight";
import { cn } from "@/lib/utils";

// تحديات المواسم: هدف جماعي للفصل (رمضان، عشر ذي الحجة…)، وكل طفل يسجّل مساهمته اليومية
const seasonOf = (id: string) => SEASONS.find((s) => s.id === id) ?? SEASONS[SEASONS.length - 1];

function ChallengeBar({ c }: { c: Challenge }) {
  const pct = Math.min(100, Math.round((c.total / Math.max(1, c.goal)) * 100));
  return (
    <div className="flex flex-col gap-1">
      <Progress value={pct} aria-label={`تقدّم ${c.title}`} />
      <p className="flex justify-between text-xs font-bold text-muted-foreground"><span>{ar(c.total)} من {ar(c.goal)} {c.unit}</span><span>{ar(pct)}٪</span></p>
    </div>
  );
}

export function KidChallenges() {
  const animate = useMotionAllowed();
  const { data, loading, error, reload } = useApi<Challenge[]>("challenges", { date: isoToday() });
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const list = Array.isArray(data) ? data : [];
  const save = async (c: Challenge) => {
    const count = draft[c.ch_id] ?? c.mine_today;
    setBusy(c.ch_id);
    try {
      const r = await api<{ total: number; stars: number }>("challengeLog", { ch_id: c.ch_id, count, date: isoToday() });
      if (r.stars) { toast.success(`الفصل وصل للهدف! ${g("كسبت", "كسبتِ")} ${ar(r.stars)} نجوم ⭐`); if (animate) confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 } }); }
      else toast.success(g("اتسجّلت مساهمتك، جزاك الله خيرًا 🤍", "اتسجّلت مساهمتكِ، جزاكِ الله خيرًا 🤍"));
      invalidate("challenges"); invalidate("me"); invalidate("leaderboard"); await reload();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  };

  return (
    <section aria-labelledby="kc-title" className="flex flex-col gap-4">
      <header className="flex items-center gap-3">
        <Icon3D name="trophy" size={56} float />
        <div>
          <h1 id="kc-title" className="font-heading text-2xl font-extrabold">تحديات الفصل</h1>
          <p className="text-sm text-muted-foreground">الفصل كله فريق واحد! {g("سجّل", "سجّلي")} اللي {g("عملته", "عملتيه")} النهارده، ولما نوصل للهدف كل واحد ساهم ياخد ٥ نجوم ⭐</p>
        </div>
      </header>
      {loading && !data ? <Skeleton className="h-48 rounded-[28px]" /> : error && !data ? (
        <div className="rounded-[28px] border bg-card p-5 text-center"><p className="font-bold">تعذّر تحميل التحديات</p><button type="button" onClick={() => reload()} className="mt-3 h-11 rounded-2xl bg-secondary px-4 font-bold">{g("حاول", "حاولي")} مرة أخرى</button></div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[28px] border bg-card p-6 text-center">
          <Icon3D name="calendar" size={64} float />
          <p className="font-heading text-lg font-extrabold">مفيش تحدي دلوقتي</p>
          <p className="text-sm text-muted-foreground">المعلمة هتبدأ تحدي جديد في المواسم زي رمضان وعشر ذي الحجة إن شاء الله</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((c) => {
            const s = seasonOf(c.season), v = draft[c.ch_id] ?? c.mine_today, done = c.total >= c.goal;
            return (
              <li key={c.ch_id} data-testid="challenge" className={cn("flex flex-col gap-3 rounded-[28px] border bg-card p-4 shadow-soft", !c.active && "opacity-75")}>
                <div className="flex items-start gap-3">
                  <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-2xl">{s.icon}</span>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-heading text-lg font-extrabold">{c.title}</h2>
                    <p className="text-xs text-muted-foreground">{s.name} · {fmtDate(c.starts)} — {fmtDate(c.ends)}{!c.active ? " · انتهى" : ""}</p>
                  </div>
                </div>
                <p className="rounded-2xl bg-gold/10 p-3 text-sm leading-7"><RT text={s.verse} /> <span className="text-xs text-muted-foreground">({s.ref})</span></p>
                <ChallengeBar c={c} />
                <p className="flex items-center gap-1 text-xs font-bold text-muted-foreground"><Users className="size-4" /> {ar(c.kids)} ساهموا · مساهمتي كلها {ar(c.mine_total)}</p>
                {done && <p className="rounded-2xl bg-emerald-500/15 p-2 text-center text-sm font-bold text-emerald-700 dark:text-emerald-300">ما شاء الله! الفصل وصل للهدف 🎉</p>}
                {c.active && !c.open && <p className="rounded-2xl bg-secondary p-2 text-center text-sm font-bold">{isoToday() < c.starts ? `يبدأ التحدي يوم ${fmtDate(c.starts)} إن شاء الله` : "انتهت أيام التحدي"}</p>}
                {c.open && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold">النهارده:</span>
                    <Button variant="secondary" size="icon-xl" aria-label="أقل" disabled={v <= 0} onClick={() => setDraft({ ...draft, [c.ch_id]: Math.max(0, v - 1) })}><Minus /></Button>
                    <span data-testid="today-count" className="w-10 text-center font-heading text-2xl font-extrabold tabular-nums">{ar(v)}</span>
                    <Button variant="secondary" size="icon-xl" aria-label="أكثر" disabled={v >= 20} onClick={() => setDraft({ ...draft, [c.ch_id]: Math.min(20, v + 1) })}><Plus /></Button>
                    <span className="text-sm text-muted-foreground">{c.unit}</span>
                    <Button variant="hero" size="lg2" className="ms-auto" disabled={busy === c.ch_id || v === c.mine_today} onClick={() => void save(c)}>{busy === c.ch_id && <Loader2 className="animate-spin" />} حفظ</Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// المعلمة: تنشئ تحديًا لفصلها من قالب أو جديد، وتتابع التقدّم، وتنهيه أو تحذفه
const plusDays = (n: number) => isoToday(new Date(Date.now() + n * 864e5));
export function TeacherChallenges() {
  const me = useRequireRole(["teacher", "admin", "superadmin"]);
  const scope = useClassScope();
  const params = scope.class_id ? { class_id: scope.class_id } : {};
  const { data, loading, reload } = useApi<Challenge[]>("challenges", params, { enabled: !!me && scope.ready });
  const [f, setF] = useState({ title: "", season: "ramadan" as Season["id"], unit: "", goal: 100, starts: isoToday(), ends: plusDays(29) });
  const [busy, setBusy] = useState(false);
  const list = Array.isArray(data) ? data : [];
  const season = seasonOf(f.season);
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try { await fn(); toast.success(ok); invalidate("challenges"); await reload(); return true; } catch (e) { toast.error((e as Error).message); return false; } finally { setBusy(false); }
  };
  const create = async () => { if (await run(() => api("saveChallenge", { ...f, ...params }), "بدأ التحدي ✨ — ظهر لأطفال الفصل")) setF({ ...f, title: "", unit: "" }); };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Icon3D name="trophy" size={48} float />
        <div>
          <h1 className="font-heading text-2xl font-extrabold">تحديات المواسم</h1>
          <p className="text-sm text-muted-foreground">هدف جماعي للفصل، وكل طفل يسجّل مساهمته يوميًا. لما الفصل يوصل للهدف كل من ساهم ياخد ٥ نجوم.</p>
        </div>
      </div>
      <ClassSelect scope={scope} />

      <form className="flex flex-col gap-3 rounded-[28px] border bg-card p-4 shadow-soft" onSubmit={(e) => { e.preventDefault(); if (!busy) void create(); }}>
        <h2 className="flex items-center gap-2 font-heading text-lg font-extrabold"><Flag className="size-5" /> تحدي جديد</h2>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="الموسم">
          {SEASONS.map((s) => (
            <button key={s.id} type="button" role="radio" aria-checked={f.season === s.id} onClick={() => setF({ ...f, season: s.id })}
              className={cn("flex h-10 items-center gap-1 rounded-full border px-3 text-sm font-bold", f.season === s.id ? "border-primary bg-primary/10 text-primary" : "bg-background")}>{s.icon} {s.name}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {season.templates.map((t) => (
            <button key={t.title} type="button" data-testid="template" onClick={() => setF({ ...f, title: t.title, unit: t.unit, goal: t.goal })} className="rounded-full bg-secondary px-3 py-1.5 text-xs font-bold">{t.title}</button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5"><Label htmlFor="ch-title">العنوان</Label><Input id="ch-title" value={f.title} maxLength={60} onChange={(e) => setF({ ...f, title: e.target.value })} className="h-11 rounded-xl" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5"><Label htmlFor="ch-unit">الوحدة</Label><Input id="ch-unit" value={f.unit} maxLength={20} placeholder="صفحة" onChange={(e) => setF({ ...f, unit: e.target.value })} className="h-11 rounded-xl" /></div>
            <div className="grid gap-1.5"><Label htmlFor="ch-goal">الهدف</Label><Input id="ch-goal" type="number" inputMode="numeric" min={10} max={100000} value={f.goal} onChange={(e) => setF({ ...f, goal: Number(e.target.value) })} className="h-11 rounded-xl" /></div>
          </div>
          <div className="grid gap-1.5"><Label htmlFor="ch-from">من</Label><Input id="ch-from" type="date" value={f.starts} onChange={(e) => setF({ ...f, starts: e.target.value })} className="h-11 rounded-xl" /></div>
          <div className="grid gap-1.5"><Label htmlFor="ch-to">إلى</Label><Input id="ch-to" type="date" value={f.ends} onChange={(e) => setF({ ...f, ends: e.target.value })} className="h-11 rounded-xl" /></div>
        </div>
        <Button type="submit" variant="hero" size="lg2" disabled={busy || f.title.trim().length < 3 || !f.unit.trim()}>{busy && <Loader2 className="animate-spin" />} ابدأ التحدي</Button>
      </form>

      {loading && !data ? <Skeleton className="h-40 rounded-[28px]" /> : list.length === 0 ? <p className="rounded-[24px] border bg-card p-5 text-center text-sm text-muted-foreground">لا توجد تحديات لهذا الفصل بعد</p> : (
        <ul className="flex flex-col gap-3">
          {list.map((c) => (
            <li key={c.ch_id} data-testid="t-challenge" className="flex flex-col gap-2 rounded-[24px] border bg-card p-4 shadow-soft">
              <div className="flex items-start justify-between gap-2">
                <div><p className="font-heading text-lg font-extrabold">{seasonOf(c.season).icon} {c.title}</p><p className="text-xs text-muted-foreground">{fmtDate(c.starts)} — {fmtDate(c.ends)} · {ar(c.kids)} طفل ساهم{c.active ? "" : " · انتهى"}</p></div>
                <div className="flex gap-1">
                  {c.active && <Button variant="secondary" size="lg2" disabled={busy} onClick={() => { if (window.confirm("إنهاء التحدي؟ الأطفال لن يسجلوا بعده")) void run(() => api("endChallenge", { ch_id: c.ch_id }), "انتهى التحدي"); }}><Square /> إنهاء</Button>}
                  <Button variant="ghost" size="icon-xl" aria-label="حذف التحدي" disabled={busy} onClick={() => { if (window.confirm("حذف التحدي وكل مساهماته؟")) void run(() => api("deleteChallenge", { ch_id: c.ch_id }), "اتحذف التحدي"); }}><Trash2 className="text-destructive" /></Button>
                </div>
              </div>
              <ChallengeBar c={c} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
