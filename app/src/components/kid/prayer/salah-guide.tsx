"use client";
import { useState } from "react";
import { PlayCircle, RotateCcw } from "lucide-react";
import salah from "@/content/salah.json";
import { RT } from "@/components/religious-text";
import { KursiBody } from "./kursi-card";
import { AzkarDeck } from "./azkar-deck";
import { cn } from "@/lib/utils";
import { g } from "@/lib/kid-text";
import { loadPlace, PRAYER_IDS, PRAYER_NAMES, timesFor, type PrayerId } from "@/lib/prayer";
import { useApi } from "@/hooks/use-api";
import { videoFor, ytId, type SalahExtras } from "@/lib/salah-extras";

// أذكار ما بعد الصلاة كاملة، وعدد الركعات، وكيفية الصلاة (مع أماكن لفيديوهات يوتيوب)
// المحتوى مراجَع من الشيخ: content/salah.json
// countAfter: عدد مختلف بعد صلوات معينة (المعوذات ٣ بعد الفجر والمغرب)، only: ذكر خاص بصلوات معينة
// extra: ذكر إضافي أضافته الأدمن (يظهر بعد الأذكار الأصلية)
type Zikr = { id: string; text: string; count: number; ref: string; virtue?: string; countAfter?: Partial<Record<PrayerId, number>>; only?: PrayerId[]; extra?: boolean; grade?: string };
type Prayer = { id: string; name: string; fard: number; before: number; after: number; note: string };
type Step = { id: string; title: string; text: string; ref?: string; video?: string };
type Video = { id: string; title: string; youtubeId: string };
const S = salah as unknown as { meta: { note: string }; azkar: Zikr[]; prayers: Prayer[]; howTo: Step[]; videos: Video[] };
const ar = (n: number) => n.toLocaleString("ar-EG");

const TABS = [{ id: "azkar", label: "أذكار بعد الصلاة" }, { id: "rakat", label: "عدد الركعات" }, { id: "how", label: "كيفية الصلاة" }] as const;
type Tab = (typeof TABS)[number]["id"];

// آخر صلاة دخل وقتها (حسب مواقيت مكان الطفل) — بعدها نعرض أذكارها مباشرة
function lastPrayer(now = new Date()): PrayerId {
  try {
    const t = timesFor(now, loadPlace());
    let last: PrayerId = "isha";
    for (const p of PRAYER_IDS) if (t[p] <= now) last = p;
    return last;
  } catch { return "fajr"; }
}

function VideoSlot({ id, title }: { id?: string; title: string }) {
  const v = ytId(id);
  if (!v) return <div className="flex aspect-video w-full flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed text-sm text-muted-foreground"><PlayCircle className="size-8" /> فيديو «{title}» قريبًا</div>;
  return <iframe className="aspect-video w-full rounded-2xl" src={`https://www.youtube-nocookie.com/embed/${v}?rel=0`} title={title} loading="lazy" allow="encrypted-media; picture-in-picture" allowFullScreen />;
}

export function SalahGuide() {
  const [tab, setTab] = useState<Tab>("azkar");
  const [after, setAfter] = useState<PrayerId>(() => lastPrayer());
  const [left, setLeft] = useState<Record<string, number>>({});
  // الإضافات من الأدمن (لو فشل التحميل تبقى الأذكار والفيديوهات الأصلية كما هي)
  const { data: extras } = useApi<SalahExtras>("salahExtras");
  // الأذكار التي اختارتها المعلمة في قسم مستقل بعد أذكار السنة (مراجعة الشيخ: لا تختلط بها ولا تدخل في رسالة الإتمام)
  const added: Zikr[] = (Array.isArray(extras?.azkar) ? extras.azkar : []).map((z) => ({ id: z.zikr_id, text: z.text, count: z.count, ref: z.ref, virtue: z.virtue || undefined, grade: z.grade || undefined, extra: true }));
  const fits = (z: Zikr) => !z.only || z.only.includes(after);
  const list = S.azkar.filter(fits), chosen = added.filter(fits);
  const countOf = (z: Zikr) => z.countAfter?.[after] ?? z.count;
  const remaining = (z: Zikr) => Math.min(left[z.id] ?? countOf(z), countOf(z)); // لو قلّ عدد ذكر بعد التحديث
  const tap = (z: Zikr) => setLeft((l) => ({ ...l, [z.id]: Math.max(0, remaining(z) - 1) }));
  const doneAll = list.every((z) => remaining(z) === 0);
  const pick = (p: PrayerId) => { setAfter(p); setLeft({}); };
  const [round, setRound] = useState(0); // «من جديد» يرجع لأول كارت
  const kursiBody = (z: Zikr, done: boolean) => (z.id === "kursi" && !z.extra ? <KursiBody text={z.text} quranRef={z.ref} done={done} /> : null);

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
            <span>{g("اضغط", "اضغطي")} على الكارت بعد ما {g("تقول", "تقولي")} الذكر ليعدّ لك</span>
            <button type="button" onClick={() => { setLeft({}); setRound((n) => n + 1); }} className="flex items-center gap-1 rounded-xl px-2 py-1 font-bold hover:bg-secondary"><RotateCcw className="size-4" /> من جديد</button>
          </div>
          <div role="radiogroup" aria-label="أذكار بعد صلاة" className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold">بعد صلاة:</span>
            {PRAYER_IDS.map((p) => (
              <button key={p} type="button" role="radio" aria-checked={after === p} onClick={() => pick(p)}
                className={cn("h-10 rounded-2xl px-3 text-sm font-bold transition", after === p ? "bg-gold text-[#3D2600] shadow-soft" : "bg-secondary text-secondary-foreground")}>{PRAYER_NAMES[p]}</button>
            ))}
          </div>
          {doneAll && <p className="rounded-2xl bg-emerald-500/15 p-3 text-center font-bold text-emerald-700 dark:text-emerald-300">ما شاء الله! {g("أتممت", "أتممتِ")} أذكار الصلاة 🌟</p>}
          <AzkarDeck key={`${after}:${round}`} list={list} label="أذكار ما بعد الصلاة" remaining={remaining} countOf={countOf} onTap={tap} renderBody={kursiBody} />
          {chosen.length > 0 && (
            <section aria-labelledby="chosen-title" className="mt-2 flex flex-col gap-3">
              <div>
                <h3 id="chosen-title" className="font-heading text-lg font-extrabold">أذكار اختارتها لك المعلمة</h3>
                <p className="text-sm leading-7 text-muted-foreground">هذه أذكار ثابتة من السنة اختارتها المعلمة، وليست من أذكار ما بعد الصلاة المعروفة.</p>
              </div>
              <AzkarDeck key={`c:${after}:${round}`} list={chosen} label="أذكار اختارتها المعلمة" remaining={remaining} countOf={countOf} onTap={tap} />
            </section>
          )}
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
                {videoFor(`how:${s.id}`, s.video, extras) && <div className="mt-3"><VideoSlot id={videoFor(`how:${s.id}`, s.video, extras)} title={s.title} /></div>}
              </li>
            ))}
          </ol>
          <h3 className="font-heading text-lg font-extrabold">فيديوهات</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {S.videos.map((v) => <figure key={v.id} className="flex flex-col gap-2"><VideoSlot id={videoFor(`vid:${v.id}`, v.youtubeId, extras)} title={v.title} /><figcaption className="text-center text-sm font-bold">{v.title}</figcaption></figure>)}
          </div>
        </div>
      )}
      {S.meta.note && <p className="rounded-2xl bg-secondary/50 p-3 text-xs leading-6 text-muted-foreground">{S.meta.note}</p>}
    </section>
  );
}
