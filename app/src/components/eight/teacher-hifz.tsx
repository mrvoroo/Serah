"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, Star } from "lucide-react";
import { Icon3D } from "@/components/icon3d";
import { KidAvatar } from "@/components/kid/kid-avatar";
import { AudioPlayer } from "@/components/audio-player";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRequireRole } from "@/components/kid/kid-shell";
import { ClassSelect, useClassScope } from "@/components/teacher/class-picker";
import { GardenGrid } from "@/components/eight/garden";
import { invalidate, useApi } from "@/hooks/use-api";
import { api, fmtDate, type Kid } from "@/lib/api";
import { HADITH_ORDER, RATING, ar, hadithById, surahName, type Achievement, type Garden, type Recitation } from "@/lib/eight";
import { cn } from "@/lib/utils";

const norm = (s: string) => s.replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/\s+/g, " ").trim();

// حفظ الطلاب: تختار المعلمة الطفل، فترى حديقة جزء عمّ وتؤكد السور (١٠ نجوم)، وتسجّل الأحاديث المحفوظة (نجمتان)
export function TeacherHifz() {
  const me = useRequireRole(["teacher", "admin", "superadmin"]);
  const scope = useClassScope();
  const params = scope.class_id ? { class_id: scope.class_id } : {};
  const students = useApi<(Kid & { gender?: "m" | "f" })[]>("students", params, { enabled: !!me && scope.ready });
  const kids = Array.isArray(students.data) ? students.data : [];
  const [sel, setSel] = useState("");
  const kid = kids.find((k) => k.user_id === sel) ?? kids[0];
  const garden = useApi<Garden>("garden", { user_id: kid?.user_id ?? "" }, { enabled: !!kid });
  const ach = useApi<Achievement[]>("kidAchievements", { user_id: kid?.user_id ?? "" }, { enabled: !!kid });
  const [tab, setTab] = useState<"surah" | "hadith">("surah");
  const [busy, setBusy] = useState<string | number | null>(null);
  const [pick, setPick] = useState<number | null>(null);
  const it = pick ? garden.data?.items.find((i) => i.surah === pick) : undefined;
  const achList = Array.isArray(ach.data) ? ach.data : [];
  const hadithKey = (title: string) => achList.find((a) => a.kind === "hadith" && norm(a.title) === norm(title))?.key;

  const confirm = async (n: number, on: boolean) => {
    if (!kid) return;
    setBusy(n);
    try {
      const r = await api<{ stars: number; juz: boolean }>("confirmSurah", { user_id: kid.user_id, surah: n, on });
      toast.success(on ? `تم تأكيد حفظ سورة ${surahName(n)}${r.stars > 0 ? ` (+${ar(r.stars)} نجمة)` : ""}${r.juz ? ` — و${kid.gender === "f" ? "أتمّت" : "أتمّ"} جزء عمّ 🏆` : ""}` : `اتلغى تأكيد سورة ${surahName(n)}`);
      invalidate("garden"); invalidate("kidAchievements"); await Promise.all([garden.reload(), ach.reload()]); setPick(null);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  };
  const toggleHadith = async (id: string) => {
    const h = hadithById(id); if (!h || !kid) return;
    const key = hadithKey(h.title);
    setBusy(id);
    try {
      if (key) { if (!window.confirm(`إلغاء تسجيل «${h.title}»؟ تُسحب نجمتاه`)) return; await api("deleteKidAchievement", { key }); toast.success("اتلغى التسجيل"); }
      else { await api("kidAchievement", { user_id: kid.user_id, kind: "hadith", title: h.title }); toast.success(`سجّلنا حفظ «${h.title}» (+٢ نجمة)`); }
      invalidate("kidAchievements"); await ach.reload();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Icon3D name="open-book" size={48} float />
        <div>
          <h1 className="font-heading text-2xl font-extrabold">حفظ الطلاب</h1>
          <p className="text-sm text-muted-foreground">اختاري الطفل، ثم أكّدي السور التي سمعتِها منه (١٠ نجوم وشهادة)، وسجّلي الأحاديث المحفوظة (نجمتان).</p>
        </div>
      </div>
      <ClassSelect scope={scope} />
      {students.loading && !students.data ? <Skeleton className="h-12 rounded-2xl" /> : kids.length === 0 ? <p className="rounded-[24px] border bg-card p-5 text-center text-sm text-muted-foreground">لا يوجد طلاب في الفصل</p> : (
        <div className="flex gap-2 overflow-x-auto pb-1" role="radiogroup" aria-label="اختيار الطفل">
          {kids.map((k) => (
            <button key={k.user_id} type="button" role="radio" aria-checked={k.user_id === kid?.user_id} onClick={() => setSel(k.user_id)}
              className={cn("flex h-12 shrink-0 items-center gap-2 rounded-2xl border px-3 font-bold", k.user_id === kid?.user_id ? "border-primary bg-primary/10 text-primary" : "bg-card")}>
              <KidAvatar value={k.avatar} size={26} /> {k.name}
            </button>
          ))}
        </div>
      )}
      {kid && (
        <>
          <div role="tablist" className="flex w-fit gap-1 rounded-2xl bg-secondary p-1">
            {(["surah", "hadith"] as const).map((t) => (
              <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cn("h-11 rounded-xl px-4 font-bold", tab === t ? "bg-hero text-white" : "")}>{t === "surah" ? "سور جزء عمّ" : "الأحاديث"}</button>
            ))}
          </div>
          {tab === "surah" ? (garden.loading && !garden.data ? <Skeleton className="h-80 rounded-[24px]" /> : garden.data && (
            <>
              <p className="text-sm font-bold">🌳 {ar(garden.data.items.filter((i) => i.confirmed).length)} سورة مؤكدة{garden.data.juz ? ` · ${kid.gender === "f" ? "أتمّت" : "أتمّ"} جزء عمّ 🏆` : ""}</p>
              <GardenGrid data={garden.data} onPick={setPick} busy={typeof busy === "number" ? busy : null} />
            </>
          )) : (
            <ul className="flex flex-col gap-2">
              {HADITH_ORDER.map(hadithById).filter((h): h is NonNullable<typeof h> => !!h).map((h) => {
                const on = !!hadithKey(h.title);
                return (
                  <li key={h.id} className="flex items-center gap-2 rounded-[20px] border bg-card p-3">
                    <span className="min-w-0 flex-1 font-bold">{h.title}</span>
                    <button type="button" data-testid="hadith-toggle" aria-pressed={on} disabled={busy !== null} onClick={() => void toggleHadith(h.id)}
                      className={cn("flex h-10 shrink-0 items-center gap-1 rounded-full px-3 text-sm font-bold disabled:opacity-60", on ? "bg-amber-400 text-[#3A2400]" : "bg-secondary")}>
                      {busy === h.id ? <Loader2 className="size-4 animate-spin" /> : on ? <Star className="size-4" /> : <Check className="size-4" />} {on ? "محفوظ ✓" : "سجّلي الحفظ"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      <Dialog open={!!pick} onOpenChange={(o) => !o && busy === null && setPick(null)}>
        <DialogContent className="rounded-[28px] sm:max-w-sm">
          <DialogHeader><DialogTitle>سورة {pick ? surahName(pick) : ""} — {kid?.name}</DialogTitle><DialogDescription>{ar(it?.reviews ?? 0)} مراجعة من الطفل. {it?.confirmed ? "الحفظ مؤكد ✓" : `أكّدي بعد ما تسمعيها ${kid?.gender === "f" ? "منها" : "منه"} كاملة`}</DialogDescription></DialogHeader>
          <DialogFooter>
            {it?.confirmed
              ? <Button variant="destructive" size="lg2" disabled={busy !== null} onClick={() => pick && void confirm(pick, false)}>إلغاء التأكيد</Button>
              : <Button variant="hero" size="lg2" disabled={busy !== null} onClick={() => pick && void confirm(pick, true)}>{busy !== null ? <Loader2 className="animate-spin" /> : <Check />} تأكيد الحفظ</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// تلاوات الأطفال: المعلمة تسمع وتقيّم (١–٣) وتكتب ملاحظة؛ أول مراجعة تعطي الطفل نجمتين
export function TeacherRecitations() {
  const me = useRequireRole(["teacher", "admin", "superadmin"]);
  const scope = useClassScope();
  const params = scope.class_id ? { class_id: scope.class_id } : {};
  const { data, loading, reload } = useApi<Recitation[]>("recitations", params, { enabled: !!me && scope.ready });
  const [edit, setEdit] = useState<{ r: Recitation; rating: number; note: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const list = Array.isArray(data) ? data : [];
  const pending = list.filter((r) => r.status === "pending").length;
  const save = async () => {
    if (!edit) return;
    setBusy(true);
    try {
      const r = await api<{ stars: number }>("reviewRecitation", { rec_id: edit.r.rec_id, rating: edit.rating, note: edit.note });
      toast.success(r.stars ? `تم ⭐ نجمتان لـ${edit.r.name}` : "تم حفظ التقييم");
      setEdit(null); invalidate("recitations"); await reload();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  const del = async (r: Recitation) => {
    if (!window.confirm(`حذف تلاوة ${r.name} لسورة ${r.surah_name}؟`)) return;
    try { await api("deleteRecitation", { rec_id: r.rec_id }); invalidate("recitations"); await reload(); } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Icon3D name="mic" size={48} float />
        <div>
          <h1 className="font-heading text-2xl font-extrabold">تلاوات الأطفال</h1>
          <p className="text-sm text-muted-foreground">{pending ? `${ar(pending)} تلاوة تنتظر سماعك` : "اسمعي تلاوات أطفال الفصل وشجّعيهم بتقييم وملاحظة"}. التسجيلات خاصة: لا يسمعها إلا الطفل ومعلمات فصله وولي أمره.</p>
        </div>
      </div>
      <ClassSelect scope={scope} />
      {loading && !data ? <Skeleton className="h-40 rounded-[24px]" /> : list.length === 0 ? <p className="rounded-[24px] border bg-card p-5 text-center text-sm text-muted-foreground">لا توجد تلاوات بعد</p> : (
        <ul className="flex flex-col gap-3">
          {list.map((r) => (
            <li key={r.rec_id} data-testid="rec-row" className={cn("flex flex-col gap-2 rounded-[24px] border bg-card p-4 shadow-soft", r.status === "pending" && "border-amber-400/70")}>
              <div className="flex items-center gap-2">
                <KidAvatar value={r.avatar} size={32} />
                <div className="min-w-0 flex-1"><p className="truncate font-bold">{r.name} — سورة {r.surah_name}</p><p className="text-xs text-muted-foreground">{fmtDate(r.created_at)}</p></div>
                <span className={cn("shrink-0 rounded-full px-3 py-1 text-xs font-bold", r.status === "pending" ? "bg-amber-400/20 text-amber-700 dark:text-amber-300" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300")}>{r.status === "pending" ? "جديدة" : `${"⭐".repeat(r.rating)} ${RATING[r.rating]}`}</span>
              </div>
              <AudioPlayer id={r.file_id} />
              {r.note && <p className="text-sm text-muted-foreground">ملاحظتك: {r.note}</p>}
              <div className="flex gap-2">
                <Button variant={r.status === "pending" ? "hero" : "secondary"} size="lg" onClick={() => setEdit({ r, rating: r.rating || 3, note: r.note })}>{r.status === "pending" ? "قيّمي" : "تعديل التقييم"}</Button>
                <Button variant="ghost" size="lg" className="text-destructive" onClick={() => void del(r)}>حذف</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={!!edit} onOpenChange={(o) => !o && !busy && setEdit(null)}>
        <DialogContent className="rounded-[28px] sm:max-w-sm">
          <DialogHeader><DialogTitle>{edit?.r.name} — سورة {edit?.r.surah_name}</DialogTitle><DialogDescription>اختاري التقييم، واكتبي ملاحظة لطيفة (تظهر للطفل)</DialogDescription></DialogHeader>
          {edit && (
            <div className="grid gap-3">
              <div className="flex gap-2" role="radiogroup" aria-label="التقييم">
                {[1, 2, 3].map((n) => (
                  <button key={n} type="button" role="radio" aria-checked={edit.rating === n} onClick={() => setEdit({ ...edit, rating: n })}
                    className={cn("flex flex-1 flex-col items-center rounded-2xl border p-2 text-sm font-bold", edit.rating === n ? "border-amber-400 bg-amber-400/15" : "bg-background")}>
                    <span>{"⭐".repeat(n)}</span>{RATING[n]}
                  </button>
                ))}
              </div>
              <Textarea value={edit.note} maxLength={300} rows={3} onChange={(e) => setEdit({ ...edit, note: e.target.value })} placeholder="مثال: ما شاء الله، انتبه لمدّ «الضالين»" aria-label="الملاحظة" />
            </div>
          )}
          <DialogFooter><Button variant="hero" size="lg2" disabled={busy} onClick={() => void save()}>{busy && <Loader2 className="animate-spin" />} حفظ</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
