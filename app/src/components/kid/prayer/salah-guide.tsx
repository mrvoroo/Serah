"use client";
import { useState } from "react";
import { motion } from "motion/react";
import { Check, PlayCircle, RotateCcw } from "lucide-react";
import salah from "@/content/salah.json";
import { RT } from "@/components/religious-text";
import { cn } from "@/lib/utils";
import { g } from "@/lib/kid-text";
import { useMotionAllowed } from "@/lib/tier";

// أذكار ما بعد الصلاة كاملة، وعدد الركعات، وكيفية الصلاة (مع أماكن لفيديوهات يوتيوب)
// المحتوى مراجَع من الشيخ: content/salah.json
type Zikr = { id: string; text: string; count: number; ref: string; virtue?: string };
type Prayer = { id: string; name: string; fard: number; before: number; after: number; note: string };
type Step = { title: string; text: string; ref?: string; video?: string };
type Video = { title: string; youtubeId: string };
const S = salah as unknown as { meta: { note: string }; azkar: Zikr[]; prayers: Prayer[]; howTo: Step[]; videos: Video[] };
const ar = (n: number) => n.toLocaleString("ar-EG");
const TABS = [{ id: "azkar", label: "أذكار بعد الصلاة" }, { id: "rakat", label: "عدد الركعات" }, { id: "how", label: "كيفية الصلاة" }] as const;
type Tab = (typeof TABS)[number]["id"];

const ytId = (v?: string) => { const m = /(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/.exec(v || "") ?? /^([\w-]{11})$/.exec(v || ""); return m ? m[1] : ""; };
function VideoSlot({ id, title }: { id?: string; title: string }) {
  const v = ytId(id);
  if (!v) return <div className="flex aspect-video w-full flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed text-sm text-muted-foreground"><PlayCircle className="size-8" /> فيديو «{title}» قريبًا</div>;
  return <iframe className="aspect-video w-full rounded-2xl" src={`https://www.youtube-nocookie.com/embed/${v}?rel=0`} title={title} loading="lazy" allow="encrypted-media; picture-in-picture" allowFullScreen />;
}

export function SalahGuide() {
  const animate = useMotionAllowed();
  const [tab, setTab] = useState<Tab>("azkar");
  const [left, setLeft] = useState<Record<string, number>>({});
  const remaining = (z: Zikr) => left[z.id] ?? z.count;
  const tap = (z: Zikr) => setLeft((l) => ({ ...l, [z.id]: Math.max(0, remaining(z) - 1) }));
  const doneAll = S.azkar.every((z) => remaining(z) === 0);

  return (
    <section aria-labelledby="guide-title" className="flex flex-col gap-3">
      <h2 id="guide-title" className="font-ruqaa text-3xl text-primary">الصلاة نور</h2>
      <div role="tablist" aria-label="أقسام الصلاة" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={cn("h-11 rounded-2xl px-4 font-bold transition", tab === t.id ? "bg-hero text-white shadow-soft" : "bg-secondary text-secondary-foreground")}>{t.label}</button>
        ))}
      </div>

      {tab === "azkar" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>{g("اضغط", "اضغطي")} على الذكر بعد ما {g("تقوله", "تقوليه")} ليعدّ لك</span>
            <button type="button" onClick={() => setLeft({})} className="flex items-center gap-1 rounded-xl px-2 py-1 font-bold hover:bg-secondary"><RotateCcw className="size-4" /> من جديد</button>
          </div>
          {doneAll && <p className="rounded-2xl bg-emerald-500/15 p-3 text-center font-bold text-emerald-700 dark:text-emerald-300">ما شاء الله! {g("أتممت", "أتممتِ")} أذكار الصلاة 🌟</p>}
          <ol className="grid gap-3" aria-label="أذكار ما بعد الصلاة">
            {S.azkar.map((z, i) => {
              const r = remaining(z), done = r === 0;
              return (
                <motion.li key={z.id} initial={animate ? { opacity: 0, y: 10 } : false} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                  <div className={cn("rounded-[24px] border p-4 shadow-soft transition", done ? "border-emerald-500/40 bg-emerald-500/5" : "bg-card")}>
                    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                      <span className="grid size-6 place-items-center rounded-full bg-secondary">{ar(i + 1)}</span>
                      {z.count > 1 && <span>{ar(z.count)} مرات</span>}
                    </div>
                    <p className="mt-2 text-lg leading-[2.1]"><RT text={z.text} /></p>
                    {z.virtue && <p className="mt-2 rounded-2xl bg-gold/10 p-2 text-sm leading-7">{z.virtue}</p>}
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">{z.ref}</span>
                      <button type="button" onClick={() => tap(z)} disabled={done} aria-label={`عدّ: ${ar(r)} متبقية`}
                        className={cn("flex h-11 min-w-24 items-center justify-center gap-1 rounded-2xl px-4 font-bold transition active:scale-95", done ? "bg-emerald-500 text-white" : "bg-primary text-primary-foreground")}>
                        {done ? <><Check className="size-5" /> تم</> : z.count > 1 ? `${ar(r)} ✋` : "قلته"}
                      </button>
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </ol>
        </div>
      )}

      {tab === "rakat" && (
        <div className="overflow-hidden rounded-[24px] border bg-card shadow-soft">
          <div className="grid grid-cols-4 gap-1 bg-secondary/60 p-3 text-center text-sm font-bold"><span>الصلاة</span><span>سنة قبلها</span><span>الفريضة</span><span>سنة بعدها</span></div>
          {S.prayers.map((p) => (
            <div key={p.id} className="border-t p-3">
              <div className="grid grid-cols-4 gap-1 text-center"><span className="font-heading font-extrabold">{p.name}</span><span>{p.before ? ar(p.before) : "—"}</span><span className="font-extrabold text-primary">{ar(p.fard)}</span><span>{p.after ? ar(p.after) : "—"}</span></div>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{p.note}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "how" && (
        <div className="flex flex-col gap-3">
          <ol className="grid gap-3" aria-label="خطوات الصلاة">
            {S.howTo.map((s, i) => (
              <li key={i} className="rounded-[24px] border bg-card p-4 shadow-soft">
                <h3 className="flex items-center gap-2 font-heading text-lg font-extrabold"><span className="grid size-8 place-items-center rounded-full bg-hero text-sm text-white">{ar(i + 1)}</span>{s.title}</h3>
                <p className="mt-2 leading-8"><RT text={s.text} /></p>
                {s.ref && <p className="mt-1 text-xs text-muted-foreground"><RT text={s.ref} /></p>}
                {ytId(s.video) && <div className="mt-3"><VideoSlot id={s.video} title={s.title} /></div>}
              </li>
            ))}
          </ol>
          <h3 className="font-heading text-lg font-extrabold">فيديوهات</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {S.videos.map((v) => <figure key={v.title} className="flex flex-col gap-2"><VideoSlot id={v.youtubeId} title={v.title} /><figcaption className="text-center text-sm font-bold">{v.title}</figcaption></figure>)}
          </div>
        </div>
      )}
      {S.meta.note && <p className="rounded-2xl bg-secondary/50 p-3 text-xs leading-6 text-muted-foreground">{S.meta.note}</p>}
    </section>
  );
}
