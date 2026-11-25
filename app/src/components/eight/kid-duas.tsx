"use client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, ChevronDown, FileText } from "lucide-react";
import confetti from "canvas-confetti";
import { RT } from "@/components/religious-text";
import { Icon3D } from "@/components/icon3d";
import { AudioPlayer } from "@/components/audio-player";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/use-api";
import { useHydrated } from "@/hooks/use-hydrated";
import { api, driveImage } from "@/lib/api";
import { invalidate } from "@/hooks/use-api";
import { g } from "@/lib/kid-text";
import { dayContext } from "@/lib/prayer";
import { useMotionAllowed } from "@/lib/tier";
import { DUA_ORDER, ar, duaById, isoToday, loadMarks, saveMarks, type ItemRelease } from "@/lib/eight";
import { cn } from "@/lib/utils";

// مرفق المعلمة تحت الدعاء أو الحديث: صورة أو تسجيل صوتي أو ملف
export function ReleaseAttachment({ r }: { r: ItemRelease }) {
  if (!r.file_id) return null;
  if (r.file_kind === "image") return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={driveImage(r.file_id, 900)} alt={r.file_name || "صورة من المعلمة"} loading="lazy" className="mt-3 w-full rounded-2xl border object-contain" />
  );
  if (r.file_kind === "audio") return <AudioPlayer id={r.file_id} className="mt-3" />;
  return (
    <a href={`https://drive.google.com/file/d/${encodeURIComponent(r.file_id)}/view`} target="_blank" rel="noopener noreferrer"
      className="mt-3 flex items-center gap-2 rounded-2xl bg-secondary p-3 font-bold"><FileText className="size-5" /> {r.file_name || "ملف من المعلمة"}</a>
  );
}

