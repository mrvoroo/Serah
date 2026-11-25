"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Award, BookCheck, CheckCircle2, Circle, ClipboardCheck, Headphones, Link2, Loader2, NotebookPen, Plus, Star, Sun, Trophy } from "lucide-react";
import { api, fmtDate, session } from "@/lib/api";
import { invalidate, useApi } from "@/hooks/use-api";
import { Father, Mother } from "@/components/family";
import { KidAvatar } from "@/components/kid/kid-avatar";
import { Icon3D, type Icon3DName } from "@/components/icon3d";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { BlurFade } from "@/components/ui/blur-fade";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PRAYER_IDS, PRAYER_NAMES } from "@/lib/prayer";
import { cn } from "@/lib/utils";

// رئيسية ولي الأمر: اختيار الطفل ومتابعته (للعرض فقط)، وروابط عبادات ولي الأمر نفسه
type KidRow = { user_id: string; name: string; avatar: string; gender: "m" | "f"; class_name: string };
type KidDetail = {
  kid: KidRow; points: number; rank: number; total: number;
  lectures: { published: number; attended: number; recent: { title: string; date: string; attended: boolean }[] };
  quizzes: { title: string; score: number; total: number; stars: number; at: string }[];
  homework: { title: string; due: string; status: string }[];
  prayers: Record<string, string[]>; azkar14: number;
  achievements: { key: string; kind: "hadith" | "surah"; title: string; stars: number; at: string }[];
};
const ar = (n: number) => n.toLocaleString("ar-EG");
const KID_KEY = "serah_parent_kid";
const TILES: { href: string; label: string; icon: Icon3DName; tone: string }[] = [
  { href: "/parent/prayer/", label: "جدول صلاتي", icon: "mosque", tone: "from-[#1E8C72] to-[#0B4A3E]" },
  { href: "/parent/azkar/", label: "أذكار الصباح والمساء", icon: "sun", tone: "from-[#F59E0B] to-[#C2410C]" },
  { href: "/parent/quran/", label: "القرآن الكريم", icon: "open-book", tone: "from-[#1FA37F] to-[#0E6B52]" },
  { href: "/kid/journey/", label: "رحلة الأنبياء", icon: "rocket", tone: "from-[#7B5CFF] to-[#4B2FD1]" },
  { href: "/kid/names/", label: "أسماء الله الحسنى", icon: "sparkles", tone: "from-[#3A2A8F] to-[#120A30]" },
];
const HW: Record<string, string> = { "": "لم يسلّم بعد", done: "سلّمه — ينتظر المعلمة", approved: "اعتمدته المعلمة ✓", returned: "أعادته المعلمة للتعديل" };

