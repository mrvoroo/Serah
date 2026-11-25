"use client";
import { Award, Lightbulb } from "lucide-react";
import { RT } from "@/components/religious-text";
import { Icon3D } from "@/components/icon3d";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/use-api";
import { g } from "@/lib/kid-text";
import { HADITH_ORDER, ar, hadithById, type Achievement, type ItemRelease } from "@/lib/eight";
import { ReleaseAttachment } from "@/components/eight/kid-duas";
import { cn } from "@/lib/utils";

const norm = (s: string) => s.replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/\s+/g, " ").trim();

// الأحاديث القصيرة للحفظ: المفتوح لفصل الطفل، مع شرح بسيط و«أطبّقه إزاي»، وشارة «حفظته» لما تسجّله المعلمة
export function KidHadith() {
  const { data, loading, error, reload } = useApi<ItemRelease[]>("kidReleases", { kind: "hadith" });
  const ach = useApi<Achievement[]>("myAchievements");
  const rel = Array.isArray(data) ? data : [];
  const byId = new Map(rel.map((r) => [r.zikr_id, r]));
  const list = HADITH_ORDER.map(hadithById).filter((h): h is NonNullable<typeof h> => !!h && byId.has(h.id));
  const got = new Set((Array.isArray(ach.data) ? ach.data : []).filter((a) => a.kind === "hadith").map((a) => norm(a.title)));
  const memorized = list.filter((h) => got.has(norm(h.title))).length;

  return (
    <section aria-labelledby="kh-title" className="flex flex-col gap-4">
      <header className="flex items-center gap-3">
        <Icon3D name="books" size={56} float />
        <div>
          <h1 id="kh-title" className="font-heading text-2xl font-extrabold">أحاديث نحفظها</h1>
          <p className="text-sm text-muted-foreground">كلام النبي ﷺ قصير وجميل، {g("احفظه وسمّعه للمعلمة وخد", "احفظيه وسمّعيه للمعلمة وخدي")} نجمتين ⭐</p>
        </div>
      </header>

      {loading && !data ? <Skeleton className="h-56 rounded-[28px]" /> : error && !data ? (
        <div className="rounded-[28px] border bg-card p-5 text-center">
          <p className="font-bold">تعذّر تحميل الأحاديث</p>
          <button type="button" onClick={() => reload()} className="mt-3 h-11 rounded-2xl bg-secondary px-4 font-bold">{g("حاول", "حاولي")} مرة أخرى</button>
        </div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[28px] border bg-card p-6 text-center">
          <Icon3D name="gift" size={64} float />
          <p className="font-heading text-lg font-extrabold">{g("أحاديثك جاية قريب", "أحاديثكِ جاية قريب")} 🤍</p>
          <p className="text-sm leading-7 text-muted-foreground">المعلمة هتفتح لك حديثًا جديدًا {g("تحفظه", "تحفظيه")}.</p>
        </div>
      ) : (
        <>
          <div role="status" className="flex items-center gap-2 rounded-2xl bg-secondary p-3 text-sm font-bold"><Award className="size-4 text-amber-500" /> {g("حفظت", "حفظتِ")} {ar(memorized)} من {ar(list.length)}</div>
          <ul className="flex flex-col gap-3">
            {list.map((h) => {
              const r = byId.get(h.id)!, done = got.has(norm(h.title));
              return (
                <li key={h.id} data-testid="hadith-card" className={cn("rounded-[28px] border bg-card p-4 shadow-soft", done && "border-amber-400/70")}>
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-heading text-lg font-extrabold">{h.title}</h2>
                    {done && <span className="shrink-0 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-300">🏅 {g("حفظته", "حفظتِه")}</span>}
                  </div>
                  <p className="mt-2 text-xl leading-[2.1]"><RT text={h.text} /></p>
                  <p className="mt-1 text-xs text-muted-foreground">رواه {h.narrator} — {h.ref} · {h.grade}</p>
                  <p className="mt-3 rounded-2xl bg-gold/10 p-3 text-sm leading-7">💡 {h.explain}</p>
                  <p className="mt-2 flex gap-2 rounded-2xl bg-emerald-500/10 p-3 text-sm leading-7"><Lightbulb className="mt-1 size-4 shrink-0 text-emerald-600" /> <span><b>نطبّقه إزاي؟</b> {h.apply}</span></p>
                  {r.note && <p className="mt-2 rounded-2xl bg-primary/10 p-3 text-sm leading-7"><b>من المعلمة:</b> {r.note}</p>}
                  <ReleaseAttachment r={r} />
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
