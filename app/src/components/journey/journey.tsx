"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { ArrowLeft, ChevronsLeft, ChevronsRight, Headphones, ListTree } from "lucide-react";
import { useTier } from "@/lib/tier";
import { BlurFade } from "@/components/ui/blur-fade";
import SplitText from "@/components/SplitText";
import { buttonVariants } from "@/components/ui/button";
import { Zaid } from "@/components/zaid";
import { BranchedMenu, type BranchedMenuItem } from "@/components/branched-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { STATIONS } from "./stations";

export { STATIONS };

// قائمة المحطات: الأنبياء مقسّمون لمجموعات بالترتيب، وكل نبي برقم محطته
const nameOf = (id: string) => {
  const s = STATIONS.find((x) => x.id === id)!;
  return id === "muhammad" ? "محمد ﷺ" : s.label.replace(/^سيدنا /, "");
};
const stop = (id: string, n?: number) => ({
  value: id,
  label: nameOf(id),
  icon: n ? <span className="grid size-6 place-items-center rounded-full bg-secondary text-[11px] font-bold text-secondary-foreground">{n.toLocaleString("ar-EG")}</span> : undefined,
});
const range = (ids: string[]) => ids.map((id) => stop(id, STATIONS.findIndex((s) => s.id === id)));
const MENU: BranchedMenuItem[] = [
  { label: "البداية", value: "start" },
  { label: "من آدم إلى إبراهيم", children: range(["adam", "idris", "noah", "hud", "salih", "ibrahim"]) },
  { label: "من لوط إلى يوسف", children: range(["lut", "ismail", "ishaq", "yaqub", "yusuf"]) },
  { label: "من أيوب إلى سليمان", children: range(["ayyub", "shuayb", "musa", "harun", "dhulkifl", "dawud", "sulayman"]) },
  { label: "من إلياس إلى محمد ﷺ", children: range(["ilyas", "alyasa", "yunus", "zakariya", "yahya", "isa", "muhammad"]) },
  { label: "السيرة والقرآن", children: [stop("sira"), stop("quran")] },
];

// القائمة في الشاشات الكبيرة: مفتوحة أو نقاط. نحفظ اختيار الطفل، والافتراضي نقاط لو الشاشة ليست واسعة
const MENU_KEY = "serah_journey_menu";
const menuListeners = new Set<() => void>();
const subscribeMenu = (fn: () => void) => { menuListeners.add(fn); return () => { menuListeners.delete(fn); }; };
const menuDots = () => {
  let v: string | null = null;
  try { v = localStorage.getItem(MENU_KEY); } catch { /* تخزين غير متاح */ }
  return v ? v === "dots" : window.innerWidth < 1280;
};
const setMenuDots = (dots: boolean) => {
  try { localStorage.setItem(MENU_KEY, dots ? "dots" : "full"); } catch { /* تخزين غير متاح */ }
  menuListeners.forEach((fn) => fn());
};

type World = {
  morph: (id: string, o?: Record<string, number>) => void;
  scroll: (local: number, vel: number) => void;
  setTheme: (t: string) => void;
  dispose: () => void;
  debug: () => Record<string, unknown>;
  tier: string;
};

