"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { motion } from "motion/react";
import { ArrowLeft, Headphones } from "lucide-react";
import { useTier } from "@/lib/tier";
import { BlurFade } from "@/components/ui/blur-fade";
import SplitText from "@/components/SplitText";
import { buttonVariants } from "@/components/ui/button";
import { Zaid } from "@/components/zaid";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type World = {
  morph: (shape: string, o?: Record<string, number>) => void;
  scroll: (local: number, vel: number) => void;
  setTheme: (t: string) => void;
  dispose: () => void;
  debug: () => Record<string, unknown>;
  tier: string;
};

// محطات الرحلة. النصوص القصيرة تحتاج مراجعة شرعية قبل النشر.
export const STATIONS = [
  { id: "start", shape: "crescent", tag: "أهلًا يا بطل", title: "رحلة مع الأنبياء", text: "انزل معانا خطوة خطوة، وكل محطة فيها حكاية من حكايات الأنبياء." },
  { id: "noah", shape: "ark", tag: "المحطة الأولى", title: "سفينة نبي الله نوح", text: "صبر سنين طويلة، وبنى السفينة بأمر الله، فنجّى الله بها المؤمنين." },
  { id: "musa", shape: "staff", tag: "المحطة الثانية", title: "عصا نبي الله موسى", text: "ضرب البحر بعصاه بأمر الله، فانشق البحر وصار طريقًا يابسًا." },
  { id: "sira", shape: "sword", tag: "من السيرة النبوية", title: "سيف ذو الفقار", text: "سيف مشهور في السيرة النبوية، نتذكر معه الشجاعة ونُصرة الحق." },
  { id: "quran", shape: "book", tag: "نور الرحلة", title: "القرآن الكريم", text: "كل حكاية سمعناها موجودة في كتاب الله. يلا نسمع ونجمع النجوم." },
] as const;

function layout(i: number) {
  const mobile = window.matchMedia("(max-width: 760px)").matches;
  if (mobile) return { x: 0, y: 1.35, scale: 0.56, yaw: i % 2 ? -0.4 : 0.4 };
  const cardRight = i % 2 === 0;
  return { x: cardRight ? -2.4 : 2.4, y: 0, scale: 0.95, yaw: cardRight ? 0.35 : -0.35 };
}

export function Journey() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scope = useRef<HTMLDivElement>(null);
  const worldRef = useRef<World | null>(null);
  const [active, setActive] = useState(0);
  const [ready, setReady] = useState(false);
  const { resolvedTheme } = useTheme();
  const tier = useTier();
  const themeRef = useRef(resolvedTheme);
  themeRef.current = resolvedTheme;

  // تحميل محرك النقاط عند الحاجة فقط (لا يدخل في حزمة باقي الصفحات)
  useEffect(() => {
    let disposed = false;
    import("@/lib/particles/world.js").then(({ createWorld }) => {
      if (disposed || !canvasRef.current) return;
      const w = createWorld(canvasRef.current, { tier, theme: themeRef.current === "light" ? "light" : "dark" }) as World | null;
      worldRef.current = w;
      if (w) { w.morph(STATIONS[0].shape, layout(0)); setReady(true); }
      (window as unknown as { __serah?: unknown }).__serah = { debug: () => worldRef.current?.debug() ?? null };
    });
    return () => { disposed = true; worldRef.current?.dispose(); worldRef.current = null; };
  }, [tier]);

  useEffect(() => { worldRef.current?.setTheme(resolvedTheme === "light" ? "light" : "dark"); }, [resolvedTheme, ready]);

  useGSAP(() => {
    const sections = gsap.utils.toArray<HTMLElement>("[data-station]");
    sections.forEach((el, i) => {
      ScrollTrigger.create({
        trigger: el,
        start: "top center",
        end: "bottom center",
        onToggle: (self) => {
          if (!self.isActive) return;
          setActive(i);
          worldRef.current?.morph(STATIONS[i].shape, layout(i));
        },
        onUpdate: (self) => worldRef.current?.scroll(self.progress, self.getVelocity() / 2500),
      });
    });
    const onResize = () => { const w = worldRef.current; if (w) w.morph(STATIONS[active].shape, layout(active)); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, { scope, dependencies: [ready] });

  const go = (i: number) => {
    const el = document.getElementById(`station-${STATIONS[i].id}`);
    const lenis = (window as unknown as { __lenis?: { scrollTo: (t: Element, o?: object) => void } }).__lenis;
    if (el) { if (lenis) lenis.scrollTo(el, { offset: 0 }); else el.scrollIntoView({ behavior: "smooth" }); }
  };

  return (
    <div ref={scope} className="relative">
      <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 h-full w-full" />
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(60%_50%_at_25%_45%,var(--glow),transparent_70%)]" />

      <nav aria-label="محطات الرحلة" className="fixed start-3 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-1 rounded-full border bg-card/80 p-1.5 shadow-soft backdrop-blur md:flex">
        {STATIONS.map((s, i) => (
          <button key={s.id} type="button" onClick={() => go(i)} aria-label={s.title} aria-current={i === active ? "step" : undefined} className="relative grid size-9 place-items-center rounded-full">
            {i === active && <motion.span layoutId="station-dot" className="absolute inset-1 rounded-full bg-gold/25" transition={{ type: "spring", stiffness: 400, damping: 30 }} />}
            <span className={cn("relative size-2.5 rounded-full transition-all", i === active ? "scale-125 bg-gold" : "bg-muted-foreground/40")} />
          </button>
        ))}
      </nav>

      <div className="relative z-10">
        {STATIONS.map((s, i) => (
          <section
            key={s.id}
            id={`station-${s.id}`}
            data-station={s.shape}
            className={cn("flex min-h-svh items-end px-4 pb-28 pt-24 md:items-center md:px-[6vw] md:pb-16", i % 2 ? "md:justify-end" : "md:justify-start")}
          >
            <BlurFade inView inViewMargin="-20% 0px" className="w-full md:max-w-md">
              <div className="rounded-[28px] border bg-card/90 p-5 shadow-soft backdrop-blur-md md:p-6">
                <div className="flex items-center gap-3">
                  {i === 0 && <Zaid mood="helping" size={84} />}
                  {i === STATIONS.length - 1 && <Zaid mood="happy" size={84} />}
                  <div>
                    <span className="inline-block rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">{s.tag}</span>
                    {i === 0 ? (
                      <SplitText text={s.title} tag="h1" className="mt-2 text-4xl font-extrabold leading-tight text-foreground md:text-5xl" splitType="words" effect="rise" trigger="load" textAlign="right" />
                    ) : (
                      <h2 className="mt-2 text-3xl font-extrabold leading-tight md:text-4xl">{s.title}</h2>
                    )}
                  </div>
                </div>
                <p className="mt-3 text-base leading-8 text-muted-foreground">{s.text}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {i === 0 ? (
                    <button type="button" onClick={() => go(1)} className={buttonVariants({ variant: "gold", size: "lg2" })}>
                      يلا نبدأ <ArrowLeft />
                    </button>
                  ) : (
                    <Link href="/kid/lectures/" className={buttonVariants({ variant: "secondary", size: "lg2" })}>
                      <Headphones /> استمع للمحاضرات
                    </Link>
                  )}
                </div>
              </div>
            </BlurFade>
          </section>
        ))}
      </div>
    </div>
  );
}
