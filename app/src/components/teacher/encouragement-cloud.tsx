"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import data from "@/content/teacher-encouragement.json";
import { useMotionAllowed } from "@/lib/tier";
import { RT } from "@/components/religious-text";

// سحابة تشجيع للمعلمات: كل فترة تظهر سحابة لطيفة فيها حديث صحيح أو قول عالم عن فضل تعليم الدين، مع مرجعه
// (المحتوى مراجَع شرعيًا: content/teacher-encouragement.json). تُغلق بضغطة، ولا تتكرر نفس العبارة قريبًا.
type Item = { text: string; source: string; grade?: string; kind?: string; note?: string };
const ITEMS = (data as { items: Item[] }).items;
const FIRST_MS = 30_000, EVERY_MS = 12 * 60_000, SHOW_MS = 45_000;
const KEY = "serah_cloud";

function nextIndex() {
  let seen: number[] = [];
  try { seen = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { /* لا شيء */ }
  const fresh = ITEMS.map((_, i) => i).filter((i) => !seen.includes(i));
  const pool = fresh.length ? fresh : ITEMS.map((_, i) => i);
  const i = pool[Math.floor(Math.random() * pool.length)];
  try { localStorage.setItem(KEY, JSON.stringify([...(fresh.length ? seen : []), i].slice(-Math.max(1, ITEMS.length - 1)))); } catch { /* لا شيء */ }
  return i;
}

export function EncouragementCloud() {
  const [item, setItem] = useState<Item | null>(null);
  const animate = useMotionAllowed();
  const hide = useRef(0);

  const show = useCallback(() => {
    if (!ITEMS.length || document.hidden) return;
    setItem(ITEMS[nextIndex()]);
    window.clearTimeout(hide.current);
    hide.current = window.setTimeout(() => setItem(null), SHOW_MS);
  }, []);

  useEffect(() => {
    const first = window.setTimeout(show, FIRST_MS);
    const every = window.setInterval(show, EVERY_MS);
    // للاختبارات: إظهار السحابة فورًا
    (window as unknown as { __cloud?: () => void }).__cloud = show;
    return () => { window.clearTimeout(first); window.clearInterval(every); window.clearTimeout(hide.current); };
  }, [show]);

  return (
    <AnimatePresence>
      {item && (
        <motion.aside role="status" aria-live="polite" aria-label="رسالة تشجيع"
          initial={animate ? { opacity: 0, y: 40, scale: 0.9 } : false} animate={{ opacity: 1, y: 0, scale: 1 }} exit={animate ? { opacity: 0, y: 30, scale: 0.95 } : { opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          className="fixed bottom-4 end-4 z-50 w-[min(24rem,calc(100vw-2rem))]">
          <div className="relative">
            {/* السحابة: فقاعات دائرية فوق البطاقة تطفو بهدوء (البطاقة نفسها ثابتة حتى يسهل الضغط على الإغلاق) */}
            <motion.div aria-hidden animate={animate ? { y: [0, -5, 0] } : undefined} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="pointer-events-none absolute -top-7 start-8 flex items-end gap-0">
              <span className="block size-12 rounded-full bg-card shadow-soft" />
              <span className="-ms-4 block size-16 rounded-full bg-card shadow-soft" />
              <span className="-ms-5 block size-11 rounded-full bg-card shadow-soft" />
            </motion.div>
            <div className="relative rounded-[32px] border bg-card p-5 pt-6 shadow-soft">
              <button type="button" onClick={() => setItem(null)} aria-label="إغلاق" className="absolute end-3 top-3 grid size-9 place-items-center rounded-full bg-secondary"><X className="size-4" /></button>
              <p className="mb-2 text-xs font-bold text-gold">{item.kind === "قول عالم" ? "من أقوال العلماء" : "من هدي النبي ﷺ"}</p>
              <p className="font-heading text-lg font-extrabold leading-9">«<RT text={item.text} />»</p>
              <p className="mt-2 text-xs text-muted-foreground"><RT text={item.source} />{item.grade ? ` — ${item.grade}` : ""}</p>
              {item.note && <p className="mt-3 rounded-2xl bg-secondary px-3 py-2 text-sm font-bold">{item.note}</p>}
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
