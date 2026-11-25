"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Star, Trash2 } from "lucide-react";
import { Icon3D } from "@/components/icon3d";
import { KidAvatar } from "@/components/kid/kid-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { invalidate, useApi } from "@/hooks/use-api";
import { api, session } from "@/lib/api";
import { g } from "@/lib/kid-text";
import { DEEDS, ar, dayIso, deedOf, isoToday, type Deed } from "@/lib/eight";
import { cn } from "@/lib/utils";

// لوحة الأعمال الصالحة: ملصقات يضعها الأب أو الأم للطفل على أعماله الصالحة (نجمة لكل عمل حتى ٣ يوميًا)
function last7() {
  const out: string[] = [];
  for (let i = 6; i >= 0; i--) out.push(isoToday(new Date(Date.now() - i * 864e5)));
  return out;
}
const weekday = (iso: string) => new Date(iso + "T12:00").toLocaleDateString("ar-EG", { weekday: "short", day: "numeric" });

function WeekBoard({ list, parent }: { list: Deed[]; parent?: boolean }) {
  const days = last7();
  return (
    <ol className="grid gap-2" aria-label="ملصقات آخر ٧ أيام">
      {days.map((d) => {
        const items = list.filter((x) => dayIso(x.day) === d);
        return (
          <li key={d} data-testid="deed-day" className="flex items-center gap-3 rounded-[22px] border bg-card p-3 shadow-soft">
            <span className="w-16 shrink-0 text-xs font-bold text-muted-foreground">{weekday(d)}</span>
            <div className="flex flex-1 flex-wrap gap-1.5">
              {items.length === 0 ? <span className="text-xs text-muted-foreground/70">—</span> : items.map((x) => {
                const def = deedOf(x.deed);
                return (
                  <span key={x.deed_id} title={x.note || def?.label} className="flex items-center gap-1 rounded-full bg-gold/15 px-2.5 py-1 text-xs font-bold">
                    <span aria-hidden>{def?.icon ?? "⭐"}</span> {def?.label ?? x.deed}{!parent && x.by ? <span className="text-muted-foreground"> · {x.by_gender === "f" ? "ماما" : "بابا"}</span> : null}
                  </span>
                );
              })}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function KidDeeds() {
  const { data, loading, error, reload } = useApi<Deed[]>("kidDeeds");
  const list = Array.isArray(data) ? data : [];
  const week = list.filter((x) => last7().includes(dayIso(x.day)));
  return (
    <section aria-labelledby="kdd-title" className="flex flex-col gap-4">
      <header className="flex items-center gap-3">
        <Icon3D name="gift" size={56} float />
        <div>
          <h1 id="kdd-title" className="font-heading text-2xl font-extrabold">{g("لوحة أعمالي الصالحة", "لوحة أعمالي الصالحة")}</h1>
          <p className="text-sm text-muted-foreground">بابا وماما بيحطّوا لك ملصق على كل عمل حلو {g("تعمله", "تعمليه")}، وكل ملصق نجمة (لحد ٣ في اليوم) ⭐</p>
        </div>
      </header>
      <div className="rounded-[24px] bg-hero p-4 text-white shadow-soft">
        <p className="text-sm text-white/85">الأسبوع ده</p>
        <p className="font-heading text-3xl font-extrabold">{ar(week.length)} عمل صالح 🌟</p>
        <p className="text-sm text-white/85">{week.length ? g("ما شاء الله عليك، كمّل!", "ما شاء الله عليكِ، كمّلي!") : g("يلا نبدأ بعمل حلو النهارده", "يلا نبدأ بعمل حلو النهارده")}</p>
      </div>
      {loading && !data ? <Skeleton className="h-64 rounded-[24px]" /> : error && !data ? <div className="rounded-[24px] border bg-card p-5 text-center"><p className="font-bold">تعذّر تحميل اللوحة</p><button type="button" onClick={() => reload()} className="mt-3 h-11 rounded-2xl bg-secondary px-4 font-bold">{g("حاول", "حاولي")} مرة أخرى</button></div> : <WeekBoard list={list} />}
    </section>
  );
}

// ولي الأمر: يختار الطفل والعمل ويضع الملصق
type KidRow = { user_id: string; name: string; avatar: string; gender: "m" | "f" };
const KID_KEY = "serah_parent_kid";
export function ParentDeeds() {
  const mom = session.user()?.gender === "f";
  const kids = useApi<KidRow[]>("parentKids");
  const klist = Array.isArray(kids.data) ? kids.data : [];
  const [sel, setSel] = useState("");
  useEffect(() => { try { setSel(localStorage.getItem(KID_KEY) || ""); } catch { /* لا شيء */ } }, []); // eslint-disable-line react-hooks/set-state-in-effect
  const kid = klist.find((k) => k.user_id === sel) ?? klist[0];
  const deeds = useApi<Deed[]>("parentDeeds", { kid_id: kid?.user_id ?? "" }, { enabled: !!kid });
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const list = Array.isArray(deeds.data) ? deeds.data : [];
  const todayMine = list.filter((x) => x.mine && dayIso(x.day) === isoToday());
  const girl = kid?.gender === "f";

  const add = async (id: string) => {
    if (!kid) return;
    setBusy(id);
    try {
      const r = await api<{ stars: number }>("addDeed", { kid_id: kid.user_id, deed: id, note, date: isoToday() });
      toast.success(r.stars ? `تم الملصق، و${kid.name} ${girl ? "كسبت" : "كسب"} نجمة ⭐` : "تم الملصق 🌟 (نجوم اليوم اكتملت)");
      setNote(""); invalidate("parentDeeds"); invalidate("parentDigest"); invalidate("parentKid"); await deeds.reload();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  };
  const del = async (id: string) => {
    if (!window.confirm("حذف الملصق؟ تُسحب نجمته")) return;
    setBusy(id);
    try { await api("deleteDeed", { deed_id: id }); invalidate("parentDeeds"); invalidate("parentDigest"); invalidate("parentKid"); await deeds.reload(); } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  };

  return (
    <section aria-labelledby="pd-title" className="flex flex-col gap-4">
      <header className="flex items-center gap-3">
        <Icon3D name="gift" size={56} float />
        <div>
          <h1 id="pd-title" className="font-heading text-2xl font-extrabold">لوحة الأعمال الصالحة</h1>
          <p className="text-sm text-muted-foreground">{mom ? "شجّعي" : "شجّع"} {girl ? "بنتك" : "ابنك"} بملصق على كل عمل صالح، وكل ملصق نجمة (حتى ٣ نجوم يوميًا).</p>
        </div>
      </header>
      {klist.length > 1 && (
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="اختيار الطفل">
          {klist.map((k) => (
            <button key={k.user_id} type="button" role="radio" aria-checked={k.user_id === kid?.user_id} onClick={() => { setSel(k.user_id); try { localStorage.setItem(KID_KEY, k.user_id); } catch { /* لا شيء */ } }}
              className={cn("flex h-12 items-center gap-2 rounded-2xl border px-3 font-bold", k.user_id === kid?.user_id ? "border-primary bg-primary/10 text-primary" : "bg-card")}>
              <KidAvatar value={k.avatar} size={28} /> {k.name}
            </button>
          ))}
        </div>
      )}
      {kids.loading && !kids.data ? <Skeleton className="h-40 rounded-[24px]" /> : kids.error && !kids.data ? (
        <div className="rounded-[24px] border bg-card p-5 text-center"><p className="font-bold">تعذّر التحميل</p><Button variant="secondary" size="lg2" className="mt-3" onClick={() => kids.reload()}>إعادة المحاولة</Button></div>
      ) : !kid ? (
        <p className="rounded-[24px] border bg-card p-5 text-center text-sm text-muted-foreground">لا يوجد طفل مربوط بحسابك بعد</p>
      ) : (
        <>
          <div className="flex flex-col gap-3 rounded-[28px] border bg-card p-4 shadow-soft">
            <p className="font-bold">{mom ? "اختاري" : "اختار"} العمل الصالح اللي {girl ? "عملته" : "عمله"} {kid.name} النهارده</p>
            <Input value={note} maxLength={120} onChange={(e) => setNote(e.target.value)} placeholder="ملاحظة اختيارية (مثال: ساعد أخته في المذاكرة)" className="h-11 rounded-xl" aria-label="ملاحظة" />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {DEEDS.map((d) => (
                <button key={d.id} type="button" disabled={!!busy} onClick={() => void add(d.id)} data-testid="deed-btn"
                  className="flex min-h-12 items-center gap-2 rounded-2xl bg-secondary px-3 py-2 text-start text-sm font-bold transition active:scale-95 disabled:opacity-60">
                  {busy === d.id ? <Loader2 className="size-5 animate-spin" /> : <span aria-hidden className="text-xl">{d.icon}</span>} {d.label}
                </button>
              ))}
            </div>
          </div>
          {todayMine.length > 0 && (
            <div className="rounded-[24px] border bg-card p-4">
              <p className="mb-2 flex items-center gap-1 text-sm font-bold"><Star className="size-4 text-amber-500" /> ملصقاتك النهارده</p>
              <ul className="flex flex-col gap-1.5">
                {todayMine.map((x) => (
                  <li key={x.deed_id} className="flex items-center gap-2 text-sm">
                    <span aria-hidden>{deedOf(x.deed)?.icon}</span> <span className="min-w-0 flex-1 truncate">{deedOf(x.deed)?.label}{x.note ? ` — ${x.note}` : ""}</span>
                    <Button variant="ghost" size="icon-xl" aria-label="حذف الملصق" disabled={!!busy} onClick={() => void del(x.deed_id)}><Trash2 className="size-4 text-destructive" /></Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <h2 className="font-heading text-lg font-extrabold">آخر ٧ أيام</h2>
          {deeds.loading && !deeds.data ? <Skeleton className="h-64 rounded-[24px]" /> : <WeekBoard list={list} parent />}
        </>
      )}
    </section>
  );
}
