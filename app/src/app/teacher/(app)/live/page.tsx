"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, CalendarPlus, CheckCircle2, ChevronDown, Loader2, Mic, MicOff, Radio, Trash2, Users } from "lucide-react";
import { api, session } from "@/lib/api";
import { invalidate, useApi } from "@/hooks/use-api";
import { Icon3D } from "@/components/icon3d";
import { JitsiRoom } from "@/components/live/jitsi-room";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DAYS, LiveRecorder, fmtMinutes, fmtSlot, isAppleMobile, liveSession, myTz, nextSlot, recoverUpload, toWeekMin, type AttendStatus, type JitsiApi, type LiveAttendRow, type LiveRoom, type LiveState } from "@/lib/live";
import { cn } from "@/lib/utils";

const ST: Record<AttendStatus, { label: string; tone: string }> = {
  present: { label: "حاضر", tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  partial: { label: "حضر جزءًا", tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  absent: { label: "غائب", tone: "bg-secondary text-muted-foreground" },
  here: { label: "موجود الآن", tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
};
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const RECOVER_KEY = "serah_live_recovered";

// المحاضرة المباشرة للمعلمة: زر واحد يبدأ كل شيء (الغرفة + التسجيل + إشعار الأطفال)، وزر واحد ينهي (الحضور + حفظ التسجيل للأدمن)
export default function TeacherLive() {
  const { data, loading, reload } = useApi<LiveState>("liveState");
  const isAdmin = ["admin", "superadmin"].includes(session.user()?.role ?? "");
  // المحاضرة الجارية تعيش خارج الصفحة (لو المعلمة فتحت صفحة ثانية ورجعت، تلاقيها والتسجيل شغال)
  const [room, setRoom] = useState<LiveRoom | null>(() => liveSession.get()?.room ?? null);
  const rec = useRef<LiveRecorder | null>(liveSession.get()?.rec ?? null);
  const [inside, setInside] = useState(false);
  const [busy, setBusy] = useState(false);
  const ending = useRef(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [askEnd, setAskEnd] = useState(false);
  const [done, setDone] = useState<{ live_id: string; lecture: boolean; failed?: boolean } | null>(null);
  const [progress, setProgress] = useState(0);
  const [recOn, setRecOn] = useState<boolean | null>(() => (liveSession.get()?.rec ? true : null));
  const [silent, setSilent] = useState(false);
  const [muted, setMuted] = useState(false);
  const [secs, setSecs] = useState(0);
  const [here, setHere] = useState(0);
  const jitsi = useRef<JitsiApi | null>(null);
  const next = data ? nextSlot(data.slots) : null;
  const apple = typeof navigator !== "undefined" && isAppleMobile();

  // بعد إعادة تحميل الصفحة في نص محاضرة: نحفظ الجزء اللي اترفع قبلها
  useEffect(() => {
    recoverUpload().then((r) => {
      if (!r) return;
      try { localStorage.setItem(RECOVER_KEY, JSON.stringify(r)); } catch { /* */ }
      api("liveAttach", { live_id: r.live_id, audio_file_id: r.fileId, duration_sec: r.seconds })
        .then(() => { localStorage.removeItem(RECOVER_KEY); toast.success("اتحفظ تسجيل المحاضرة السابقة للمراجعة"); invalidate("lectures"); }).catch(() => { /* لسه شغالة: يُستخدم عند الإنهاء */ });
    });
  }, []);
  // عداد التسجيل، ونبضة المعلمة، وعدد الأطفال الموجودين (كل دقيقة)
  useEffect(() => {
    if (!room) return;
    const t = setInterval(() => setSecs(rec.current?.seconds ?? 0), 1000);
    const tick = () => {
      api<{ ended?: boolean }>("liveBeat", { live_id: room.live_id }).catch(() => {});
      api<LiveAttendRow[]>("liveAttendance", { live_id: room.live_id }).then((r) => setHere(r.filter((x) => x.status === "here").length)).catch(() => {});
    };
    tick(); const c = setInterval(tick, 60000);
    return () => { clearInterval(t); clearInterval(c); };
  }, [room]);
  // لو أغلقت التبويب أثناء المحاضرة: تنبيه المتصفح
  useEffect(() => {
    if (!room) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [room]);

  const enter = async (r: LiveRoom) => {
    setRoom(r); setInside(true); setDone(null);
    liveSession.set({ room: r, rec: rec.current });
    if (r.mine && LiveRecorder.supported() && !rec.current) {
      const x = new LiveRecorder();
      x.onSilent = () => setSilent(true);
      try { await x.start(r.live_id, `${r.title} ${new Date().toLocaleDateString("ar-EG")}`); rec.current = x; setRecOn(true); liveSession.set({ room: r, rec: x }); }
      catch { setRecOn(false); toast.error("لم يُسمح بالمايك للتسجيل — المحاضرة شغالة لكن بدون تسجيل"); }
    }
  };
  const start = async () => {
    setBusy(true);
    try {
      const r = await api<LiveRoom>("liveStart", { title: title.trim() || next?.slot.title || "محاضرة مباشرة" });
      if (r.fresh) toast.success("بدأت المحاضرة ووصل إشعار للأطفال 🎙️");
      await enter(r); invalidate("liveState");
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  const rejoin = async () => {
    if (!data?.live) return;
    setBusy(true);
    try { await enter(await api<LiveRoom>("liveJoin", { live_id: data.live.live_id })); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  const onMute = (m: boolean) => { setMuted(m); if (m) rec.current?.pause(); else rec.current?.resume(); };

  // الإنهاء: أولًا ننهي المحاضرة للكل (الحضور يُقفل فورًا)، وبعدها نحفظ التسجيل ونربطه
  const end = async () => {
    const r = room ?? (data?.live ? ({ live_id: data.live.live_id } as LiveRoom) : null);
    if (!r || ending.current) return;
    ending.current = true; setBusy(true); setAskEnd(false);
    try {
      try { jitsi.current?.executeCommand("endConference"); } catch { /* */ }
      await api("liveEnd", { live_id: r.live_id });
    } catch (e) { toast.error((e as Error).message); ending.current = false; setBusy(false); return; }
    setInside(false); setSaving(true);
    toast.success("انتهت المحاضرة، والحضور اتسجل ✨");
    let fileId = "", seconds = 0, failed = false;
    try {
      if (rec.current) ({ fileId, seconds } = await rec.current.stop(setProgress));
      else { const old = JSON.parse(localStorage.getItem(RECOVER_KEY) || "null"); if (old?.live_id === r.live_id) ({ fileId, seconds } = old); }
      if (fileId) {
        for (let i = 0; ; i++) {
          try { await api("liveAttach", { live_id: r.live_id, audio_file_id: fileId, duration_sec: seconds }); break; }
          catch (e) { if (i >= 2) throw e; await new Promise((res) => setTimeout(res, 3000)); }
        }
        try { localStorage.removeItem(RECOVER_KEY); } catch { /* */ }
      }
    } catch { failed = true; toast.error("تعذّر حفظ التسجيل — بلّغي المطوّر"); }
    rec.current = null; liveSession.set(null);
    setDone({ live_id: r.live_id, lecture: !!fileId && !failed, failed });
    setRoom(null); setRecOn(null); setSaving(false); setBusy(false); setProgress(0); ending.current = false;
    invalidate("liveState"); invalidate("lectures"); invalidate("dashboard"); reload();
  };

  if (loading && !data) return <Skeleton className="h-64 rounded-[24px]" />;
  const live = data?.live;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3"><Icon3D name="mic" size={48} float /><div><h1 className="font-heading text-2xl font-extrabold">المحاضرة المباشرة</h1><p className="text-sm text-muted-foreground">ضغطة واحدة تبدأ المحاضرة والتسجيل، وتوصل إشعار للأطفال</p></div></div>

      {data && !data.ready && (
        <div className="rounded-[24px] border border-dashed bg-card p-5 text-center leading-8">
          <p className="font-heading text-lg font-extrabold">سيرفر المحاضرات لسه بيتجهز</p>
          <p className="text-muted-foreground">أول ما يجهز هيظهر هنا زر «ابدئي المحاضرة» إن شاء الله.</p>
          {session.user()?.role === "superadmin" && <p className="mt-2 text-xs text-muted-foreground">للمطوّر: أضف JITSI_DOMAIN و JITSI_SECRET في Script Properties.</p>}
        </div>
      )}

      {/* أثناء المحاضرة */}
      {room && (
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2 rounded-[20px] border bg-card p-3 shadow-soft" aria-live="polite">
            {recOn ? <span className="flex items-center gap-2 rounded-xl bg-red-500/10 px-3 py-2 font-bold text-red-600"><span className={cn("size-2.5 rounded-full bg-red-600", !muted && "animate-pulse")} /> {muted ? "التسجيل متوقف (المايك مكتوم)" : `التسجيل شغال ${clock(secs)}`}</span>
              : <span className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-sm font-bold text-muted-foreground"><MicOff className="size-4" /> {room.mine ? "بدون تسجيل" : "التسجيل عند المعلمة التي بدأت"}</span>}
            <span className="flex items-center gap-1 rounded-xl bg-secondary px-3 py-2 text-sm font-bold"><Users className="size-4" /> {here.toLocaleString("ar-EG")} طفل موجود</span>
            <span className="min-w-0 flex-1 truncate font-heading font-extrabold">{room.title}</span>
            {!inside && !saving && <Button variant="secondary" size="lg2" onClick={() => setInside(true)}>العودة للمحاضرة</Button>}
            {!saving && <Button variant="destructive" size="lg2" onClick={() => setAskEnd(true)} disabled={busy}>إنهاء المحاضرة</Button>}
          </div>
          {silent && recOn && <p role="alert" className="flex gap-2 rounded-2xl bg-amber-500/15 p-3 text-sm font-bold leading-7 text-amber-800 dark:text-amber-200"><AlertTriangle className="size-5 shrink-0" /> الجهاز وقف المايك عن التسجيل. التسجيل ممكن يكون صامت — الأفضل لاب توب أو موبايل أندرويد.</p>}
          {saving ? <p className="flex items-center justify-center gap-2 rounded-[20px] bg-secondary p-4 text-center font-bold leading-8" aria-live="polite"><Loader2 className="size-5 animate-spin" /> جارٍ حفظ التسجيل{progress ? ` ${progress}%` : ""}… لا تقفلي الصفحة</p>
            : inside ? <JitsiRoom room={room} teacher onLeft={() => setAskEnd(true)} onMute={onMute} onApi={(a) => { jitsi.current = a; }} />
            : <p className="rounded-[20px] bg-secondary/60 p-4 text-center leading-8">المحاضرة{recOn ? " والتسجيل" : ""} لسه شغالين. اضغطي «العودة للمحاضرة» أو «إنهاء المحاضرة» لما تخلصي.</p>}
        </section>
      )}

      {/* قبل البدء */}
      {!room && data?.ready && (
        live ? (
          <section className="rounded-[28px] bg-hero p-6 text-white shadow-soft">
            <p className="flex items-center gap-2 font-bold"><Radio className="size-5 animate-pulse" /> المحاضرة شغالة الآن</p>
            <h2 className="mt-1 font-heading text-2xl font-extrabold">{live.title}</h2>
            <p className="text-white/85">بدأتها {live.teacher}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="lg2" className="bg-white text-primary hover:bg-white/90" onClick={rejoin} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Mic />} ادخلي المحاضرة</Button>
              <Button size="lg2" variant="destructive" onClick={() => setAskEnd(true)} disabled={busy}>إنهاء المحاضرة</Button>
            </div>
          </section>
        ) : (
          <section className="rounded-[28px] bg-hero p-6 text-white shadow-soft">
            <p className="text-white/85">{next ? (next.running ? "ميعاد المحاضرة الآن" : `المحاضرة الجاية: ${fmtSlot(next.slot)}`) : "مفيش مواعيد ثابتة — تقدري تبدئي في أي وقت"}</p>
            <Label htmlFor="live-title" className="mt-3 block text-white/90">عنوان المحاضرة</Label>
            <Input id="live-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={next?.slot.title || "مثال: قصة سيدنا يوسف"} className="mt-1 h-12 rounded-2xl bg-white text-foreground" maxLength={120} />
            <Button size="lg2" onClick={start} disabled={busy} className="mt-4 h-16 w-full rounded-2xl bg-white text-xl font-extrabold text-primary hover:bg-white/90">
              {busy ? <Loader2 className="animate-spin" /> : <Mic className="size-6" />} ابدئي المحاضرة الآن
            </Button>
            {apple && <p role="alert" className="mt-3 rounded-2xl bg-white/15 p-3 text-sm font-bold leading-7">⚠️ على الآيفون والآيباد التسجيل ممكن يطلع صامت (الجهاز بيدي المايك للمحاضرة بس). لو هتسجلي، استخدمي لاب توب أو موبايل أندرويد.</p>}
            <p className="mt-3 text-sm leading-7 text-white/85">💡 الأفضل من لاب توب أو تابلت على الشاحن. لو من الموبايل خلّي الشاشة مفتوحة طول المحاضرة عشان التسجيل.</p>
          </section>
        )
      )}

      {done && (
        <section className="rounded-[24px] border border-emerald-500/40 bg-emerald-500/5 p-4">
          <p className="flex items-center gap-2 font-heading text-lg font-extrabold"><CheckCircle2 className="size-6 text-emerald-600" /> تمت المحاضرة بحمد الله</p>
          <p className="mt-1 leading-8 text-muted-foreground">{done.lecture ? "التسجيل وصل للمعلمة الأدمن للمراجعة والنشر." : done.failed ? "التسجيل ما اتحفظش للأسف." : "المحاضرة انتهت بدون تسجيل."} وكشف الحضور جاهز تحت.</p>
          {done.lecture && <Link href="/teacher/lectures/" className="mt-2 inline-block font-bold text-primary underline-offset-4 hover:underline">المسودات والمراجعة ←</Link>}
        </section>
      )}

      <Slots state={data} admin={isAdmin} onChange={reload} />
      <Recent state={data} openId={done?.live_id} />

      <Dialog open={askEnd} onOpenChange={setAskEnd}>
        <DialogContent>
          <DialogHeader><DialogTitle>إنهاء المحاضرة؟</DialogTitle><DialogDescription>المحاضرة هتقفل للكل، ويتسجل الحضور، ويترفع التسجيل للمراجعة. (لو عايزة تخرجي من الغرفة بس، اضغطي «رجوع».)</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="destructive" size="lg2" onClick={end} disabled={busy}>نعم، إنهاء</Button><Button variant="secondary" size="lg2" onClick={() => setAskEnd(false)}>رجوع</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// المواعيد الأسبوعية: الأدمن تضيف وتحذف، والكل يرى
function Slots({ state, admin, onChange }: { state?: LiveState; admin: boolean; onChange: () => void }) {
  const [day, setDay] = useState(2), [time, setTime] = useState("17:00"), [minutes, setMinutes] = useState(60), [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const slots = state?.slots ?? [];
  if (!admin && !slots.length) return null;
  const add = async () => {
    setBusy(true);
    try { await api("liveSlotSave", { title: title.trim(), week_min: toWeekMin(day, time), minutes, tz: myTz() }); toast.success("اتضاف الموعد"); setTitle(""); invalidate("liveState"); onChange(); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  const del = async (id: string) => {
    try { await api("liveSlotDelete", { slot_id: id }); toast.success("اتحذف الموعد"); invalidate("liveState"); onChange(); } catch (e) { toast.error((e as Error).message); }
  };
  return (
    <section className="rounded-[24px] border bg-card p-4 shadow-soft">
      <h2 className="mb-3 flex items-center gap-2 font-heading text-lg font-extrabold"><CalendarPlus className="size-5" /> مواعيد المحاضرات كل أسبوع</h2>
      {slots.length ? (
        <ul className="grid gap-2" aria-label="مواعيد المحاضرات">
          {slots.map((s) => (
            <li key={s.slot_id} className="flex items-center gap-2 rounded-2xl bg-secondary/50 p-3">
              <span className="min-w-0 flex-1"><span className="block font-bold">{s.title}</span><span className="block text-sm text-muted-foreground">{fmtSlot(s)} · {s.minutes.toLocaleString("ar-EG")} دقيقة</span></span>
              {admin && <button type="button" onClick={() => del(s.slot_id)} aria-label={`حذف موعد ${s.title}`} className="grid size-10 place-items-center rounded-xl text-destructive hover:bg-destructive/10"><Trash2 className="size-5" /></button>}
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-muted-foreground">مفيش مواعيد لسه.</p>}
      {admin && (
        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto_auto] sm:items-end">
          <div><Label htmlFor="slot-title">العنوان</Label><Input id="slot-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="قصص الأنبياء" className="mt-1 h-11 rounded-xl" maxLength={80} /></div>
          <div><Label htmlFor="slot-day">اليوم</Label>
            <select id="slot-day" value={day} onChange={(e) => setDay(Number(e.target.value))} className="mt-1 h-11 w-full rounded-xl border bg-background px-3">{DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}</select></div>
          <div><Label htmlFor="slot-time">الساعة</Label><Input id="slot-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1 h-11 rounded-xl" /></div>
          <div><Label htmlFor="slot-min">المدة (دقيقة)</Label><Input id="slot-min" type="number" min={15} max={240} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="mt-1 h-11 w-28 rounded-xl" /></div>
          <Button size="lg2" onClick={add} disabled={busy || !title.trim()}>إضافة موعد</Button>
        </div>
      )}
    </section>
  );
}

// آخر المحاضرات وكشف حضور كل واحدة (تعديل يدوي بعد الإنهاء)
function Recent({ state, openId }: { state?: LiveState; openId?: string }) {
  const recent = state?.recent ?? [];
  if (!recent.length) return null;
  return (
    <section className="rounded-[24px] border bg-card p-4 shadow-soft">
      <h2 className="mb-3 font-heading text-lg font-extrabold">آخر المحاضرات والحضور</h2>
      <ul className="grid gap-2">{recent.map((l) => <RecentItem key={l.live_id} l={l} open={l.live_id === openId} />)}</ul>
    </section>
  );
}
function RecentItem({ l, open: initial }: { l: NonNullable<LiveState["recent"]>[number]; open: boolean }) {
  const [open, setOpen] = useState(initial);
  const att = useApi<LiveAttendRow[]>("liveAttendance", { live_id: l.live_id }, { enabled: open });
  const set = async (r: LiveAttendRow, status: AttendStatus) => {
    try { await api("liveSetAttend", { live_id: l.live_id, user_id: r.user_id, status }); att.reload(); invalidate("liveState"); } catch (e) { toast.error((e as Error).message); }
  };
  return (
    <li className="rounded-2xl bg-secondary/40">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-2 p-3 text-start">
        <span className="min-w-0 flex-1"><span className="block font-bold">{l.title}</span>
          <span className="block text-sm text-muted-foreground">{new Date(l.started_at).toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" })} · حاضر {(l.present ?? 0).toLocaleString("ar-EG")}{l.partial ? ` · جزئي ${l.partial.toLocaleString("ar-EG")}` : ""}{l.lecture_id ? " · فيه تسجيل" : ""}</span></span>
        <ChevronDown className={cn("size-5 transition", open && "rotate-180")} />
      </button>
      {open && (
        <div className="px-3 pb-3">
          {att.loading && !att.data ? <Skeleton className="h-20 rounded-xl" /> : (
            <ul className="grid gap-1" aria-label={`حضور ${l.title}`}>
              {(att.data ?? []).map((r) => (
                <li key={r.user_id} className="flex flex-wrap items-center gap-2 rounded-xl bg-card p-2">
                  <span className="text-xl">{r.avatar || "🙂"}</span>
                  <span className="min-w-0 flex-1 font-bold">{r.name}<span className="ms-2 text-xs font-normal text-muted-foreground">{r.seconds ? fmtMinutes(r.seconds) : ""}</span></span>
                  <select aria-label={`حالة ${r.name}`} value={r.status === "here" ? "present" : r.status} onChange={(e) => set(r, e.target.value as AttendStatus)}
                    className={cn("h-9 rounded-lg border-0 px-2 text-sm font-bold", ST[r.status].tone)}>
                    {(["present", "partial", "absent"] as const).map((s) => <option key={s} value={s}>{ST[s].label}</option>)}
                  </select>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}
