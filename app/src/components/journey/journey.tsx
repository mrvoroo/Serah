"use client";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { ArrowLeft, BookOpen, ChevronsLeft, ChevronsRight, Headphones, ListTree, Swords } from "lucide-react";
import { useTier } from "@/lib/tier";
import { ruqaaFont } from "@/lib/particles/font";
import { BlurFade } from "@/components/ui/blur-fade";
import SplitText from "@/components/SplitText";
import { buttonVariants } from "@/components/ui/button";
import { Zaid } from "@/components/zaid";
import { BranchedMenu, type BranchedMenuItem } from "@/components/branched-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { isProphet, menuName } from "@/lib/prophets";
import type { Station } from "./stations";
import { RT } from "@/components/religious-text";
import { g } from "@/lib/kid-text";

// قائمة المحطات: الأنبياء مقسّمون لمجموعات بالترتيب (حتى 7 في المجموعة، أو عند إبراهيم ويوسف وسليمان)، وكل نبي برقم محطته
const BREAKS = new Set(["ibrahim", "yusuf", "sulayman"]);
const badge = (n: number) => <span className="grid size-6 place-items-center rounded-full bg-secondary text-[11px] font-bold text-secondary-foreground">{n.toLocaleString("ar-EG")}</span>;
function buildMenu(stations: Station[]): BranchedMenuItem[] {
  const groups: Station[][] = [];
  let cur: Station[] = [];
  stations.filter(isProphet).forEach((s) => { cur.push(s); if (BREAKS.has(s.id) || cur.length === 7) { groups.push(cur); cur = []; } });
  if (cur.length) groups.push(cur);
  const items: BranchedMenuItem[] = [{ label: "البداية", value: "start" }];
  let n = 0;
  for (const g of groups) {
    const label = g.length > 1 ? `من ${menuName(g[0])} إلى ${menuName(g[g.length - 1])}` : menuName(g[0]);
    items.push({ label, children: g.map((s) => ({ value: s.id, label: menuName(s), icon: badge(++n) })) });
  }
  const tail = stations.filter((s) => s.id === "sira" || s.id === "quran");
  if (tail.length) items.push({ label: "السيرة والقرآن", children: tail.map((s) => ({ value: s.id, label: menuName(s) })) });
  return items;
}

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
function layout(st: Station, section?: HTMLElement) {
  const W = window.innerWidth, H = window.innerHeight;
  const hh = Math.tan(Math.PI / 8) * 10, hw = hh * (W / H);
  const toX = (px: number) => (px / W) * 2 * hw - hw, toY = (px: number) => hh - (px / H) * 2 * hh;
  const side = st.layout === "side";
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

// stations: من الخلفية (جدول Prophets) أو الاحتياطية — تتغير فقط بإعادة تركيب المكوّن (key)
// آخر نبي فتح الطفل صفحته من الرحلة (للرجوع لقسمه)
const AT_KEY = "serah_journey_at";
const rememberStation = (id: string) => { try { sessionStorage.setItem(AT_KEY, id); } catch { /* لا شيء */ } };

export function Journey({ stations }: { stations: Station[] }) {
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
      const shapes = stations.map((s) => ({ id: s.id, label: s.label, sub: s.sub, symbol: s.symbol, layout: s.layout }));
      const w = createWorld(canvasRef.current, { tier, theme: themeRef.current === "light" ? "light" : "dark", stations: shapes, font, initial: stations[idx].id }) as World | null;
      worldRef.current = w;
      if (w) { syncRef.current(true); setReady(true); }
    });
    (window as unknown as { __serah?: unknown }).__serah = {
      debug: () => worldRef.current?.debug() ?? null,
      active: () => activeRef.current,
      expected: () => (scope.current ? stations[stationAtCenter(Array.from(scope.current.querySelectorAll<HTMLElement>("[data-station]"))).idx].id : null),
    };
    return () => { disposed = true; worldRef.current?.dispose(); worldRef.current = null; };
  }, [tier, stations]);

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
        w?.morph(stations[idx].id, layout(stations[idx], sections[idx]));
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
  }, [stations]);

  const current = target ?? stations[active].id;
  const prophets = useMemo(() => stations.filter(isProphet), [stations]);
  const menuItems = useMemo(() => buildMenu(stations), [stations]);
  const ci = stations.findIndex((s) => s.id === current), pi = prophets.findIndex((s) => s.id === current);
  // الأنبياء محطات ١..عددهم، والبداية والسيرة والقرآن بأسمائها فقط
  const pos = pi >= 0 ? `${(pi + 1).toLocaleString("ar-EG")} من ${prophets.length.toLocaleString("ar-EG")} — ${stations[ci].label}${stations[ci].id === "muhammad" ? " ﷺ" : isProphet(stations[ci]) ? " عليه السلام" : ""}` : stations[ci].label;

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
    const el = document.getElementById(`station-${stations[i].id}`);
    if (!el) return;
    const lenis = (window as unknown as { __lenis?: { scrollTo: (t: Element, o?: object) => void } }).__lenis;
    setTarget(stations[i].id);
    const done = () => { window.clearTimeout(targetTimer.current); setTarget(null); };
    window.clearTimeout(targetTimer.current);
    // احتياط: لو الطفل لمس السكرول أثناء النزول فلا يكتمل، نرجع لمتابعة السكرول بعد قليل
    targetTimer.current = window.setTimeout(done, 2500);
    if (lenis) lenis.scrollTo(el, { offset: 0, onComplete: done }); else el.scrollIntoView({ behavior: "smooth" });
  };
  // الرجوع من صفحة النبي (زر «رجوع للرحلة» ?at=… أو زر الرجوع في المتصفح/الموبايل): نقفز مباشرة لقسم النبي بدل أول الرحلة
  useEffect(() => {
    let id = "";
    try { id = new URLSearchParams(window.location.search).get("at") || sessionStorage.getItem(AT_KEY) || ""; sessionStorage.removeItem(AT_KEY); } catch { /* لا شيء */ }
    if (!id || !stations.some((s) => s.id === id)) return;
    const jump = () => {
      const el = document.getElementById(`station-${id}`);
      if (!el) return;
      const lenis = (window as unknown as { __lenis?: { scrollTo: (t: Element, o?: object) => void } }).__lenis;
      if (lenis) lenis.scrollTo(el, { offset: 0, immediate: true, force: true });
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior: "instant" as ScrollBehavior });
      syncRef.current(true);
    };
    jump();
    // مرة ثانية بعد استقرار التخطيط (تحميل الخطوط والمجسم)
    const t = window.setTimeout(jump, 350);
    const q = new URLSearchParams(window.location.search);
    if (q.has("at")) { q.delete("at"); window.history.replaceState(window.history.state, "", window.location.pathname + (q.size ? `?${q}` : "")); }
    return () => window.clearTimeout(t);
  }, [stations]);
  const pick = (id: string) => { setMenuOpen(false); go(stations.findIndex((s) => s.id === id)); };
  const menu = (className?: string) => <BranchedMenu label="محطات الرحلة" items={menuItems} active={current} onSelect={pick} className={className} />;

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
          {dots ? stations.map((s, i) => (
            <Tooltip key={s.id}>
              <TooltipTrigger render={
                <button type="button" onClick={() => go(i)} aria-label={s.title} aria-current={s.id === current ? "true" : undefined} className="relative grid size-7 shrink-0 place-items-center rounded-full">
                  {s.id === current && <motion.span layoutId="station-dot" className="absolute inset-0.5 rounded-full bg-gold/25" transition={{ type: "spring", stiffness: 400, damping: 30 }} />}
                  <span className={cn("relative size-2 rounded-full transition-all", s.id === current ? "scale-125 bg-gold" : s.symbol ? "bg-muted-foreground/60" : "bg-muted-foreground/30")} />
                </button>
              } />
              <TooltipContent side="left" className="font-bold">{isProphet(s) ? `${(prophets.indexOf(s) + 1).toLocaleString("ar-EG")} · ` : ""}{menuName(s)}</TooltipContent>
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
        {stations.map((s, i) => (
          <section
            key={s.id}
            id={`station-${s.id}`}
            data-station={s.id}
            className={cn("flex min-h-svh items-end px-4 pb-32 pt-24 md:items-center md:px-[6vw] md:pb-16 lg:pe-16", dots ? "lg:ps-[84px]" : "lg:ps-[250px]", i % 2 ? "md:justify-end" : "md:justify-start")}
          >
            <BlurFade inView inViewMargin="-20% 0px" className="w-full md:max-w-md">
              <div data-card className="rounded-[28px] border bg-card/90 p-5 shadow-soft backdrop-blur-md md:p-6">
                <div className="flex items-center gap-3">
                  {i === 0 && <Zaid mood="helping" size={84} />}
                  {i === stations.length - 1 && <Zaid mood="happy" size={84} />}
                  <div>
                    <span className="inline-block rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">{s.id === "start" ? g(s.tag, s.tag.replace("يا بطل", "يا بطلة")) : s.tag}</span>
                    {i === 0 ? (
                      <SplitText text={s.title} tag="h1" className="mt-2 text-4xl font-extrabold leading-tight text-foreground md:text-5xl" splitType="words" effect="rise" trigger="load" textAlign="right" />
                    ) : (
                      <h2 className="mt-2 text-2xl font-extrabold leading-tight sm:text-3xl md:text-4xl">{s.title}</h2>
                    )}
                  </div>
                </div>
                <p className="mt-3 text-base leading-8 text-muted-foreground"><RT text={s.id === "start" ? g(s.text, s.text.replace("انزل معانا", "انزلي معانا")) : s.id === "sira" ? g(s.text, s.text.replace("تعالَ نتعرّف", "تعالي نتعرّف")) : s.text} /></p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {i === 0 ? (
                    <button type="button" onClick={() => go(1)} className={buttonVariants({ variant: "gold", size: "lg2" })}>
                      يلا نبدأ <ArrowLeft />
                    </button>
                  ) : isProphet(s) ? (
                    <Link href={`/kid/prophet/?id=${s.id}`} onClick={() => rememberStation(s.id)} className={buttonVariants({ variant: "gold", size: "lg2" })}>
                      <BookOpen /> {g("ادخل الصفحة", "ادخلي الصفحة")}
                    </Link>
                  ) : s.id === "quran" ? (
                    <Link href="/kid/quran/" className={buttonVariants({ variant: "gold", size: "lg2" })}>
                      <BookOpen /> {g("اسمع واقرأ القرآن", "اسمعي واقرئي القرآن")}
                    </Link>
                  ) : s.id === "sira" ? (
                    <Link href="/kid/swords/" className={buttonVariants({ variant: "gold", size: "lg2" })}>
                      <Swords /> تعرّف على سيوف النبي ﷺ
                    </Link>
                  ) : (
                    <Link href="/kid/lectures/" className={buttonVariants({ variant: "secondary", size: "lg2" })}>
                      <Headphones /> {g("استمع للمحاضرات", "استمعي للمحاضرات")}
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