function last7() {
  const out: string[] = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(Date.now() - i * 864e5); out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`); }
  return out;
}

export default function ParentHome() {
  const me = session.user();
  const mom = me?.gender === "f";
  const kids = useApi<KidRow[]>("parentKids");
  const list = Array.isArray(kids.data) ? kids.data : [];
  const [sel, setSel] = useState("");
  useEffect(() => { try { setSel(localStorage.getItem(KID_KEY) || ""); } catch { /* لا شيء */ } }, []); // eslint-disable-line react-hooks/set-state-in-effect
  const kidId = list.some((k) => k.user_id === sel) ? sel : list[0]?.user_id ?? "";
  const detail = useApi<KidDetail>("parentKid", { kid_id: kidId }, { enabled: !!kidId });
  const d = detail.data;
  const pick = (id: string) => { setSel(id); try { localStorage.setItem(KID_KEY, id); } catch { /* لا شيء */ } };
  const [linkOpen, setLinkOpen] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const link = async () => {
    setBusy(true);
    try {
      const r = await api<{ user_id: string; name: string }>("parentLink", { code });
      toast.success(`تم ربط ${r.name} بحسابك`); invalidate("parentKids"); await kids.reload(); pick(r.user_id); setLinkOpen(false); setCode("");
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  const days = last7();
  const girl = d?.kid.gender === "f";

  return (
    <div className="flex flex-col gap-4">
      <BlurFade>
        <div className="flex items-center gap-3 rounded-[28px] border bg-card p-4 shadow-soft">
          {mom ? <Mother mood="happy" size={84} /> : <Father mood="happy" size={84} />}
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">السلام عليكم ورحمة الله وبركاته</p>
            <h1 className="truncate font-heading text-2xl font-extrabold">{me?.name}</h1>
            <p className="text-sm leading-6 text-muted-foreground">{mom ? "تابعي" : "تابع"} رحلة {list.length > 1 ? "أطفالك" : "طفلك"} مع الأنبياء</p>
          </div>
        </div>
      </BlurFade>

      <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="اختيار الطفل">
        {kids.loading && !kids.data ? <Skeleton className="h-12 w-40 rounded-2xl" /> : list.map((k) => (
          <button key={k.user_id} type="button" role="radio" aria-checked={k.user_id === kidId} onClick={() => pick(k.user_id)}
            className={cn("flex h-12 items-center gap-2 rounded-2xl border px-3 font-bold transition", k.user_id === kidId ? "border-primary bg-primary/10 text-primary" : "bg-card")}>
            <KidAvatar value={k.avatar} size={28} /> {k.name}
          </button>
        ))}
        <Button variant="secondary" size="lg2" onClick={() => setLinkOpen(true)}><Plus /> ربط طفل</Button>
      </div>

      {!kids.loading && list.length === 0 && (
        <div className="rounded-[28px] border bg-card p-6 text-center">
          <Icon3D name="students" size={64} className="mx-auto" />
          <p className="mt-2 font-bold">لا يوجد طفل مربوط بحسابك الآن</p>
          <p className="text-sm text-muted-foreground">{mom ? "اطلبي كود ولي الأمر من معلمة الفصل ثم اضغطي «ربط طفل»" : "اطلب كود ولي الأمر من معلمة الفصل ثم اضغط «ربط طفل»"}</p>
        </div>
      )}

      {kidId && (detail.loading && !d ? <div className="grid gap-3">{[0, 1].map((i) => <Skeleton key={i} className="h-32 rounded-[28px]" />)}</div> : d && (
        <section aria-label={`متابعة ${d.kid.name}`} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: Star, label: "النجوم", value: ar(d.points), tone: "text-amber-500" },
              { icon: Trophy, label: "الترتيب في الفصل", value: d.rank ? `${ar(d.rank)} من ${ar(d.total)}` : "—", tone: "text-violet-500" },
              { icon: Headphones, label: "المحاضرات", value: `${ar(d.lectures.attended)} / ${ar(d.lectures.published)}`, tone: "text-teal-500" },
              { icon: Sun, label: "أذكار آخر ١٤ يومًا", value: ar(d.azkar14), tone: "text-orange-500" },
            ].map((s) => (
              <div key={s.label} className="flex flex-col gap-1 rounded-[24px] border bg-card p-3 shadow-soft">
                <s.icon className={cn("size-5", s.tone)} />
                <p className="font-heading text-xl font-extrabold tabular-nums">{s.value}</p>
                <p className="text-xs font-bold text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="rounded-[28px] border bg-card p-4 shadow-soft">
            <h2 className="mb-2 font-heading text-lg font-extrabold">صلوات {d.kid.name} — آخر ٧ أيام</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[320px] text-center text-sm">
                <thead><tr><th className="p-1 text-start text-xs text-muted-foreground">اليوم</th>{PRAYER_IDS.map((p) => <th key={p} className="p-1 text-xs text-muted-foreground">{PRAYER_NAMES[p]}</th>)}</tr></thead>
                <tbody>
                  {days.map((day) => (
                    <tr key={day} className="border-t">
                      <td className="p-1 text-start text-xs font-bold">{new Date(day + "T12:00").toLocaleDateString("ar-EG", { weekday: "short", day: "numeric" })}</td>
                      {PRAYER_IDS.map((p) => { const ok = (d.prayers[day] || []).includes(p); return <td key={p} className="p-1">{ok ? <CheckCircle2 aria-label="صلّى" className="mx-auto size-5 text-emerald-500" /> : <Circle aria-label="لم يعلّم" className="mx-auto size-5 text-muted-foreground/40" />}</td>; })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{girl ? "تعلّم" : "يعلّم"} {d.kid.name} على {girl ? "صلواتها بنفسها في جدول صلاتها" : "صلواته بنفسه في جدول صلاته"}.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[28px] border bg-card p-4 shadow-soft">
              <h2 className="mb-2 flex items-center gap-2 font-heading text-lg font-extrabold"><Headphones className="size-5" /> آخر المحاضرات</h2>
              {d.lectures.recent.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد محاضرات منشورة بعد</p> : (
                <ul className="flex flex-col gap-1.5">{d.lectures.recent.map((l, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 text-sm"><span className="min-w-0 truncate">{l.title}</span>
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-bold", l.attended ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-secondary text-muted-foreground")}>{l.attended ? (girl ? "سمعتها" : "سمعها") : (girl ? "لم تسمعها" : "لم يسمعها")}</span></li>
                ))}</ul>
              )}
            </div>
            <div className="rounded-[28px] border bg-card p-4 shadow-soft">
              <h2 className="mb-2 flex items-center gap-2 font-heading text-lg font-extrabold"><ClipboardCheck className="size-5" /> الاختبارات</h2>
              {d.quizzes.length === 0 ? <p className="text-sm text-muted-foreground">{girl ? "لم تحل اختبارًا بعد" : "لم يحل اختبارًا بعد"}</p> : (
                <ul className="flex flex-col gap-1.5">{d.quizzes.slice(0, 6).map((q, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 text-sm"><span className="min-w-0 truncate">{q.title}</span><span className="shrink-0 font-bold tabular-nums">{ar(q.score)} / {ar(q.total)}</span></li>
                ))}</ul>
              )}
            </div>
            <div className="rounded-[28px] border bg-card p-4 shadow-soft">
              <h2 className="mb-2 flex items-center gap-2 font-heading text-lg font-extrabold"><NotebookPen className="size-5" /> الواجبات</h2>
              {d.homework.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد واجبات</p> : (
                <ul className="flex flex-col gap-1.5">{d.homework.slice(0, 6).map((h, i) => (
                  <li key={i} className="flex flex-col text-sm"><span className="truncate font-bold">{h.title}</span><span className="text-xs text-muted-foreground">{HW[h.status] ?? h.status}{h.due ? ` · آخر موعد ${fmtDate(h.due)}` : ""}</span></li>
                ))}</ul>
              )}
            </div>
            <div className="rounded-[28px] border bg-card p-4 shadow-soft">
              <h2 className="mb-2 flex items-center gap-2 font-heading text-lg font-extrabold"><Award className="size-5" /> الإنجازات</h2>
              {d.achievements.length === 0 ? <p className="text-sm text-muted-foreground">{girl ? "تظهر هنا السور والأحاديث التي تحفظها" : "تظهر هنا السور والأحاديث التي يحفظها"}</p> : (
                <ul className="flex flex-col gap-1.5">{d.achievements.slice(0, 8).map((a) => (
                  <li key={a.key} className="flex items-center gap-2 text-sm">{a.kind === "surah" ? <BookCheck className="size-4 text-emerald-500" /> : <Star className="size-4 text-amber-500" />}<span className="min-w-0 truncate">{a.title}</span><span className="ms-auto shrink-0 text-xs text-muted-foreground">{fmtDate(a.at)}</span></li>
                ))}</ul>
              )}
            </div>
          </div>
        </section>
      ))}

      <h2 className="mt-2 font-heading text-xl font-extrabold">عباداتي</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {TILES.map((t, i) => (
          <BlurFade key={t.href} delay={0.05 * i}>
            <Link href={t.href} className={cn("flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-[28px] bg-gradient-to-br p-2 text-center font-bold text-white shadow-soft transition-transform active:scale-95", t.tone)}>
              <Icon3D name={t.icon} size={48} /> {t.label}
            </Link>
          </BlurFade>
        ))}
      </div>

      <Dialog open={linkOpen} onOpenChange={(o) => !busy && setLinkOpen(o)}>
        <DialogContent className="rounded-[28px] sm:max-w-sm">
          <DialogHeader><DialogTitle>ربط طفل آخر</DialogTitle><DialogDescription>اكتب كود ولي الأمر الذي أعطته لك معلمة فصل الطفل</DialogDescription></DialogHeader>
          <form id="link-form" onSubmit={(e) => { e.preventDefault(); if (code.trim() && !busy) void link(); }}>
            <Input value={code} dir="ltr" maxLength={11} aria-label="الكود" placeholder="ABCD-EFGH" onChange={(e) => setCode(e.target.value.toUpperCase())} className="h-12 rounded-xl text-center font-heading text-xl tracking-[0.3em]" />
          </form>
          <DialogFooter><Button type="submit" form="link-form" variant="hero" size="lg2" disabled={!code.trim() || busy}>{busy ? <Loader2 className="animate-spin" /> : <Link2 />} ربط</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