// أدعية اليوم والليلة للطفل: المفتوح لفصله فقط، ولما يضغط «قلته» على كل الأدعية يكسب نجمة مرة في اليوم
export function KidDuas() {
  const hydrated = useHydrated();
  const animate = useMotionAllowed();
  const { data, loading, error, reload } = useApi<ItemRelease[]>("kidReleases", { kind: "dua" });
  const [marks, setMarks] = useState<string[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const sent = useRef(false);
  const today = hydrated ? isoToday() : "";
  useEffect(() => { if (today) setMarks(loadMarks(today)); }, [today]); // eslint-disable-line react-hooks/set-state-in-effect

  const rel = Array.isArray(data) ? data : [];
  const byId = new Map(rel.map((r) => [r.zikr_id, r]));
  const list = DUA_ORDER.map(duaById).filter((d): d is NonNullable<typeof d> => !!d && byId.has(d.id));
  const newest = rel.find((r) => duaById(r.zikr_id));
  const doneAll = list.length > 0 && list.every((d) => marks.includes(d.id));

  const finished = async () => {
    if (sent.current) return;
    sent.current = true;
    try {
      const r = await api<{ stars: number }>("duaDone", { date: isoToday(), ...dayContext() });
      invalidate("me"); invalidate("leaderboard");
      if (r.stars) {
        toast.success(`${g("أحسنت", "أحسنتِ")}! ${g("كسبت", "كسبتِ")} نجمة ⭐`);
        if (animate) confetti({ particleCount: 70, spread: 70, origin: { y: 0.7 } });
      }
    } catch { sent.current = false; }
  };
  useEffect(() => { if (doneAll) void finished(); }, [doneAll]); // eslint-disable-line react-hooks/exhaustive-deps
  const mark = (id: string) => setMarks((m) => { const n = m.includes(id) ? m.filter((x) => x !== id) : [...m, id]; saveMarks(isoToday(), n); return n; });

  return (
    <section aria-labelledby="kd-title" className="flex flex-col gap-4">
      <header className="flex items-center gap-3">
        <Icon3D name="moon" size={56} float />
        <div>
          <h1 id="kd-title" className="font-heading text-2xl font-extrabold">أدعية اليوم والليلة</h1>
          <p className="text-sm text-muted-foreground">{g("قول كل دعاء في وقته، واضغط «قلته» عليه", "قولي كل دعاء في وقته، واضغطي «قلته» عليه")}، و{g("لما تخلّصهم كلهم تكسب", "لما تخلّصيهم كلهم تكسبي")} نجمة كل يوم ⭐</p>
        </div>
      </header>

      {loading && !data ? <Skeleton className="h-56 rounded-[28px]" /> : error && !data ? (
        <div className="rounded-[28px] border bg-card p-5 text-center">
          <p className="font-bold">تعذّر تحميل الأدعية</p>
          <button type="button" onClick={() => reload()} className="mt-3 h-11 rounded-2xl bg-secondary px-4 font-bold">{g("حاول", "حاولي")} مرة أخرى</button>
        </div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[28px] border bg-card p-6 text-center">
          <Icon3D name="gift" size={64} float />
          <p className="font-heading text-lg font-extrabold">{g("أدعيتك جاية قريب", "أدعيتكِ جاية قريب")} 🤍</p>
          <p className="text-sm leading-7 text-muted-foreground">المعلمة هتفتح لك دعاءً جديدًا كل فترة، {g("وهيوصلك", "وهيوصلكِ")} إشعار أول ما يتفتح.</p>
        </div>
      ) : (
        <>
          {newest && (() => { const d = duaById(newest.zikr_id)!; return (
            <div data-testid="new-dua" className="rounded-[28px] bg-hero p-4 text-white shadow-soft">
              <p className="text-sm font-bold text-white/85">✨ أحدث دعاء</p>
              <p className="mt-1 font-heading text-xl font-extrabold">{d.icon} {d.title}</p>
            </div>
          ); })()}
          <div className="flex items-center gap-2 rounded-2xl bg-secondary p-3 text-sm font-bold" role="status">
            <Check className="size-4 text-emerald-500" /> قلت اليوم {ar(list.filter((d) => marks.includes(d.id)).length)} من {ar(list.length)}
          </div>
          {doneAll && <p className="rounded-2xl bg-emerald-500/15 p-3 text-center font-bold text-emerald-700 dark:text-emerald-300">ما شاء الله! {g("قلت", "قلتِ")} أدعيتك كلها النهارده 🌟</p>}
          <ul className="flex flex-col gap-3">
            {list.map((d) => {
              const r = byId.get(d.id)!, on = marks.includes(d.id), more = open === d.id;
              return (
                <li key={d.id} data-testid="dua-card" className={cn("rounded-[28px] border bg-card p-4 shadow-soft transition", on && "border-emerald-500/60")}>
                  <div className="flex items-center gap-3">
                    <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-2xl">{d.icon}</span>
                    <h2 className="flex-1 font-heading text-lg font-extrabold">{d.title}</h2>
                    <button type="button" aria-pressed={on} onClick={() => mark(d.id)}
                      className={cn("flex h-11 shrink-0 items-center gap-1 rounded-2xl px-3 font-bold transition", on ? "bg-emerald-500 text-white" : "bg-secondary")}>
                      <Check className="size-4" /> {on ? g("قلته", "قلتِه") : "قلته"}
                    </button>
                  </div>
                  <p className="mt-3 text-xl leading-[2.2]"><RT text={d.text} /></p>
                  <p className="mt-2 rounded-2xl bg-gold/10 p-3 text-sm leading-7">💡 {d.kidNote}</p>
                  {r.note && <p className="mt-2 rounded-2xl bg-primary/10 p-3 text-sm leading-7"><b>من المعلمة:</b> {r.note}</p>}
                  <ReleaseAttachment r={r} />
                  <button type="button" aria-expanded={more} onClick={() => setOpen(more ? null : d.id)} className="mt-2 flex min-h-10 items-center gap-1 rounded-xl px-1 text-sm font-bold text-primary">
                    <ChevronDown className={cn("size-4 transition", more && "rotate-180")} /> الدليل
                  </button>
                  {more && (
                    <div className="mt-2 flex flex-col gap-1 rounded-2xl bg-secondary/60 p-3 text-sm leading-7">
                      {d.virtue && <p><b>الفضل:</b> {d.virtue}</p>}
                      {d.hadith && <p><RT text={d.hadith} /></p>}
                      <p className="text-xs text-muted-foreground">المرجع: {d.ref} · {d.grade}</p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