// مكان المجسم وحجمه في المساحة الفاضية بجانب بطاقة المحطة (أو فوقها في الموبايل)، من مكان البطاقة الفعلي
// الكاميرا: مجال رؤية 45° على بعد 10 → نصف ارتفاع المشهد ≈ 4.14 وحدة
function layout(i: number, section?: HTMLElement) {
  const W = window.innerWidth, H = window.innerHeight;
  const hh = Math.tan(Math.PI / 8) * 10, hw = hh * (W / H);
  const toX = (px: number) => (px / W) * 2 * hw - hw, toY = (px: number) => hh - (px / H) * 2 * hh;
  const side = STATIONS[i].layout === "side";
  const shapeW = side ? 6.6 : 4.4, shapeH = side ? 3.2 : 4.9, shiftX = side ? 0.37 : 0;
  const card = section?.querySelector<HTMLElement>("[data-card]")?.getBoundingClientRect();
  const sec = section?.getBoundingClientRect();
  if (window.matchMedia("(max-width: 760px)").matches) {
    // بين الشريط العلوي وأعلى البطاقة (موضعها داخل القسم، لا يتأثر بمكان السكرول)
    // تحت شريط «٣ من ٢٨» العلوي
    const top = 132, bottom = card && sec ? Math.min(H * 0.72, Math.max(H * 0.42, card.top - sec.top - 12)) : H * 0.5;
    const scale = Math.min(0.7, (2 * hw * 0.92) / shapeW, (((bottom - top) / H) * 2 * hh * 0.95) / shapeH);
    return { x: -shiftX * scale, y: toY((top + bottom) / 2), scale, yaw: 0 };
  }
  // الجانب الأوسع الفاضي بجانب البطاقة، بعيدًا عن قائمة المحطات (نقيس مكانها الفعلي: مفتوحة أو نقاط)
  const rail = 64, m = document.querySelector("[data-journey-menu]")?.getBoundingClientRect();
  const menuEdge = m && m.width > 0 ? Math.min(W - rail, m.left - 24) : W - rail;
  const left = card ? [rail, card.left - 16] : [rail, W / 2];
  const right = card ? [card.right + 16, menuEdge] : [W / 2, menuEdge];
  const [a, b] = left[1] - left[0] >= right[1] - right[0] ? left : right;
  const freeW = ((b - a) / W) * 2 * hw;
  const scale = Math.min(side ? 0.85 : 0.95, (freeW * 0.92) / shapeW, (2 * hh * 0.78) / shapeH);
  const cx = toX((a + b) / 2);
  return { x: cx - shiftX * scale, y: 0.1, scale, yaw: cx < 0 ? 0.18 : -0.18 };
}

// المحطة التي يقع منتصف الشاشة داخلها الآن (الأقسام متتالية بلا فراغات)
// هذا هو المصدر الوحيد للحقيقة: المجسم يُشتق منه دائمًا، فلا يمكن أن يعلق على شكل محطة أخرى
function stationAtCenter(sections: HTMLElement[]) {
  const mid = window.innerHeight / 2;
  let idx = 0;
  for (let i = 0; i < sections.length; i++) if (sections[i].getBoundingClientRect().top <= mid) idx = i;
  const r = sections[idx].getBoundingClientRect();
  return { idx, local: Math.min(1, Math.max(0, (mid - r.top) / Math.max(1, r.height))) };
}

async function ruqaaFont() {
  const fam = getComputedStyle(document.documentElement).getPropertyValue("--font-ruqaa").trim() || "serif";
  try {
    await Promise.race([document.fonts.load(`700 150px ${fam}`, "سيدنا محمد ﷺ"), new Promise((r) => setTimeout(r, 3000))]);
  } catch { /* نكمل بالخط الاحتياطي */ }
  return fam;
}

