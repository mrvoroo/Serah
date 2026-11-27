"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpenText, ChevronsDown, Hand, Sparkles } from "lucide-react";
import type { ProphetContent } from "@/content/prophets";
import type { ProphetStory as Story, StoryMood } from "@/content/prophet-stories";
import { useSceneTier } from "@/lib/tier";
import { createStoryFx, type StoryFx } from "@/lib/scenes/story-fx";
import { arNum } from "@/lib/quran";
import { cn } from "@/lib/utils";
import { RT } from "@/components/religious-text";
import { g } from "@/lib/kid-text";

// قصة النبي بالسكرول: مشهد واقعي ثابت خلف الكلام، يتغير مع كل فقرة (صورة + جو + حركة)،
// وفيه حاجات يلمسها الطفل. النصوص كلها من المحتوى المراجَع شرعيًا (content.more).
type World = { morph: (id: string) => void; setMood?: (m: StoryMood) => void; dispose: () => void };
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const GOLD = ["#ffe7a3", "#ffd06b", "#ffb93f", "#fff3d1"];
const CLAY = ["#b07a52", "#d9a77a", "#8a5a3a", "#f0d2b0"];
// صوت «صلصلة» الطين الناشف: نقرة فخار قصيرة مولّدة (بدون ملفات صوت)
let audio: AudioContext | null = null;
function clink() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    audio ??= new AC();
    const t = audio.currentTime, out = audio.createGain();
    out.gain.value = 0.22; out.connect(audio.destination);
    // ترددات غير متناسقة = صوت فخار مش جرس
    [[1180, 0.18], [1760, 0.12], [2690, 0.08], [3910, 0.05]].forEach(([f, d], i) => {
      const o = audio!.createOscillator(), gn = audio!.createGain();
      o.type = "sine"; o.frequency.value = f * (0.97 + Math.random() * 0.06);
      gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(1 / (i + 1), t + 0.004); gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(gn); gn.connect(out); o.start(t); o.stop(t + d + 0.02);
    });
  } catch { /* الصوت اختياري */ }
}
// أماكن النقاط الذهبية حول الشجرة (نسبة من عرض/ارتفاع المشهد)
const ORBS: [number, number][] = [[34, 30], [62, 26], [48, 18], [28, 50], [70, 46], [52, 40]];
// وقت يكفي لقراءة آية الدعاء بتأنٍّ (ملاحظة الشيخ)
const HOLD_MS = 6500;
// ارتفاع المشهد = الشاشة ناقص الهيدر وشريط التنقل والمنطقة الآمنة تحت (آيفون)
const STAGE_H = "h-[max(380px,calc(100svh-11.5rem-env(safe-area-inset-bottom)))]";

