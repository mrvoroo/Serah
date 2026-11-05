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
const SCALE = 1.2;

// title: اسم المنطقة لقارئ الشاشة (مثل «رمز سيدنا موسى عليه السلام»)
export function SymbolStage({ steps, title }: { steps: ShapeStep[]; title: string }) {
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
    Promise.all([import("@/lib/particles/world.js"), ruqaaFont()]).then(([{ createWorld }, font]) => {
      if (disposed || !canvas.current) return;
      const stations = steps.map((s, k) => ({ id: sid(k), label: "", symbol: s.shape, layout: "symbol" }));
      const w = createWorld(canvas.current, { tier, contained: true, theme: themeRef.current === "light" ? "light" : "dark", stations, font, initial: sid(iRef.current) }) as World | null;
      if (!w) { setFailed(true); return; }
      world.current = w;
      w.morph(sid(iRef.current), { scale: SCALE });
      // للاختبارات فقط (خادم التطوير)
      if (process.env.NODE_ENV !== "production") (window as unknown as { __symbol?: unknown }).__symbol = { debug: () => world.current?.debug() ?? null };
    });
    return () => { disposed = true; world.current?.dispose(); world.current = null; };
  }, [steps, tier]);

  useEffect(() => { themeRef.current = resolvedTheme; world.current?.setTheme(resolvedTheme === "light" ? "light" : "dark"); }, [resolvedTheme]);

  const go = (k: number) => {
    const next = (k + steps.length) % steps.length;
    iRef.current = next; setI(next); setTapped(true);
    world.current?.morph(sid(next), { scale: SCALE });
  };
  const step = steps[i];

  return (
    <section aria-label={title} className="overflow-hidden rounded-[32px] border bg-[radial-gradient(ellipse_at_center,#2a1f63_0%,#120d33_70%)] text-white shadow-soft">
      <button type="button" onClick={() => go(i + 1)} aria-label={steps.length > 1 ? `${step.label} — ${g("اضغط", "اضغطي")} للشكل التالي` : step.label}
        className="relative block h-[300px] w-full cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/60 sm:h-[360px]">
        <canvas ref={canvas} aria-hidden className="absolute inset-0 size-full" />
        {failed && <span className="absolute inset-0 grid place-items-center font-heading text-3xl font-extrabold text-gold">{step.label}</span>}
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