export function Journey() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scope = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<World | null>(null);
  const activeRef = useRef(-1);
  const syncRef = useRef<(force: boolean) => void>(() => {});
  const [active, setActive] = useState(0);
  const [ready, setReady] = useState(false);
  // المحطة المطلوبة من القائمة: تبقى مختارة أثناء النزول إليها حتى لا تتقلب القائمة مع كل محطة في الطريق
  const [target, setTarget] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const dots = useSyncExternalStore(subscribeMenu, menuDots, () => false);
  const { resolvedTheme } = useTheme();
  const tier = useTier();
  const themeRef = useRef(resolvedTheme);

  // تحميل محرك النقاط عند الحاجة فقط (لا يدخل في حزمة باقي الصفحات)
  // عند تغيّر مستوى الجهاز يُعاد إنشاء المحرك ويبدأ من المحطة الظاهرة الآن لا من البداية
  useEffect(() => {
    let disposed = false;
    Promise.all([import("@/lib/particles/world.js"), ruqaaFont()]).then(([{ createWorld }, font]) => {
      if (disposed || !canvasRef.current || !scope.current) return;
      const sections = Array.from(scope.current.querySelectorAll<HTMLElement>("[data-station]"));
      const { idx } = stationAtCenter(sections);
      const stations = STATIONS.map((s) => ({ id: s.id, label: s.label, sub: s.sub, symbol: s.symbol, layout: s.layout }));
      const w = createWorld(canvasRef.current, { tier, theme: themeRef.current === "light" ? "light" : "dark", stations, font, initial: STATIONS[idx].id }) as World | null;
      worldRef.current = w;
      if (w) { syncRef.current(true); setReady(true); }
    });
    (window as unknown as { __serah?: unknown }).__serah = {
      debug: () => worldRef.current?.debug() ?? null,
      active: () => activeRef.current,
      expected: () => (scope.current ? STATIONS[stationAtCenter(Array.from(scope.current.querySelectorAll<HTMLElement>("[data-station]"))).idx].id : null),
    };
    return () => { disposed = true; worldRef.current?.dispose(); worldRef.current = null; };
  }, [tier]);

  useEffect(() => {
    themeRef.current = resolvedTheme;
    worldRef.current?.setTheme(resolvedTheme === "light" ? "light" : "dark");
  }, [resolvedTheme, ready]);

  // ربط المجسم بالسكرول: نحسب المحطة من مكان السكرول في كل إطار يتحرك فيه، وعند تغيّر المقاس
  // (ظهور شريط العنوان في الموبايل)، ومرة كل نصف ثانية كضمان إضافي.
  useEffect(() => {
    const root = scope.current;
    if (!root) return;
    const sections = Array.from(root.querySelectorAll<HTMLElement>("[data-station]"));
    let raf = 0, lastY = window.scrollY, lastT = performance.now();
    const apply = (force: boolean) => {
      const { idx, local } = stationAtCenter(sections);
      const w = worldRef.current;
      if (idx !== activeRef.current || force) {
        activeRef.current = idx;
        setActive(idx);
        w?.morph(STATIONS[idx].id, layout(idx, sections[idx]));
      }
      const now = performance.now(), y = window.scrollY;
      const vel = ((y - lastY) / Math.max(16, now - lastT)) * 1000;
      lastY = y; lastT = now;
      w?.scroll(local, vel / 2500);
    };
    syncRef.current = apply;
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; apply(false); }); };
    const onResize = () => apply(true);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    const guard = window.setInterval(() => apply(false), 500);
    apply(true);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(guard);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
      syncRef.current = () => {};
    };
  }, []);

  const current = target ?? STATIONS[active].id;
  const ci = STATIONS.findIndex((s) => s.id === current);
  // الأنبياء محطات ١..٢٥، والبداية والسيرة والقرآن بأسمائها فقط
  const pos = ci >= 1 && ci <= 25 ? `${ci.toLocaleString("ar-EG")} من ٢٥ — ${STATIONS[ci].label}` : STATIONS[ci].label;

  // إبقاء المحطة الحالية ظاهرة داخل لوحة القائمة (بعد انتهاء طيّ وفتح الأقسام)
  useEffect(() => {
    const t = window.setTimeout(() => {
      const box = navRef.current, el = box?.querySelector<HTMLElement>("[aria-current]");
      if (!box || !el) return;
      const top = el.offsetTop - box.clientHeight / 2 + el.offsetHeight / 2;
      box.scrollTo({ top, behavior: "smooth" });
    }, 320);
    return () => window.clearTimeout(t);
  }, [current, dots]);

  // فتح/طي القائمة يغيّر المساحة الفاضية: نعيد مكان المجسم حتى لا يقع تحتها
  useEffect(() => { syncRef.current(true); }, [dots]);

  const targetTimer = useRef(0);
  const go = (i: number) => {
    const el = document.getElementById(`station-${STATIONS[i].id}`);
    if (!el) return;
    const lenis = (window as unknown as { __lenis?: { scrollTo: (t: Element, o?: object) => void } }).__lenis;
    setTarget(STATIONS[i].id);
    const done = () => { window.clearTimeout(targetTimer.current); setTarget(null); };
    window.clearTimeout(targetTimer.current);
    // احتياط: لو الطفل لمس السكرول أثناء النزول فلا يكتمل، نرجع لمتابعة السكرول بعد قليل
    targetTimer.current = window.setTimeout(done, 2500);
    if (lenis) lenis.scrollTo(el, { offset: 0, onComplete: done }); else el.scrollIntoView({ behavior: "smooth" });
  };
  const pick = (id: string) => { setMenuOpen(false); go(STATIONS.findIndex((s) => s.id === id)); };
  const menu = (className?: string) => <BranchedMenu label="محطات الرحلة" items={MENU} active={current} onSelect={pick} className={className} />;

  return (
    <div ref={scope} className="relative">
      <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 h-full w-full" />
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(60%_50%_at_25%_45%,var(--glow),transparent_70%)]" />

      {/* الكمبيوتر: القائمة ثابتة على الجانب */}
      <div data-journey-menu data-testid="journey-menu" className={cn("fixed start-4 top-1/2 z-20 hidden max-h-[80svh] -translate-y-1/2 flex-col rounded-[24px] border bg-card/85 shadow-soft backdrop-blur lg:flex", dots ? "w-11 items-center p-1" : "w-[210px] p-3")}>
        <button type="button" onClick={() => setMenuDots(!dots)} aria-expanded={!dots} aria-label={dots ? "إظهار قائمة المحطات" : "إخفاء قائمة المحطات"} title={dots ? "إظهار القائمة" : "إخفاء القائمة"}
          className={cn("flex shrink-0 items-center gap-1 rounded-full text-sm font-bold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground", dots ? "size-9 justify-center" : "mb-1 h-9 justify-between self-stretch px-2")}>
          {!dots && <span>المحطات</span>}
          {dots ? <ChevronsLeft className="size-5" /> : <ChevronsRight className="size-5" />}
        </button>
        <div ref={navRef} {...(dots ? { role: "navigation", "aria-label": "محطات الرحلة" } : {})} className={cn("min-h-0 overflow-y-auto [scrollbar-width:none]", dots && "flex flex-col items-center")}>
          {dots ? STATIONS.map((s, i) => (
            <Tooltip key={s.id}>
              <TooltipTrigger render={
                <button type="button" onClick={() => go(i)} aria-label={s.title} aria-current={s.id === current ? "true" : undefined} className="relative grid size-7 shrink-0 place-items-center rounded-full">
                  {s.id === current && <motion.span layoutId="station-dot" className="absolute inset-0.5 rounded-full bg-gold/25" transition={{ type: "spring", stiffness: 400, damping: 30 }} />}
                  <span className={cn("relative size-2 rounded-full transition-all", s.id === current ? "scale-125 bg-gold" : s.symbol ? "bg-muted-foreground/60" : "bg-muted-foreground/30")} />
                </button>
              } />
              <TooltipContent side="left" className="font-bold">{i > 0 && i < 26 ? `${i.toLocaleString("ar-EG")} · ` : ""}{nameOf(s.id)}</TooltipContent>
            </Tooltip>
          )) : menu()}
        </div>
      </div>

      {/* الموبايل: شريط علوي «٣ من ٢٨ — سيدنا نوح» يفتح القائمة. التابلت: زر عائم */}
      <button type="button" onClick={() => setMenuOpen(true)} aria-label={`المحطات: ${pos}`}
        className="fixed inset-x-0 top-[84px] z-30 mx-auto flex h-10 w-fit max-w-[calc(100vw-32px)] items-center gap-2 rounded-full border bg-card/90 px-4 text-sm font-bold shadow-soft backdrop-blur md:hidden">
        <ListTree className="size-4 shrink-0 text-gold" /><span className="truncate">{pos}</span>
      </button>
      <button type="button" onClick={() => setMenuOpen(true)} className="fixed bottom-24 end-4 z-30 hidden h-12 items-center gap-2 rounded-full border bg-card/90 px-4 font-bold shadow-soft backdrop-blur md:flex lg:hidden">
        <ListTree className="size-5 text-gold" /> المحطات
      </button>
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="right" className="w-72 gap-3 overflow-y-auto p-5">
          <SheetHeader className="p-0"><SheetTitle>محطات الرحلة</SheetTitle></SheetHeader>
          {menu()}
        </SheetContent>
      </Sheet>

      {/* الشاشات الكبيرة: الأقسام بعرض الشاشة كله (خارج عمود الصفحة 768px) حتى تتبدل البطاقة يمين/شمال بوضوح
          ويبقى للمجسم مكان واسع في الجهة الأخرى، مع ترك مكان لقائمة المحطات */}
      <div className="relative z-10 lg:mx-[calc(50%-50vw+8px)]">
        {STATIONS.map((s, i) => (
          <section
            key={s.id}
            id={`station-${s.id}`}
            data-station={s.id}
            className={cn("flex min-h-svh items-end px-4 pb-28 pt-24 md:items-center md:px-[6vw] md:pb-16 lg:pe-16", dots ? "lg:ps-[84px]" : "lg:ps-[250px]", i % 2 ? "md:justify-end" : "md:justify-start")}
          >
            <BlurFade inView inViewMargin="-20% 0px" className="w-full md:max-w-md">
              <div data-card className="rounded-[28px] border bg-card/90 p-5 shadow-soft backdrop-blur-md md:p-6">
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
