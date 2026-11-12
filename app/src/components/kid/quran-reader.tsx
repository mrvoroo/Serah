"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Loader2, Mic, Pause, Play, RotateCw, SkipBack, SkipForward } from "lucide-react";
import { Icon3D } from "@/components/icon3d";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RECITERS, arNum, ayahAudio, fixMode, hasBasmala, loadPrefs, savePrefs, surahList, surahText,
  type Ayah, type QuranPrefs, type SurahInfo,
} from "@/lib/quran";
import { cn } from "@/lib/utils";
import { SurahName } from "@/components/religious-text";
import { g } from "@/lib/kid-text";

// القرآن للأطفال: المصحف المعلّم (الشيخ يقرأ والأطفال يرددون) أو «دورك تقرأ» (الشيخ يقرأ ثم سكوت يقرأ فيه الطفل)
// السورة الطويلة تُعرض صفحة صفحة كما في مصحف المدينة، والآية التي يقرؤها الشيخ مظللة وباقي الصفحة أخفت حتى لا يتشتت الطفل،
// والضغط على أي آية يبدأ منها، والطفل يكمل من آخر آية وصفحة
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

// Enter أو مسافة على عنصر يعمل كزر
const pressKey = (fn: () => void) => (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } };

// staff: شاشة المعلمات — قراءة واستماع بتلاوة الحصري أو المنشاوي المرتّلة، بنفس التنقل بالصفحات والآيات، بدون أوضاع الأطفال
export function QuranReader({ staff = false }: { staff?: boolean } = {}) {
  const [prefs, setPrefs] = useState<QuranPrefs>(() => loadPrefs(staff));
  const [list, setList] = useState<SurahInfo[] | null>(null);
  const [ayahs, setAyahs] = useState<Ayah[] | null>(null);
  const [listError, setListError] = useState("");
  const [textError, setTextError] = useState("");
  const [audioError, setAudioError] = useState("");
  const [retry, setRetry] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [current, setCurrent] = useState(prefs.ayah);
  // الصفحة التي فتحها الطفل بنفسه (null = صفحة الآية الحالية)
  const [manualPage, setManualPage] = useState<number | null>(prefs.page || null);
  const [showSettings, setShowSettings] = useState(false);
  const [left, setLeft] = useState(0); // عدّاد «دورك»
  const audio = useRef<HTMLAudioElement>(null);
  const step = useRef({ ayah: prefs.ayah, rep: 1 });
  const timer = useRef(0);
  const prefsRef = useRef(prefs);
  useEffect(() => { prefsRef.current = prefs; }, [prefs]);

  const reciter = RECITERS.find((r) => r.id === prefs.reciter) ?? RECITERS[0];
  const total = ayahs?.length ?? 0;
  const surahName = (list?.find((s) => s.number === prefs.surah)?.name ?? "").replace(/^سُورَةُ\s*/, "");
  const active = phase !== "idle";

  // صفحات السورة في المصحف
  const pages = useMemo(() => [...new Set((ayahs ?? []).map((a) => a.page))].filter(Boolean), [ayahs]);
  const pageOf = useCallback((n: number) => ayahs?.find((a) => a.n === Math.max(1, n))?.page ?? 0, [ayahs]);
  const shownPage = manualPage && pages.includes(manualPage) ? manualPage : pageOf(current) || pages[0] || 0;
  const pageIndex = Math.max(0, pages.indexOf(shownPage));
  const shown = pages.length > 1 ? (ayahs ?? []).filter((a) => a.page === shownPage) : ayahs ?? [];

  const update = useCallback((patch: Partial<QuranPrefs>) => setPrefs((p) => { const next = { ...p, ...patch }; savePrefs(next, staff); return next; }), [staff]);

  useEffect(() => { surahList().then((l) => { setList(l); setListError(""); }).catch((e) => setListError(e.message)); }, [retry]);
  useEffect(() => {
    let alive = true;
    surahText(prefs.surah).then((a) => { if (alive) { setAyahs(a); setTextError(""); } }).catch((e) => alive && setTextError(e.message));
    return () => { alive = false; };
  }, [prefs.surah, retry]);

  const stopTimer = () => { window.clearInterval(timer.current); timer.current = 0; };

  const play = useCallback((ayah: number, rep = 1) => {
    const a = audio.current, p = prefsRef.current;
    if (!a) return;
    stopTimer();
    step.current = { ayah, rep };
    setCurrent(ayah);
    setManualPage(null); // الصفحة تتبع الشيخ وتُقلب وحدها
    if (ayah !== BASMALA) update({ ayah, page: ayahs?.find((x) => x.n === ayah)?.page ?? 0 });
    const r = RECITERS.find((x) => x.id === p.reciter) ?? RECITERS[0];
    const folder = p.mode === "teacher" && r.muallim ? r.teacher : r.murattal;
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
    // ختم السورة: المرة القادمة تبدأ من أولها
    setPhase("done");
    update({ ayah: 1, page: 0 });
  }, [play, total, update]);

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
    if (phase === "paused" && a?.src && step.current.ayah === current) {
      // إيقاف أثناء «دورك»: الشيخ انتهى من الآية، فنكمل للتالية بدل إعادتها
      if (a.ended) { advance(); return; }
      a.play().then(() => setPhase("playing")).catch(() => {}); return;
    }
    // البداية: من البسملة لو أول السورة، أو من أول الصفحة المفتوحة، وإلا من آخر موضع
    const first = shown[0]?.n ?? 1;
    const from = phase === "done" ? 1 : manualPage && pageOf(current) !== shownPage ? first : current;
    play(from === 1 && hasBasmala(prefs.surah) ? BASMALA : from);
  };

  // تغيير السورة أو الشيخ أو الوضع يوقف التشغيل الحالي
  const change = (patch: Partial<QuranPrefs>) => {
    audio.current?.pause(); stopTimer(); setPhase("idle");
    if (!staff && patch.reciter && fixMode({ ...prefs, ...patch }).mode !== (patch.mode ?? prefs.mode)) patch = { ...patch, mode: "turn" };
    if (patch.surah) { setAyahs(null); setCurrent(1); setManualPage(null); update({ ...patch, ayah: 1, page: 0 }); } else update(patch);
  };

  // تقليب الصفحة باليد: نحفظها حتى يرجع الطفل لنفس الوجه
  const turnPage = (dir: 1 | -1) => {
    const next = pages[pageIndex + dir];
    if (!next) return;
    setManualPage(next);
    update({ page: next });
    document.getElementById("quran-page")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => () => stopTimer(), []);
  // الآية الحالية في منتصف الشاشة أثناء التشغيل
  useEffect(() => {
    if (!active) return;
    document.querySelector(`[data-ayah="${current}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [current, active]);

  const resume = prefs.ayah > 1 && phase === "idle" && current === prefs.ayah;
  const label = current === BASMALA ? "البسملة" : `آية ${arNum(current)} من ${arNum(total)}`;
  const error = textError || audioError || (listError && !list ? listError : "");
  const now = (n: number) => active && phase !== "done" && n === current;

  return (
    <div className="flex flex-col gap-4 pb-48">
      {/* خط المصحف العثماني */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Amiri+Quran&display=swap" precedence="default" />

      <div className="flex items-center gap-3">
        <Icon3D name="open-book" size={44} float />
        <div><h1 className="font-heading text-2xl font-extrabold">القرآن الكريم</h1><p className="text-sm text-muted-foreground">{staff ? "قراءة واستماع بتلاوة مرتّلة" : g("استمع واقرأ مع الشيخ", "استمعي واقرئي مع الشيخ")}</p></div>
      </div>

      <section aria-label="الاختيارات" className="flex flex-col gap-3 rounded-[28px] border bg-card p-3 shadow-soft">
        <div className="flex items-end gap-2">
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm font-bold">
            السورة
            <select value={prefs.surah} onChange={(e) => change({ surah: Number(e.target.value) })} aria-label="السورة"
              className="h-12 rounded-2xl border bg-background px-3 text-base">
              {(list ?? [{ number: prefs.surah, name: surahName || "…", ayahs: 0 }]).map((s) => <option key={s.number} value={s.number}>{arNum(s.number)}. {s.name}</option>)}
            </select>
          </label>
          <button type="button" aria-expanded={showSettings} aria-controls="quran-settings" onClick={() => setShowSettings((v) => !v)}
            className="flex h-12 shrink-0 items-center gap-1 rounded-2xl bg-secondary px-3 text-sm font-bold">
            إعدادات التلاوة <ChevronDown className={cn("size-4 transition-transform", showSettings && "rotate-180")} />
          </button>
        </div>
        {!showSettings && (
          <p className="text-xs text-muted-foreground">
            {reciter.short} · {prefs.mode === "listen" ? "تلاوة مرتّلة" : prefs.mode === "teacher" ? "المصحف المعلّم" : g("دورك تقرأ", "دورك تقرئي")}{prefs.repeat > 1 ? ` · تكرار ${arNum(prefs.repeat)}×` : ""}
          </p>
        )}
        {showSettings && (
          <div id="quran-settings" className="flex flex-col gap-3">
            <div role="group" aria-label="الشيخ" className="flex flex-wrap gap-2">
              {RECITERS.map((r) => <Chip key={r.id} on={prefs.reciter === r.id} onClick={() => change({ reciter: r.id })}>{r.short}</Chip>)}
              <span className="self-center text-xs text-muted-foreground">برواية حفص عن عاصم</span>
            </div>
            {!staff && <><div role="group" aria-label="الوضع" className="flex flex-wrap gap-2">
              {reciter.muallim && <Chip on={prefs.mode === "teacher"} onClick={() => change({ mode: "teacher" })}>📖 المصحف المعلّم</Chip>}
              <Chip on={prefs.mode === "turn"} onClick={() => change({ mode: "turn" })}>🎤 {g("دورك تقرأ", "دورك تقرئي")}</Chip>
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
            )}</>}
          </div>
        )}
      </section>

      {resume && (
        <div className="flex flex-wrap items-center gap-2 rounded-[24px] bg-gold/15 p-3 font-bold">
          <span className="flex-1">نكمل من آية {arNum(prefs.ayah)}{prefs.page ? ` (صفحة ${arNum(prefs.page)})` : ""}؟</span>
          <button type="button" onClick={() => play(prefs.ayah)} className="h-10 rounded-full bg-gold px-4 text-[#3D2600]">كمّل</button>
          <button type="button" onClick={() => { setCurrent(1); setManualPage(null); update({ ayah: 1, page: 0 }); }} className="h-10 rounded-full bg-secondary px-4">من الأول</button>
        </div>
      )}

      {error && (
        <div role="alert" className="flex flex-col items-center gap-2 rounded-[24px] border bg-card p-4 text-center font-bold text-destructive">
          {error}
          {(textError || (listError && !list)) && (
            <button type="button" onClick={() => { setTextError(""); setListError(""); setRetry((n) => n + 1); }}
              className="flex h-10 items-center gap-1 rounded-full bg-secondary px-4 text-foreground"><RotateCw className="size-4" /> {g("حاول مرة أخرى", "حاولي مرة أخرى")}</button>
          )}
        </div>
      )}

      <article id="quran-page" aria-label={`سورة ${surahName}`} dir="rtl" className="scroll-mt-4 rounded-[28px] border bg-card p-5 shadow-soft">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="font-heading text-2xl font-extrabold">سورة <SurahName name={surahName} className="text-[1.25em]" /></h2>
          {shownPage > 0 && <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold">صفحة {arNum(shownPage)}</span>}
        </div>
        {!ayahs ? (textError ? null : <div className="grid gap-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 rounded-xl" />)}</div>) : (
          <div className="text-justify text-[1.7rem] leading-[2.6] md:text-[2rem]" style={{ fontFamily: "'Amiri Quran', 'Amiri', serif" }}>
            {hasBasmala(prefs.surah) && shown[0]?.n === 1 && (
              <p data-ayah={BASMALA} role="button" tabIndex={0} aria-label="البسملة" aria-current={now(BASMALA) ? "true" : undefined}
                onClick={() => play(BASMALA)} onKeyDown={pressKey(() => play(BASMALA))}
                className={cn("mb-2 cursor-pointer rounded-xl text-center transition-all duration-300",
                  now(BASMALA) ? "bg-gold/30 ring-2 ring-gold/70" : active && phase !== "done" && "opacity-45")}>
                بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
              </p>
            )}
            {shown.map((a) => (
              <span key={a.n} data-ayah={a.n} role="button" tabIndex={0} aria-label={`آية ${a.n}`} aria-current={now(a.n) ? "true" : undefined}
                onClick={() => play(a.n)} onKeyDown={pressKey(() => play(a.n))}
                className={cn("cursor-pointer rounded-lg px-0.5 transition-all duration-300 [box-decoration-break:clone]",
                  now(a.n) ? "bg-gold/30 text-foreground ring-2 ring-gold/70" : active && phase !== "done" ? "opacity-45" : "hover:bg-secondary/60")}>
                {a.text} <span className="mx-1 text-gold">﴿{arNum(a.n)}﴾</span>{" "}
              </span>
            ))}
          </div>
        )}
        {pages.length > 1 && (
          <nav aria-label="صفحات السورة" className="mt-5 flex items-center justify-between gap-2 border-t pt-4">
            <button type="button" aria-label="الصفحة السابقة" onClick={() => turnPage(-1)} disabled={pageIndex === 0}
              className="flex h-11 items-center gap-1 rounded-full bg-secondary px-4 text-sm font-bold disabled:opacity-40"><ChevronRight className="size-4" /> السابقة</button>
            <span className="text-sm font-bold text-muted-foreground">{arNum(pageIndex + 1)} / {arNum(pages.length)}</span>
            <button type="button" aria-label="الصفحة التالية" onClick={() => turnPage(1)} disabled={pageIndex >= pages.length - 1}
              className="flex h-11 items-center gap-1 rounded-full bg-secondary px-4 text-sm font-bold disabled:opacity-40">التالية <ChevronLeft className="size-4" /></button>
          </nav>
        )}
      </article>

      {phase === "done" && <p role="status" className="rounded-[24px] bg-gold/15 p-4 text-center font-heading text-xl font-extrabold">ما شاء الله تبارك الله! وصلنا إلى آخر سورة <SurahName name={surahName} /> 🌟</p>}

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
            <p role="status" className="flex items-center gap-1 font-heading text-base font-extrabold text-gold"><Mic className="size-5" /> {g("دورك يا بطل!", "دورك يا بطلة!")} {arNum(left)}</p>
          ) : (
            <><p className="truncate font-bold">{reciter.name}</p><p className="text-muted-foreground">{ayahs ? label : "…"}</p></>
          )}
        </div>
      </div>
      <audio ref={audio} preload="auto" onEnded={onEnded} onError={() => { if (phase !== "idle") { setPhase("paused"); setAudioError(g("تعذّر تحميل الآية، تأكد من الإنترنت ثم اضغط تشغيل", "تعذّر تحميل الآية، تأكدي من الإنترنت ثم اضغطي تشغيل")); } }} onPlaying={() => setAudioError("")} />
    </div>
  );
}
