"use client";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronLeft, ChevronRight, Lightbulb, Search, Sparkles, X } from "lucide-react";
import data from "@/content/asma-husna.json";
import { RT } from "@/components/religious-text";
import { Icon3D } from "@/components/icon3d";
import { useMotionAllowed } from "@/lib/tier";
import { g } from "@/lib/kid-text";
import { cn } from "@/lib/utils";

// أسماء الله الحسنى: ٩٩ نجمة مضيئة بخط الرقعة في سماء ليلية، والضغط على اسم يفتح بطاقته
// (المعنى، والشرح، والدليل بخط المصحف، ودرس عملي). المحتوى مراجَع من الشيخ: content/asma-husna.json
type Name = { n: number; name: string; plain: string; meaning: string; detail: string; ref: string; lesson: string };
const NAMES = (data as { names: Name[] }).names;
const NOTE = (data as { meta?: { note?: string } }).meta?.note ?? "";
const SEEN_KEY = "serah_asma_seen";
const ar = (v: number) => v.toLocaleString("ar-EG");
// إزالة التشكيل للبحث
const bare = (s: string) => s.replace(/[ً-ْٰـ]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه");

function loadSeen(): number[] { try { return JSON.parse(localStorage.getItem(SEEN_KEY) || "[]"); } catch { return []; } }

export function AsmaHusna() {
  const animate = useMotionAllowed();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  // شاشات الطفل تُرسم في المتصفح فقط (بعد التحقق من الدخول)، فالقراءة المباشرة آمنة
  const [seen, setSeen] = useState<number[]>(() => (typeof window === "undefined" ? [] : loadSeen()));

  const list = useMemo(() => {
    const k = bare(q.trim());
    return k ? NAMES.filter((x) => bare(x.plain).includes(k) || bare(x.meaning).includes(k)) : NAMES;
  }, [q]);

  const show = (n: number) => {
    setOpen(n);
    setSeen((s) => { if (s.includes(n)) return s; const next = [...s, n]; try { localStorage.setItem(SEEN_KEY, JSON.stringify(next)); } catch { /* لا شيء */ } return next; });
  };
  const cur = open ? NAMES.find((x) => x.n === open) : null;
  const step = (d: number) => { if (!open) return; const i = NAMES.findIndex((x) => x.n === open); show(NAMES[(i + d + NAMES.length) % NAMES.length].n); };

  useEffect(() => {
    if (!open) return;
    // في RTL: السهم الأيمن = السابق، والأيسر = التالي
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); if (e.key === "ArrowLeft") step(1); if (e.key === "ArrowRight") step(-1); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div className="flex flex-col gap-4">
      <section className="relative overflow-hidden rounded-[32px] bg-[radial-gradient(ellipse_at_top,#2B1C6E_0%,#120A30_70%)] p-5 text-center text-white shadow-soft">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-70 [background-image:radial-gradient(1.5px_1.5px_at_20%_30%,#fff,transparent),radial-gradient(1px_1px_at_70%_20%,#FFC24D,transparent),radial-gradient(1.5px_1.5px_at_85%_65%,#fff,transparent),radial-gradient(1px_1px_at_35%_80%,#9C8BFF,transparent),radial-gradient(1px_1px_at_55%_50%,#fff,transparent)]" />
        <Icon3D name="sparkles" size={48} float className="mx-auto" />
        <h1 className="mt-1 font-ruqaa text-5xl leading-tight text-[#FFD57A] drop-shadow-[0_0_18px_rgba(255,194,77,0.5)]">أسماء الله الحسنى</h1>
        <p className="mt-2 text-sm leading-7 text-white/85">قال النبي ﷺ: «إن لله تسعة وتسعين اسمًا… من أحصاها دخل الجنة» <span className="text-white/60">(البخاري ٢٧٣٦، مسلم ٢٦٧٧)</span></p>
        <div className="mx-auto mt-3 flex w-fit items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-bold backdrop-blur">
          <Sparkles className="size-4 text-[#FFC24D]" /> {g("تعرّفت", "تعرّفتِ")} على {ar(seen.length)} من {ar(NAMES.length)}
        </div>
        <div className="mx-auto mt-2 h-2 max-w-xs overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-gradient-to-l from-[#FFC24D] to-[#FF8FCB] transition-all" style={{ width: `${(seen.length / Math.max(1, NAMES.length)) * 100}%` }} /></div>
      </section>

      <label className="relative">
        <Search className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={g("دوّر على اسم أو معنى…", "دوّري على اسم أو معنى…")} aria-label="بحث في الأسماء"
          className="h-12 w-full rounded-2xl border bg-card ps-12 pe-4 text-base shadow-soft outline-none focus-visible:ring-4 focus-visible:ring-primary/20" />
      </label>

      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5" aria-label="الأسماء">
        {list.map((x, i) => {
          const done = seen.includes(x.n);
          return (
            <li key={x.n}>
              <motion.button type="button" onClick={() => show(x.n)} aria-label={`${x.plain} — ${x.meaning}`}
                initial={animate ? { opacity: 0, scale: 0.6 } : false} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: Math.min(i, 30) * 0.015, type: "spring", stiffness: 220, damping: 18 }}
                whileHover={animate ? { scale: 1.08, rotate: i % 2 ? 2 : -2 } : undefined} whileTap={animate ? { scale: 0.94 } : undefined}
                className={cn("group relative flex aspect-square w-full flex-col items-center justify-center gap-1 overflow-hidden rounded-[26px] border p-2 text-center shadow-soft transition-shadow",
                  "bg-[radial-gradient(circle_at_50%_35%,#3A2A8F_0%,#181040_75%)] text-white hover:shadow-[0_0_28px_-4px_rgba(255,194,77,0.7)]",
                  done ? "border-[#FFC24D]/70" : "border-white/10")}>
                <span aria-hidden className="absolute start-2 top-2 grid size-6 place-items-center rounded-full bg-white/10 text-[10px] font-bold">{ar(x.n)}</span>
                {done && <Check aria-hidden className="absolute end-2 top-2 size-4 text-[#FFC24D]" />}
                <motion.span aria-hidden className="pointer-events-none absolute inset-0 rounded-[26px] bg-[radial-gradient(circle_at_50%_40%,rgba(255,194,77,0.28),transparent_60%)]"
                  animate={animate ? { opacity: [0.35, 0.9, 0.35] } : undefined} transition={{ duration: 3 + (x.n % 5) * 0.4, repeat: Infinity, delay: (x.n % 7) * 0.3 }} />
                <span className="relative font-ruqaa text-[clamp(1.25rem,4.6vw,1.9rem)] leading-tight text-[#FFD57A] drop-shadow-[0_0_10px_rgba(255,194,77,0.55)]">{x.plain}</span>
                <span className="relative line-clamp-1 px-1 text-[11px] text-white/70">{x.meaning}</span>
              </motion.button>
            </li>
          );
        })}
        {!list.length && <li className="col-span-full rounded-[24px] border bg-card p-6 text-center text-muted-foreground">مفيش اسم بالكلمة دي</li>}
      </ul>
      {NOTE && <p className="rounded-2xl bg-secondary/50 p-3 text-xs leading-6 text-muted-foreground">{NOTE}</p>}

      <AnimatePresence>
        {cur && (
          <motion.div key="overlay" role="dialog" aria-modal="true" aria-label={`اسم الله ${cur.plain}`} className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(null)}>
            <motion.div key={cur.n} onClick={(e) => e.stopPropagation()}
              initial={animate ? { scale: 0.7, rotateX: 20, opacity: 0 } : false} animate={{ scale: 1, rotateX: 0, opacity: 1 }} exit={animate ? { scale: 0.85, opacity: 0 } : { opacity: 0 }}
              transition={{ type: "spring", stiffness: 240, damping: 22 }}
              className="relative max-h-[88svh] w-full max-w-md overflow-y-auto rounded-[32px] border border-[#FFC24D]/40 bg-[radial-gradient(ellipse_at_top,#2E1F78_0%,#130B33_70%)] p-6 text-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]">
              <button type="button" onClick={() => setOpen(null)} aria-label="إغلاق" className="absolute end-3 top-3 grid size-10 place-items-center rounded-full bg-white/10"><X className="size-5" /></button>
              <p className="text-center text-xs font-bold text-white/60">الاسم {ar(cur.n)} من {ar(NAMES.length)}</p>
              <div className="relative my-3 grid place-items-center">
                <motion.div aria-hidden className="absolute size-44 rounded-full bg-[#FFC24D]/25 blur-3xl" animate={animate ? { scale: [1, 1.2, 1] } : undefined} transition={{ duration: 3, repeat: Infinity }} />
                <h2 className="relative font-ruqaa text-7xl leading-[1.3] text-[#FFD57A] drop-shadow-[0_0_22px_rgba(255,194,77,0.6)]">{cur.plain}</h2>
              </div>
              <p className="text-center font-quran text-3xl leading-[2.2] text-white/90">{cur.name}</p>
              <p className="text-center font-heading text-xl font-extrabold">{cur.meaning}</p>
              <p className="mt-3 leading-8 text-white/90"><RT text={cur.detail} /></p>
              {cur.ref && <p className="mt-3 rounded-2xl bg-white/10 p-3 leading-9"><span className="text-xs font-bold text-white/60">الدليل: </span><RT text={cur.ref} /></p>}
              <p className="mt-3 flex gap-2 rounded-2xl bg-[#FFC24D]/15 p-3 font-bold leading-7"><Lightbulb className="mt-1 size-5 shrink-0 text-[#FFC24D]" /> <span>{cur.lesson}</span></p>
              <div className="mt-4 flex items-center justify-between gap-2">
                <button type="button" onClick={() => step(-1)} aria-label="الاسم السابق" className="flex h-11 items-center gap-1 rounded-2xl bg-white/10 px-4 font-bold"><ChevronRight className="size-5" /> السابق</button>
                <button type="button" onClick={() => step(1)} aria-label="الاسم التالي" className="flex h-11 items-center gap-1 rounded-2xl bg-[#FFC24D] px-4 font-bold text-[#2A1300]">التالي <ChevronLeft className="size-5" /></button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
