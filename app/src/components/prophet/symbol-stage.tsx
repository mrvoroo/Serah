"use client";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Hand } from "lucide-react";
import { useTier } from "@/lib/tier";
import { ruqaaFont } from "@/lib/particles/font";
import { arNum } from "@/lib/quran";
import type { ShapeStep } from "@/content/prophets";
import { cn } from "@/lib/utils";
import { RT } from "@/components/religious-text";
import { g } from "@/lib/kid-text";

// رمز النبي التفاعلي في صفحته: نقاط مضيئة تتحول بالضغط من شكل إلى شكل كقصة قصيرة
// (موسى: عصا ← حيّة تسعى ← عصا ← انفلاق البحر)، مع جملة ومرجعها تحت كل شكل
type World = { morph: (id: string, o?: Record<string, number>) => void; setTheme: (t: string) => void; dispose: () => void; debug: () => Record<string, unknown> };
const sid = (i: number) => `s${i}`;
// الرمز يملأ الصندوق: حجم الرسم (≈5.4 عرض × 4.9 ارتفاع) مقابل مساحة الرؤية (8.28 ارتفاع × نسبة العرض)
const fitScale = (el: HTMLElement | null) => {
  const w = el?.clientWidth || 360, h = el?.clientHeight || 340, aspect = w / h;
  return Math.min(8.28 * 0.92 / 4.9, (8.28 * aspect * 0.94) / 5.4);
};
// مشاهد واقعية بمجسمات حقيقية لبعض الأنبياء بدل النقاط (تبدأ بسفينة سيدنا نوح عليه السلام)
// image: مشهد من صور المالك (آدم وإدريس وصالح) بتحوّل ناعم بين الصور
export type StageScene = "noah" | "image";
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// title: اسم المنطقة لقارئ الشاشة (مثل «رمز سيدنا موسى عليه السلام»)
export function SymbolStage({ steps, title, scene, sceneId }: { steps: ShapeStep[]; title: string; scene?: StageScene; sceneId?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const world = useRef<World | null>(null);
  const [i, setI] = useState(0);
  const [failed, setFailed] = useState(false);
  const [tapped, setTapped] = useState(false);
  const { resolvedTheme } = useTheme();
  const tier = useTier();
  const themeRef = useRef(resolvedTheme);
  const iRef = useRef(0);

  useEffect(() => {
    let disposed = false;
    const ready = (w: World | null) => {
      if (disposed) { w?.dispose(); return; }
      if (!w) { setFailed(true); return; }
      world.current = w;
      w.morph(sid(iRef.current), { scale: fitScale(canvas.current) });
      // للاختبارات فقط (خادم التطوير)
      if (process.env.NODE_ENV !== "production") (window as unknown as { __symbol?: unknown }).__symbol = { debug: () => world.current?.debug() ?? null };
    };
    if (scene === "noah") {
      import("@/lib/scenes/noah-scene.js").then(({ createNoahScene }) => {
        if (disposed || !canvas.current) return;
        ready(createNoahScene(canvas.current, { tier, initial: iRef.current }) as World | null);
      }).catch(() => setFailed(true));
      return () => { disposed = true; world.current?.dispose(); world.current = null; };
    }
    if (scene === "image" && sceneId) {
      import("@/lib/scenes/image-scene.js").then(({ createImageScene }) => {
        if (disposed || !canvas.current) return;
        ready(createImageScene(canvas.current, { id: sceneId, tier, initial: iRef.current, onFail: () => { if (!disposed) setFailed(true); } }) as World | null);
      }).catch(() => setFailed(true));
      return () => { disposed = true; world.current?.dispose(); world.current = null; };
    }
    Promise.all([import("@/lib/particles/world.js"), ruqaaFont()]).then(([{ createWorld }, font]) => {
      if (disposed || !canvas.current) return;
      const stations = steps.map((s, k) => ({ id: sid(k), label: "", symbol: s.shape, layout: "symbol" }));
      ready(createWorld(canvas.current, { tier, contained: true, theme: themeRef.current === "light" ? "light" : "dark", stations, font, initial: sid(iRef.current) }) as World | null);
    });
    return () => { disposed = true; world.current?.dispose(); world.current = null; };
  }, [steps, tier, scene, sceneId]);

  // الصندوق اتغير حجمه (دوران الموبايل مثلًا): الرمز يفضل مالي الصندوق
  useEffect(() => {
    if (scene || !canvas.current || !window.ResizeObserver) return;
    const ro = new ResizeObserver(() => world.current?.morph(sid(iRef.current), { scale: fitScale(canvas.current) }));
    ro.observe(canvas.current);
    return () => ro.disconnect();
  }, [scene]);

  useEffect(() => { themeRef.current = resolvedTheme; world.current?.setTheme(resolvedTheme === "light" ? "light" : "dark"); }, [resolvedTheme]);

  const go = (k: number) => {
    const next = (k + steps.length) % steps.length;
    iRef.current = next; setI(next); setTapped(true);
    world.current?.morph(sid(next), { scale: fitScale(canvas.current) });
  };
  const step = steps[i];

  return (
    <section aria-label={title} className="overflow-hidden rounded-[32px] border bg-[radial-gradient(ellipse_at_center,#2a1f63_0%,#120d33_70%)] text-white shadow-soft">
      <button type="button" onClick={() => go(i + 1)} aria-label={steps.length > 1 ? `${step.label} — ${g("اضغط", "اضغطي")} للشكل التالي` : step.label}
        className={cn("relative block w-full cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/60", scene === "image" ? "h-[340px] max-h-[85svh] sm:h-[520px]" : scene ? "h-[320px] sm:h-[440px]" : "h-[320px] sm:h-[400px]")}>
        <canvas ref={canvas} aria-hidden className="absolute inset-0 size-full" />
        {/* بدون WebGL: صورة المرحلة نفسها بدل المشهد */}
        {failed && scene === "image" && <span className="absolute inset-0 grid place-items-center font-heading text-3xl font-extrabold text-gold">{step.label}</span>}
        {failed && scene === "image" && sceneId && /^[a-z_]+$/.test(sceneId) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`${BASE}/scenes/${sceneId}/${i + 1}-960.webp`} alt="" className="absolute inset-0 size-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
        )}
        {failed && scene !== "image" && <span className="absolute inset-0 grid place-items-center font-heading text-3xl font-extrabold text-gold">{step.label}</span>}
        {steps.length > 1 && <span className="absolute start-3 top-3 rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur">{arNum(i + 1)} / {arNum(steps.length)}</span>}
        {!tapped && steps.length > 1 && (
          <span className="pointer-events-none absolute inset-x-0 bottom-3 mx-auto flex w-fit items-center gap-1 rounded-full bg-gold px-3 py-1.5 text-sm font-extrabold text-[#3D2600] shadow-soft motion-safe:animate-bounce">
            <Hand className="size-4" /> {g("اضغط على الشكل", "اضغطي على الشكل")}
          </span>
        )}
      </button>
      <div className="flex flex-col gap-2 p-4 text-center">
        <p className="font-heading text-xl font-extrabold text-gold">{step.label}</p>
        <p aria-live="polite" className="text-base leading-8 text-white/90"><RT text={step.caption} /></p>
        {step.ref && <p className="text-xs text-white/60">المرجع: <RT text={step.ref} /></p>}
        {steps.length > 1 && <div role="tablist" aria-label="الأشكال" className="flex justify-center gap-1">
          {steps.map((s, k) => (
            <button key={k} type="button" role="tab" aria-selected={k === i} aria-label={s.label} onClick={() => go(k)}
              className="grid h-8 min-w-8 place-items-center px-1">
              {/* مساحة لمس كبيرة لإصبع الطفل، والنقطة نفسها صغيرة */}
              <span aria-hidden className={cn("block h-2.5 rounded-full transition-all", k === i ? "w-7 bg-gold" : "w-2.5 bg-white/40")} />
            </button>
          ))}
        </div>}
      </div>
    </section>
  );
}