export function ProphetStory({ id, content, story, title }: { id: string; content: ProphetContent; story: Story; title: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const fxCanvas = useRef<HTMLCanvasElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const world = useRef<World | null>(null);
  const fx = useRef<StoryFx | null>(null);
  const chapterEls = useRef<(HTMLElement | null)[]>([]);
  const [active, setActive] = useState(0);
  // متصفح قديم من غير IntersectionObserver: كل الفقرات ظاهرة بالكامل
  const [noIO] = useState(() => typeof window !== "undefined" && !window.IntersectionObserver);
  const [failed, setFailed] = useState(false);
  const [found, setFound] = useState<number[]>([]);
  const [held, setHeld] = useState(false);
  const [touched, setTouched] = useState(false);
  const tier = useSceneTier();
  const lite = tier === "low" || tier === "static";
  const ch = story.chapters;
  const cur = ch[active];
  const activeRef = useRef(0);
  const heldRef = useRef(false);
  const holdIdx = ch.findIndex((c) => c.interact === "hold");

  const applyMood = useCallback((k: number) => {
    const c = ch[k];
    world.current?.morph(`s${c.img}`);
    world.current?.setMood?.(c.interact === "hold" && heldRef.current && c.moodAfter ? c.moodAfter : c.mood);
    fx.current?.leaves(!!c.leaves);
  }, [ch]);

  // المشهد الواقعي (نفس محرك صور المشهد)
  useEffect(() => {
    if (!tier) return;
    let disposed = false;
    import("@/lib/scenes/image-scene.js").then(({ createImageScene }) => {
      if (disposed || !canvas.current) return;
      const w = createImageScene(canvas.current, {
        id, tier, initial: ch[activeRef.current].img,
        // صورة فشلت: الصورة العادية مكان المشهد، ونوقف الرسم تحتها
        onFail: () => { if (!disposed) { setFailed(true); world.current?.dispose(); world.current = null; } },
      }) as World | null;
      if (!w) { setFailed(true); return; }
      if (disposed) { w.dispose(); return; }
      world.current = w;
      applyMood(activeRef.current);
    }).catch(() => setFailed(true));
    return () => { disposed = true; world.current?.dispose(); world.current = null; };
  }, [id, tier, ch, applyMood]);

  // طبقة الشرر والأوراق (مش لازمة لو الحركة مقفولة)
  useEffect(() => {
    if (!fxCanvas.current || !tier || tier === "static") return;
    const f = createStoryFx(fxCanvas.current, { lite: tier === "low" });
    fx.current = f;
    f.leaves(!!ch[activeRef.current].leaves);
    return () => { f.dispose(); fx.current = null; };
  }, [tier, ch]);

  // أي فقرة في منتصف الشاشة الآن
  useEffect(() => {
    if (!window.IntersectionObserver) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const k = Number((e.target as HTMLElement).dataset.k);
        if (k !== activeRef.current) { activeRef.current = k; setActive(k); applyMood(k); }
      }
    }, { rootMargin: "-48% 0px -48% 0px" });
    chapterEls.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [applyMood]);

  const local = (x: number, y: number) => {
    const r = stage.current!.getBoundingClientRect();
    return [x - r.left, y - r.top] as const;
  };
  // onClick (مش pointerdown): سحب السكرول على المشهد ما يطلّعش شرر
  const onStageTap = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    setTouched(true);
    const [x, y] = local(e.clientX, e.clientY);
    if (cur.interact === "clink") clink();
    fx.current?.burst(x, y, cur.interact === "earth" && story.earth ? story.earth : cur.interact === "clink" ? CLAY : GOLD, cur.interact === "earth" ? 34 : 18);
  };
  const onOrb = (k: number, e: React.MouseEvent<HTMLButtonElement>) => {
    setTouched(true);
    // من لوحة المفاتيح مفيش مكان ضغط: نستخدم منتصف النقطة
    const b = e.currentTarget.getBoundingClientRect();
    const [x, y] = e.detail === 0 ? local(b.left + b.width / 2, b.top + b.height / 2) : local(e.clientX, e.clientY);
    fx.current?.burst(x, y, GOLD, 30);
    setFound((f) => (f.includes(k) ? f : [...f, k]));
  };

  // الضغط المطوّل للتوبة: الطفل يقرأ الدعاء وهو ضاغط، وبعدها النور ينزل
  const holdRaf = useRef(0);
  const holdStart = useRef(0);
  const setBar = (k: number) => { if (bar.current) bar.current.style.transform = `scaleX(${k})`; };
  const finishHold = useCallback(() => {
    heldRef.current = true; setHeld(true); setBar(1);
    const c = ch[holdIdx];
    if (c?.moodAfter && activeRef.current === holdIdx) world.current?.setMood?.(c.moodAfter);
    const r = stage.current?.getBoundingClientRect();
    if (r) for (let i = 0; i < 4; i++) fx.current?.burst(r.width * (0.35 + i * 0.1), r.height * 0.12, GOLD, 22, { down: true });
  }, [ch, holdIdx]);
  const holdDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (heldRef.current || holdRaf.current || !e.isPrimary || e.button !== 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    holdStart.current = performance.now();
    const step = () => {
      const k = Math.min(1, (performance.now() - holdStart.current) / HOLD_MS);
      setBar(k);
      if (k >= 1) { holdRaf.current = 0; finishHold(); return; }
      holdRaf.current = requestAnimationFrame(step);
    };
    holdRaf.current = requestAnimationFrame(step);
  };
  const holdUp = () => { if (holdRaf.current) { cancelAnimationFrame(holdRaf.current); holdRaf.current = 0; } if (!heldRef.current) setBar(0); };
  useEffect(() => () => { if (holdRaf.current) cancelAnimationFrame(holdRaf.current); }, []);

  const hint = cur.interact === "earth" ? g("المس التراب وشوف ألوان الأرض", "المسي التراب وشوفي ألوان الأرض")
    : cur.interact === "clink" ? g("انقر على الطين الناشف واسمع صوته", "انقري على الطين الناشف واسمعي صوته")
    : cur.interact === "names" ? g("المس النقط الذهبية", "المسي النقط الذهبية")
    : null;
  const names = story.names ?? [];
  const holdText = g("اقرأ دعاء سيدنا آدم عليه السلام، واضغط مطوّلًا", "اقرئي دعاء سيدنا آدم عليه السلام، واضغطي مطوّلًا");
  const glass = lite ? "bg-[#120d33]/90" : "bg-[#120d33]/72 backdrop-blur-md";
  const chip = lite ? "bg-black/55" : "bg-black/35 backdrop-blur";

  return (
    <section aria-label={title} className="relative -mx-4 flex flex-col gap-3 sm:mx-0">
      {/* النبذة المراجَعة: مقدمة قصيرة قبل القصة */}
      <div className="mx-3 rounded-3xl border bg-card p-4 shadow-soft sm:mx-0">
        <h2 className="mb-1 flex items-center gap-2 font-heading text-lg font-extrabold"><BookOpenText className="size-5 text-gold" /> {title}</h2>
        <p className="text-base leading-8"><RT text={content.summary} /></p>
      </div>

      {/* حدود الـ sticky = الفقرات بس، فالمشهد يسيب الشاشة مع آخر فقرة */}
      <div className="relative">
        <div ref={stage} onClick={onStageTap}
          className={cn("sticky top-[5.25rem] z-0 overflow-hidden bg-[#120d33] shadow-soft sm:rounded-[32px]", STAGE_H)}>
          <canvas ref={canvas} aria-hidden className="absolute inset-0 size-full" />
          {failed && /^[a-z_]+$/.test(id) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`${BASE}/scenes/${id}/${cur.img + 1}-960.webp`} alt="" className="absolute inset-0 size-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
          )}
          <canvas ref={fxCanvas} aria-hidden className="pointer-events-none absolute inset-0 size-full" />
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[#0d0926]/85 to-transparent" />

          <div aria-hidden className="pointer-events-none absolute inset-x-3 top-3 flex items-center justify-between text-white">
            <span className={cn("rounded-full px-3 py-1 text-xs font-bold", chip)}>{arNum(active + 1)} / {arNum(ch.length)}</span>
            <span key={active} className={cn("rounded-full px-3 py-1 font-heading text-sm font-extrabold text-gold motion-safe:animate-in motion-safe:fade-in", chip)}>{cur.label}</span>
          </div>
          <div aria-hidden className="pointer-events-none absolute end-2 top-1/2 flex -translate-y-1/2 flex-col gap-1.5">
            {ch.map((_, k) => <span key={k} className={cn("w-1.5 rounded-full motion-safe:transition-all motion-safe:duration-500", k === active ? "h-6 bg-gold" : k < active ? "h-1.5 bg-gold/60" : "h-1.5 bg-white/35")} />)}
          </div>

          {/* الأسماء: نقاط ذهبية يلمسها الطفل فيظهر اسم شيء (أمثلة) */}
          {cur.interact === "names" && ORBS.slice(0, names.length).map(([x, y], k) => (
            <button key={k} type="button" onClick={(e) => onOrb(k, e)} aria-label={found.includes(k) ? names[k] : g("نقطة ذهبية، المسها", "نقطة ذهبية، المسيها")}
              style={{ left: `${x}%`, top: `${y}%` }}
              className="absolute z-10 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center [-webkit-tap-highlight-color:transparent]">
              <span aria-hidden className={cn("block rounded-full bg-[radial-gradient(circle,#fff6d6_0%,#ffcf5a_45%,rgba(255,180,60,0)_72%)] motion-safe:transition-all motion-safe:duration-500",
                found.includes(k) ? "size-5 opacity-70" : "size-7 motion-safe:animate-pulse")} />
              {found.includes(k) && (
                <span aria-hidden className={cn("absolute top-full mt-0.5 whitespace-nowrap rounded-full px-2.5 py-0.5 font-ruqaa text-lg text-[#ffe3a0] motion-safe:animate-in motion-safe:zoom-in-50", chip)}>{names[k]}</span>
              )}
            </button>
          ))}

          {hint && !touched && (
            <span aria-hidden className="pointer-events-none absolute inset-x-0 top-14 mx-auto flex w-fit items-center gap-1 rounded-full bg-gold px-3 py-1.5 text-sm font-extrabold text-[#3D2600] shadow-soft motion-safe:animate-bounce">
              <Hand className="size-4" /> {hint}
            </span>
          )}
          <span role="status" aria-live="polite" className={cn("pointer-events-none absolute inset-x-0 top-14 mx-auto w-fit max-w-[90%] rounded-full px-3 py-1 text-center text-xs font-bold text-white",
            cur.interact === "names" && found.length > 0 ? chip : "sr-only")}>
            {cur.interact === "names" && found.length > 0 ? (found.length < names.length ? `${arNum(found.length)} من ${arNum(names.length)}` : "هذه أمثلة قليلة… وعلّم الله سيدنا آدم الأسماء كلها ✨") : ""}
          </span>
        </div>

        {/* الفقرات: تمر فوق المشهد بالسكرول (الهامش السالب = ارتفاع المشهد) */}
        <div className="pointer-events-none relative z-10 -mt-[max(380px,calc(100svh-11.5rem-env(safe-area-inset-bottom)))]">
          {ch.map((c, k) => (
            <article key={k} data-k={k} ref={(el) => { chapterEls.current[k] = el; }} className={cn("flex flex-col justify-end px-3 pb-4", STAGE_H)}>
              <div className={cn("pointer-events-auto mx-auto w-full max-w-xl rounded-3xl border border-white/10 p-4 text-white shadow-soft motion-safe:transition-opacity motion-safe:duration-700 [&_.surah-name]:text-[#ffd77a]",
                glass, noIO || k === active ? "opacity-100" : "opacity-40")}>
                <h3 className="mb-1 font-heading text-lg font-extrabold text-gold">{c.label}</h3>
                <p className="text-base leading-8 text-white/92"><RT text={c.text ?? (c.more != null ? content.more[c.more] : "")} /></p>
                {c.ref && <p className="mt-1 text-xs text-white/60">المرجع: <RT text={c.ref} /></p>}
                {c.interact === "hold" && (
                  <div className="mt-3 flex flex-col items-center gap-2">
                    <button type="button" aria-disabled={held}
                      onPointerDown={holdDown} onPointerUp={holdUp} onPointerCancel={holdUp} onLostPointerCapture={holdUp}
                      onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !heldRef.current) { e.preventDefault(); finishHold(); } }}
                      onContextMenu={(e) => e.preventDefault()}
                      className="relative min-h-12 w-full max-w-xs touch-none select-none overflow-hidden rounded-full bg-white/12 px-3 py-2 font-bold text-white [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none]">
                      <span ref={bar} aria-hidden className="absolute inset-0 origin-right bg-gradient-to-l from-[#ffd06b] to-[#ffb93f]" style={{ transform: held ? "scaleX(1)" : "scaleX(0)" }} />
                      <span className={cn("relative flex items-center justify-center gap-1.5", held && "text-[#3D2600]")}>
                        {held ? <><Sparkles className="size-4" /> <RT text="﴿فَتَابَ عَلَيْهِ﴾" /></> : <><Hand className="size-4 shrink-0" /> <span className="text-sm leading-5">{holdText}</span></>}
                      </span>
                    </button>
                    {held && (
                      <p className="text-center text-sm leading-7 text-white/85 motion-safe:animate-in motion-safe:fade-in">
                        والله يقبل توبة من يتوب: <RT text="﴿وَهُوَ الَّذِي يَقْبَلُ التَّوْبَةَ عَنْ عِبَادِهِ﴾" /> <span className="text-xs text-white/60">(<RT text="الشورى: ٢٥" />)</span>
                      </p>
                    )}
                  </div>
                )}
                {k === 0 && <p className="mt-2 flex items-center justify-center gap-1 text-xs text-white/60"><ChevronsDown className="size-4 motion-safe:animate-bounce" /> {g("انزل علشان تكمل القصة", "انزلي علشان تكملي القصة")}</p>}
              </div>
            </article>
          ))}
        </div>
      </div>

      {(story.footer?.length || content.refs.length > 0) && (
        <div className="mx-3 rounded-3xl border bg-card p-4 text-sm leading-7 text-muted-foreground shadow-soft sm:mx-0">
          {story.footer?.map((k) => <p key={k}><RT text={content.more[k]} /></p>)}
          {content.refs.length > 0 && <p className="mt-1 text-xs leading-6">المراجع: {content.refs.map((r, i) => <span key={i}>{i > 0 && " · "}<RT text={r} /></span>)}</p>}
        </div>
      )}
    </section>
  );
}
