"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Mic, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { Icon3D } from "@/components/icon3d";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RECITERS, arNum, ayahAudio, hasBasmala, loadPrefs, savePrefs, surahList, surahText,
  type Ayah, type QuranPrefs, type SurahInfo,
} from "@/lib/quran";
import { cn } from "@/lib/utils";

// القرآن للأطفال: المصحف المعلّم (الشيخ يقرأ والأطفال يرددون) أو «دورك تقرأ» (الشيخ يقرأ ثم سكوت يقرأ فيه الطفل)
// الآية الحالية ملوّنة، والضغط على أي آية يبدأ منها، والطفل يكمل من آخر موضع
type Phase = "idle" | "loading" | "playing" | "paused" | "turn" | "done";
const BASMALA = 0; // رقم «الآية» الخاص بالبسملة قبل الآية الأولى

function Chip({ on, onClick, children, label }: { on: boolean; onClick: () => void; children: React.ReactNode; label?: string }) {
  return (
    <button type="button" aria-pressed={on} aria-label={label} onClick={onClick}
      className={cn("h-11 rounded-full px-4 text-sm font-bold transition-colors", on ? "bg-hero text-white shadow-soft" : "bg-secondary text-secondary-foreground")}>
      {children}
    </button>
  );
}

export function QuranReader() {
  const [prefs, setPrefs] = useState<QuranPrefs>(loadPrefs);
  const [list, setList] = useState<SurahInfo[] | null>(null);
  const [ayahs, setAyahs] = useState<Ayah[] | null>(null);
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [current, setCurrent] = useState(prefs.ayah);
  const [left, setLeft] = useState(0); // عدّاد «دورك»
  const audio = useRef<HTMLAudioElement>(null);
  const step = useRef({ ayah: prefs.ayah, rep: 1 });
  const timer = useRef(0);
  const prefsRef = useRef(prefs);
  useEffect(() => { prefsRef.current = prefs; }, [prefs]);

  const reciter = RECITERS.find((r) => r.id === prefs.reciter) ?? RECITERS[0];
  const total = ayahs?.length ?? 0;
  const surahName = list?.find((s) => s.number === prefs.surah)?.name ?? "";

  const update = useCallback((patch: Partial<QuranPrefs>) => setPrefs((p) => { const next = { ...p, ...patch }; savePrefs(next); return next; }), []);

  useEffect(() => { surahList().then(setList).catch((e) => setError(e.message)); }, []);
  useEffect(() => {
    let alive = true;
    surahText(prefs.surah).then((a) => { if (alive) { setAyahs(a); setError(""); } }).catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [prefs.surah]);

  const stopTimer = () => { window.clearInterval(timer.current); timer.current = 0; };

  const play = useCallback((ayah: number, rep = 1) => {
    const a = audio.current, p = prefsRef.current;
    if (!a) return;
    stopTimer();
    step.current = { ayah, rep };
    setCurrent(ayah);
    if (ayah !== BASMALA) update({ ayah });
    const r = RECITERS.find((x) => x.id === p.reciter) ?? RECITERS[0];
    const folder = p.mode === "teacher" ? r.teacher : r.murattal;
    // البسملة = أول آية في الفاتحة بصوت نفس الشيخ
    const url = ayah === BASMALA ? ayahAudio(folder, 1, 1) : ayahAudio(folder, p.surah, ayah);
    // تكرار نفس الآية: إعادة تعيين نفس الرابط لا يعيد التشغيل في بعض المتصفحات، فنرجع لأولها
    if (a.src === url) a.currentTime = 0; else a.src = url;
    setPhase("loading");
    a.play().then(() => setPhase("playing")).catch(() => setPhase("paused"));
    // تجهيز الآية التالية مسبقًا حتى لا يتوقف الصوت بين الآيات
    const nextN = ayah + 1;
    if (ayahs && nextN <= ayahs.length) { const pre = new Audio(); pre.preload = "auto"; pre.src = ayahAudio(folder, p.surah, nextN); }
  }, [ayahs, update]);

  const advance = useCallback(() => {
    const { ayah, rep } = step.current, p = prefsRef.current;
    if (ayah !== BASMALA && rep < p.repeat) return play(ayah, rep + 1);
    if (ayah + 1 <= total) return play(ayah + 1);
    setPhase("done");
  }, [play, total]);

  const onEnded = () => {
    const p = prefsRef.current, a = audio.current;
    if (p.mode === "turn" && step.current.ayah !== BASMALA && a) {
      // دورك يا بطل: سكوت بطول الآية × المعامل
      let secs = Math.max(2, Math.ceil((Number.isFinite(a.duration) ? a.duration : 4) * p.pause));
      setLeft(secs); setPhase("turn");
      timer.current = window.setInterval(() => {
        secs -= 1; setLeft(secs);
        if (secs <= 0) { stopTimer(); advance(); }
      }, 1000);
      return;
    }
    advance();
  };

  const start = () => {
    const a = audio.current;
    if (phase === "playing" || phase === "loading") { a?.pause(); setPhase("paused"); return; }
    if (phase === "turn") { stopTimer(); setPhase("paused"); return; }
    if (phase === "paused" && a?.src && !a.ended && step.current.ayah === current) { a.play().then(() => setPhase("playing")).catch(() => {}); return; }
    // البداية: من البسملة لو أول السورة، وإلا من آخر موضع
    const from = phase === "done" ? 1 : current;
    play(from === 1 && hasBasmala(prefs.surah) ? BASMALA : from);
  };

  // تغيير السورة أو الشيخ أو الوضع يوقف التشغيل الحالي
  const change = (patch: Partial<QuranPrefs>) => {
    audio.current?.pause(); stopTimer(); setPhase("idle");
    if (patch.surah) { setAyahs(null); setCurrent(1); update({ ...patch, ayah: 1 }); } else update(patch);
  };

  useEffect(() => () => stopTimer(), []);
  // الآية الحالية في منتصف الشاشة أثناء التشغيل
  useEffect(() => {
    if (phase === "idle") return;
    document.querySelector(`[data-ayah="${current}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [current, phase]);

  const resume = useMemo(() => prefs.ayah > 1 && phase === "idle" && current === prefs.ayah, [prefs.ayah, phase, current]);
  const label = current === BASMALA ? "البسملة" : `آية ${arNum(current)} من ${arNum(total)}`;

  return (
    <div className="flex flex-col gap-4 pb-48">
      {/* خط المصحف العثماني */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Amiri+Quran&display=swap" precedence="default" />

      <div className="flex items-center gap-3">
        <Icon3D name="open-book" size={52} float />
        <div><h1 className="font-heading text-2xl font-extrabold">القرآن الكريم</h1><p className="text-sm text-muted-foreground">استمع واقرأ مع الشيخ</p></div>
      </div>

      <section aria-label="الاختيارات" className="flex flex-col gap-3 rounded-[28px] border bg-card p-4 shadow-soft">
        <label className="flex flex-col gap-1.5 text-sm font-bold">
          السورة
          <select value={prefs.surah} onChange={(e) => change({ surah: Number(e.target.value) })} aria-label="السورة"
            className="h-12 rounded-2xl border bg-background px-3 text-base">
            {(list ?? [{ number: prefs.surah, name: "…", ayahs: 0 }]).map((s) => <option key={s.number} value={s.number}>{arNum(s.number)}. {s.name}</option>)}
          </select>
        </label>
        <div role="group" aria-label="الشيخ" className="flex flex-wrap gap-2">
          {RECITERS.map((r) => <Chip key={r.id} on={prefs.reciter === r.id} onClick={() => change({ reciter: r.id })}>{r.short}</Chip>)}
          <span className="self-center text-xs text-muted-foreground">برواية حفص عن عاصم</span>
        </div>
        <div role="group" aria-label="الوضع" className="flex flex-wrap gap-2">
          <Chip on={prefs.mode === "teacher"} onClick={() => change({ mode: "teacher" })}>📖 المصحف المعلّم</Chip>
          <Chip on={prefs.mode === "turn"} onClick={() => change({ mode: "turn" })}>🎤 دورك تقرأ</Chip>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
          <span className="text-muted-foreground">تكرار الآية:</span>
          {([1, 2, 3] as const).map((n) => <Chip key={n} on={prefs.repeat === n} label={`تكرار ${n}`} onClick={() => update({ repeat: n })}>{arNum(n)}×</Chip>)}
        </div>
        {prefs.mode === "turn" && (
          <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
            <span className="text-muted-foreground">وقتك للقراءة:</span>
            {([[0.8, "قصير"], [1.2, "متوسط"], [1.6, "طويل"]] as const).map(([v, l]) => <Chip key={v} on={prefs.pause === v} onClick={() => update({ pause: v })}>{l}</Chip>)}
          </div>
        )}
      </section>

      {resume && (
        <div className="flex flex-wrap items-center gap-2 rounded-[24px] bg-gold/15 p-3 font-bold">
          <span className="flex-1">نكمل من آية {arNum(prefs.ayah)}؟</span>
          <button type="button" onClick={() => play(prefs.ayah)} className="h-10 rounded-full bg-gold px-4 text-[#3D2600]">كمّل</button>
          <button type="button" onClick={() => { setCurrent(1); update({ ayah: 1 }); }} className="h-10 rounded-full bg-secondary px-4">من الأول</button>
        </div>
      )}

      {error && <p role="alert" className="rounded-[24px] border bg-card p-4 text-center font-bold text-destructive">{error}</p>}

      <article aria-label={`سورة ${surahName}`} dir="rtl" className="rounded-[28px] border bg-card p-5 shadow-soft">
        <h2 className="mb-4 text-center font-heading text-2xl font-extrabold text-gold">سورة {surahName.replace(/^سُورَةُ\s*/, "")}</h2>
        {!ayahs ? <div className="grid gap-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 rounded-xl" />)}</div> : (
          <div className="text-justify text-[1.7rem] leading-[2.6] md:text-[2rem]" style={{ fontFamily: "'Amiri Quran', 'Amiri', serif" }}>
            {hasBasmala(prefs.surah) && (
              <p data-ayah={BASMALA} onClick={() => play(BASMALA)} className={cn("mb-2 cursor-pointer rounded-xl text-center transition-colors", current === BASMALA && phase !== "idle" && "bg-gold/20")}>
                بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
              </p>
            )}
            {ayahs.map((a) => (
              <span key={a.n} data-ayah={a.n} role="button" tabIndex={0} aria-label={`آية ${a.n}`} aria-current={a.n === current && phase !== "idle" ? "true" : undefined}
                onClick={() => play(a.n)} onKeyDown={(e) => e.key === "Enter" && play(a.n)}
                className={cn("cursor-pointer rounded-lg px-0.5 transition-colors", a.n === current && phase !== "idle" ? "bg-gold/25 text-foreground" : "hover:bg-secondary/60")}>
                {a.text} <span className="mx-1 text-gold">﴿{arNum(a.n)}﴾</span>{" "}
              </span>
            ))}
          </div>
        )}
      </article>

      {phase === "done" && <p role="status" className="rounded-[24px] bg-gold/15 p-4 text-center font-heading text-xl font-extrabold">ما شاء الله تبارك الله! وصلتَ إلى آخر سورة {surahName.replace(/^سُورَةُ\s*/, "")} 🌟</p>}

      {/* شريط التشغيل فوق شريط التنقل */}
      <div className="fixed inset-x-3 bottom-24 z-30 mx-auto flex max-w-md items-center gap-3 rounded-[28px] border bg-card/95 p-3 shadow-soft backdrop-blur">
        <button type="button" aria-label="الآية السابقة" disabled={!ayahs || current <= 1} onClick={() => play(Math.max(1, current - 1))} className="grid size-11 place-items-center rounded-full bg-secondary disabled:opacity-40"><SkipForward className="size-5" /></button>
        <button type="button" aria-label={phase === "playing" || phase === "turn" || phase === "loading" ? "إيقاف" : "تشغيل"} disabled={!ayahs} onClick={start}
          className="grid size-14 place-items-center rounded-full bg-hero text-white shadow-soft disabled:opacity-50">
          {phase === "loading" ? <Loader2 className="size-6 animate-spin" /> : phase === "playing" || phase === "turn" ? <Pause className="size-6" /> : <Play className="size-6" />}
        </button>
        <button type="button" aria-label="الآية التالية" disabled={!ayahs || current >= total} onClick={() => play(Math.min(total, current + 1))} className="grid size-11 place-items-center rounded-full bg-secondary disabled:opacity-40"><SkipBack className="size-5" /></button>
        <div className="min-w-0 flex-1 text-sm">
          {phase === "turn" ? (
            <p role="status" className="flex items-center gap-1 font-heading text-base font-extrabold text-gold"><Mic className="size-5" /> دورك يا بطل! {arNum(left)}</p>
          ) : (
            <><p className="truncate font-bold">{reciter.name}</p><p className="text-muted-foreground">{ayahs ? label : "…"}</p></>
          )}
        </div>
      </div>
      <audio ref={audio} preload="auto" onEnded={onEnded} onError={() => { if (phase !== "idle") { setPhase("paused"); setError("تعذّر تحميل الآية، تأكد من الإنترنت ثم اضغط تشغيل"); } }} onPlaying={() => setError("")} />
    </div>
  );
}
