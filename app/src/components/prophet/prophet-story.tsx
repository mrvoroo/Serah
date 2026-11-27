"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronsDown, Hand, Sparkles } from "lucide-react";
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
// أماكن النقاط الذهبية حول الشجرة (نسبة من عرض/ارتفاع المشهد)
const ORBS: [number, number][] = [[34, 30], [62, 26], [48, 18], [28, 50], [70, 46], [52, 40]];
// وقت يكفي لقراءة آية الدعاء بتأنٍّ (ملاحظة الشيخ)
const HOLD_MS = 6500;

export function ProphetStory({ id, content, story, title }: { id: string; content: ProphetContent; story: Story; title: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const fxCanvas = useRef<HTMLCanvasElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const world = useRef<World | null>(null);
  const fx = useRef<StoryFx | null>(null);
  const chapterEls = useRef<(HTMLElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState(false);
  const [found, setFound] = useState<number[]>([]);
  const [held, setHeld] = useState(false);
  const [hold, setHold] = useState(0); // نسبة الضغط المطوّل
  const [touched, setTouched] = useState(false);
  const tier = useSceneTier();
  const ch = story.chapters;
  const cur = ch[active];
  const activeRef = useRef(0);
  const heldRef = useRef(false);

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
      const w = createImageScene(canvas.current, { id, tier, initial: ch[activeRef.current].img, onFail: () => { if (!disposed) setFailed(true); } }) as World | null;
      if (!w) { setFailed(true); return; }
      if (disposed) { w.dispose(); return; }
      world.current = w;
      applyMood(activeRef.current);
    }).catch(() => setFailed(true));
    return () => { disposed = true; world.current?.dispose(); world.current = null; };
  }, [id, tier, ch, applyMood]);

  // طبقة الشرر والأوراق
  useEffect(() => {
    if (!fxCanvas.current || !tier) return;
    const f = createStoryFx(fxCanvas.current, { motion: tier !== "static" });
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

  const local = (e: { clientX: number; clientY: number }) => {
    const r = stage.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };
  const onStageDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    setTouched(true);
    const [x, y] = local(e);
    fx.current?.burst(x, y, cur.interact === "earth" && story.earth ? story.earth : GOLD, cur.interact === "earth" ? 34 : 18);
  };
  const onOrb = (k: number, e: React.MouseEvent) => {
    setTouched(true);
    const [x, y] = local(e);
    fx.current?.burst(x, y, GOLD, 30);
    setFound((f) => (f.includes(k) ? f : [...f, k]));
  };

  // الضغط المطوّل للتوبة: الطفل «يقول» الدعاء، فينزل النور
  const holdRaf = useRef(0);
  const holdStart = useRef(0);
  const finishHold = useCallback(() => {
    heldRef.current = true; setHeld(true); setHold(1);
    const c = ch[activeRef.current];
    if (c.moodAfter) world.current?.setMood?.(c.moodAfter);
    const r = stage.current?.getBoundingClientRect();
    if (r) for (let i = 0; i < 4; i++) fx.current?.burst(r.width * (0.35 + i * 0.1), r.height * 0.12, GOLD, 22, { down: true });
  }, [ch]);
  const holdDown = () => {
    if (heldRef.current) return;
    holdStart.current = performance.now();
    const step = () => {
      const k = Math.min(1, (performance.now() - holdStart.current) / HOLD_MS);
      setHold(k);
      if (k >= 1) { holdRaf.current = 0; finishHold(); return; }
      holdRaf.current = requestAnimationFrame(step);
    };
    holdRaf.current = requestAnimationFrame(step);
  };
  const holdUp = () => { if (holdRaf.current) { cancelAnimationFrame(holdRaf.current); holdRaf.current = 0; } if (!heldRef.current) setHold(0); };
  useEffect(() => () => { if (holdRaf.current) cancelAnimationFrame(holdRaf.current); }, []);

  const hint = cur.interact === "earth" ? g("المس التراب وشوف ألوان الأرض", "المسي التراب وشوفي ألوان الأرض")
    : cur.interact === "names" ? g("المس النقط الذهبية", "المسي النقط الذهبية")
    : null;
  const names = story.names ?? [];

  return (
    <section aria-label={title} className="relative -mx-4 sm:mx-0">
      {/* المشهد: ثابت في الشاشة طول القصة */}
      <div ref={stage} onPointerDown={onStageDown}
        className="sticky top-[5.25rem] z-0 -mb-[calc(100svh-11.5rem)] h-[calc(100svh-11.5rem)] min-h-[380px] touch-pan-y overflow-clip rounded-none bg-[#120d33] shadow-soft sm:rounded-[32px]">
        <canvas ref={canvas} aria-hidden className="absolute inset-0 size-full" />
        {failed && /^[a-z_]+$/.test(id) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`${BASE}/scenes/${id}/${cur.img + 1}-960.webp`} alt="" className="absolute inset-0 size-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
        )}
        <canvas ref={fxCanvas} aria-hidden className="pointer-events-none absolute inset-0 size-full" />
        {/* تدرج خفيف تحت علشان الكلام يبان */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[#0d0926]/85 to-transparent" />

        <div className="pointer-events-none absolute inset-x-3 top-3 flex items-center justify-between text-white">
          <span className="rounded-full bg-black/35 px-3 py-1 text-xs font-bold backdrop-blur">{arNum(active + 1)} / {arNum(ch.length)}</span>
          <span key={active} className="rounded-full bg-black/35 px-3 py-1 font-heading text-sm font-extrabold text-gold backdrop-blur motion-safe:animate-in motion-safe:fade-in">{cur.label}</span>
        </div>
        {/* شريط التقدم على الجنب */}
        <div aria-hidden className="pointer-events-none absolute end-2 top-1/2 flex -translate-y-1/2 flex-col gap-1.5">
          {ch.map((_, k) => <span key={k} className={cn("w-1.5 rounded-full transition-all duration-500", k === active ? "h-6 bg-gold" : k < active ? "h-1.5 bg-gold/60" : "h-1.5 bg-white/35")} />)}
        </div>

        {/* الأسماء: نقاط ذهبية يلمسها الطفل فيظهر اسم شيء */}
        {cur.interact === "names" && ORBS.slice(0, names.length).map(([x, y], k) => (
          <button key={k} type="button" onClick={(e) => onOrb(k, e)} aria-label={found.includes(k) ? names[k] : g("نقطة ذهبية، المسها", "نقطة ذهبية، المسيها")}
            style={{ left: `${x}%`, top: `${y}%` }}
            className="absolute z-10 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center">
            <span aria-hidden className={cn("block rounded-full bg-[radial-gradient(circle,#fff6d6_0%,#ffcf5a_45%,rgba(255,180,60,0)_72%)] transition-all duration-500",
              found.includes(k) ? "size-5 opacity-70" : "size-7 motion-safe:animate-pulse")} />
            {found.includes(k) && (
              <span className="absolute top-full mt-0.5 whitespace-nowrap rounded-full bg-black/45 px-2.5 py-0.5 font-ruqaa text-lg text-[#ffe3a0] backdrop-blur motion-safe:animate-in motion-safe:zoom-in-50">{names[k]}</span>
            )}
          </button>
        ))}

        {hint && !touched && (
          <span className="pointer-events-none absolute inset-x-0 top-14 mx-auto flex w-fit items-center gap-1 rounded-full bg-gold px-3 py-1.5 text-sm font-extrabold text-[#3D2600] shadow-soft motion-safe:animate-bounce">
            <Hand className="size-4" /> {hint}
          </span>
        )}
        {cur.interact === "names" && found.length > 0 && (
          <span className="pointer-events-none absolute inset-x-0 top-14 mx-auto w-fit rounded-full bg-black/40 px-3 py-1 text-xs font-bold text-white backdrop-blur">
            {found.length < names.length ? `${arNum(found.length)} من ${arNum(names.length)}` : "هذه أمثلة قليلة… وعلّم الله سيدنا آدم الأسماء كلها ✨"}
          </span>
        )}
      </div>

      {/* الفقرات: تمر فوق المشهد بالسكرول */}
      <div className="pointer-events-none relative z-10">
        {ch.map((c, k) => (
          <article key={k} data-k={k} ref={(el) => { chapterEls.current[k] = el; }}
            className={cn("flex h-[calc(100svh-11.5rem)] min-h-[380px] flex-col justify-end px-3 pb-4", k === 0 && "pt-0")}>
            <div className={cn("pointer-events-auto mx-auto w-full max-w-xl rounded-3xl border border-white/10 bg-[#120d33]/72 p-4 text-white shadow-soft backdrop-blur-md transition-all duration-700 [&_.surah-name]:text-[#ffd77a]",
              k === active ? "opacity-100" : "opacity-40")}>
              <p className="mb-1 font-heading text-lg font-extrabold text-gold">{c.label}</p>
              <p className="text-base leading-8 text-white/92"><RT text={content.more[c.more]} /></p>
              {c.interact === "hold" && (
                <div className="mt-3 flex flex-col items-center gap-2">
                  <button type="button" disabled={held}
                    onPointerDown={holdDown} onPointerUp={holdUp} onPointerLeave={holdUp} onPointerCancel={holdUp}
                    onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !held) { e.preventDefault(); finishHold(); } }}
                    onContextMenu={(e) => e.preventDefault()}
                    aria-label={held ? "فتاب عليه" : g("اقرأ دعاء سيدنا آدم عليه السلام، واضغط مطوّلًا", "اقرئي دعاء سيدنا آدم عليه السلام، واضغطي مطوّلًا")}
                    className="relative min-h-12 w-full max-w-xs px-3 py-2 touch-none select-none overflow-hidden rounded-full bg-white/12 font-bold text-white">
                    <span aria-hidden className="absolute inset-y-0 start-0 bg-gradient-to-l from-[#ffd06b] to-[#ffb93f]" style={{ width: `${Math.round(hold * 100)}%` }} />
                    <span className={cn("relative flex items-center justify-center gap-1.5", hold > 0.5 && "text-[#3D2600]")}>
                      {held ? <><Sparkles className="size-4" /> <RT text="﴿فَتَابَ عَلَيْهِ﴾" /></> : <><Hand className="size-4 shrink-0" /> <span className="text-sm leading-5">{g("اقرأ دعاء سيدنا آدم عليه السلام، واضغط مطوّلًا", "اقرئي دعاء سيدنا آدم عليه السلام، واضغطي مطوّلًا")}</span></>}
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

      {(story.footer?.length || content.refs.length > 0) && (
        <div className="relative z-10 mx-3 mt-2 rounded-3xl border bg-card p-4 text-sm leading-7 text-muted-foreground shadow-soft sm:mx-0">
          {story.footer?.map((k) => <p key={k}><RT text={content.more[k]} /></p>)}
          {content.refs.length > 0 && <p className="mt-1 text-xs leading-6">المراجع: {content.refs.map((r, i) => <span key={i}>{i > 0 && " · "}<RT text={r} /></span>)}</p>}
        </div>
      )}
    </section>
  );
}
