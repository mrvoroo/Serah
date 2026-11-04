"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Bot, CheckCircle2, Eye, Loader2, Lock, RefreshCw, Stethoscope, XCircle } from "lucide-react";
import { api, type Role } from "@/lib/api";
import { useApi, invalidate } from "@/hooks/use-api";
import { startViewAs } from "@/lib/view-as";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BlurFade } from "@/components/ui/blur-fade";
import { Icon3D, type Icon3DName } from "@/components/icon3d";
import { cn } from "@/lib/utils";

export type AdminUser = { user_id: string; role: Role; name: string; class_id: string; class_name: string; avatar: string; active: boolean; last_login_at: string; created_at: string };
type Health = {
  version: number; now: string; lockedAccounts: number; triggers: string[];
  tables: { name: string; rows: number }[]; settings: { key: string; set: boolean }[];
  bot: null | { webhook?: string; pending?: number; lastError?: string; lastErrorAt?: string; error?: string };
};
type ClassRow = { class_id: string; name: string; join_code: string; teacher: string; kids: number; lectures: number; published: number };

const card = "rounded-[24px] border bg-card p-4 shadow-soft";

type Probe = { status: number; type: string; body: string };
type AudioRow = { title: string; id: string; mime?: string; size?: number; sharing?: string; direct: Probe; api: Probe };
const probeOk = (p: Probe) => (p.status === 200 || p.status === 206) && /audio|video|octet/.test(p.type);

// فحص تشغيل الصوت: كيف يرد درايف على روابط آخر المحاضرات (لتشخيص أي مشكلة تشغيل)
function AudioCheck() {
  const [rows, setRows] = useState<AudioRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => { setBusy(true); try { setRows(await api<AudioRow[]>("audioCheck")); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); } };
  const Cell = ({ p }: { p: Probe }) => (
    <span className={cn("font-bold", probeOk(p) ? "text-emerald-500" : "text-destructive")} title={p.body}>{p.status === -1 ? "لا يوجد مفتاح" : `${p.status} ${p.type.split(";")[0]}`}</span>
  );
  return (
    <section aria-labelledby="audio-h" className="rounded-[24px] border bg-card p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 id="audio-h" className="font-heading text-lg font-extrabold">فحص تشغيل الصوت</h2>
        <Button variant="secondary" size="lg2" disabled={busy} onClick={run}>{busy ? <Loader2 className="animate-spin" /> : <Stethoscope />} افحص الآن</Button>
      </div>
      {rows && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-muted-foreground"><th className="p-2 text-start">المحاضرة</th><th className="p-2 text-start">الملف</th><th className="p-2 text-start">المشاركة</th><th className="p-2 text-start">رابط مباشر</th><th className="p-2 text-start">Drive API</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t align-top" data-testid="audio-row">
                  <td className="p-2 font-bold">{r.title}</td>
                  <td className="p-2" dir="ltr">{r.mime} {r.size ? `· ${(r.size / 1048576).toFixed(1)}MB` : ""}</td>
                  <td className={cn("p-2 font-bold", r.sharing === "ANYONE_WITH_LINK" ? "text-emerald-500" : "text-destructive")} dir="ltr">{r.sharing}</td>
                  <td className="p-2" dir="ltr"><Cell p={r.direct} />{!probeOk(r.direct) && r.direct.body && <p className="max-w-56 truncate text-xs text-muted-foreground">{r.direct.body}</p>}</td>
                  <td className="p-2" dir="ltr"><Cell p={r.api} />{!probeOk(r.api) && r.api.body && <p className="max-w-56 truncate text-xs text-muted-foreground">{r.api.body}</p>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted-foreground">لو الروابط باللون الأحمر، المنصة تشغّل الصوت تلقائيًا من الخلفية بدلها.</p>
        </div>
      )}
    </section>
  );
}

export default function AdminHome() {
  const health = useApi<Health>("systemHealth");
  const classes = useApi<ClassRow[]>("classes");
  const users = useApi<AdminUser[]>("users");
  const [opening, setOpening] = useState<string | null>(null);

  const count = (r: Role) => users.data?.filter((u) => u.role === r && u.active).length ?? 0;
  const firstOf = (roles: Role[]) => users.data?.find((u) => roles.includes(u.role) && u.active);
  const open = async (u: AdminUser | undefined, label: string) => {
    if (!u) return toast.error(`لا يوجد حساب ${label}`);
    setOpening(u.user_id);
    try { await startViewAs(u.user_id); } catch (e) { toast.error((e as Error).message); setOpening(null); }
  };
  const refresh = () => { invalidate("systemHealth"); invalidate("classes"); invalidate("users"); health.reload(); classes.reload(); users.reload(); };

  const h = health.data;
  const botOk = h?.bot && !h.bot.error && !h.bot.lastError;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3"><Icon3D name="gear" size={48} float /><div><h1 className="font-heading text-2xl font-extrabold">لوحة المطوّر</h1>
          <p className="text-sm text-muted-foreground">{h ? `الخلفية: النسخة ${h.version}` : "جاري التحميل…"}</p></div></div>
        <Button variant="secondary" size="lg2" onClick={refresh} aria-label="تحديث"><RefreshCw /> تحديث</Button>
      </div>

      {/* معاينة سريعة بعين كل دور */}
      <section aria-labelledby="viewas-h" className={card}>
        <h2 id="viewas-h" className="mb-3 font-heading text-lg font-extrabold">افتح المنصة كـ…</h2>
        <div className="flex flex-wrap gap-2">
          {([["طفل", ["student"]], ["معلمة", ["teacher"]], ["معلمة أدمن", ["admin"]]] as [string, Role[]][]).map(([label, roles]) => {
            const u = firstOf(roles);
            return (
              <Button key={label} variant="hero" size="lg2" disabled={!users.data || !!opening} onClick={() => open(u, label)}>
                {opening && opening === u?.user_id ? <Loader2 className="animate-spin" /> : <Eye />} {label}{u ? `: ${u.name}` : ""}
              </Button>
            );
          })}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">المعاينة للعرض فقط لمدة ساعتين؛ لا تُسجَّل نجوم ولا حضور ولا أي تعديل. ولمعاينة شخص معيّن افتح «المستخدمون».</p>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {([["الأطفال", "student", "students"], ["المعلمات", "teacher", "cap"], ["المعلمات الأدمن", "admin", "crown"], ["الحسابات المقفولة", null, "key"]] as [string, Role | null, Icon3DName][]).map(([label, r, icon]) => (
          <div key={label} className={cn(card, "flex items-center gap-3")}>
            <Icon3D name={icon} size={40} float delay={0.2} />
            <div><p className="text-sm text-muted-foreground">{label}</p>
              <p className="font-heading text-2xl font-extrabold">{users.loading && !users.data ? "…" : r ? count(r) : h?.lockedAccounts ?? "…"}</p></div>
          </div>
        ))}
      </div>

      <section aria-labelledby="classes-h" className={card}>
        <h2 id="classes-h" className="mb-3 font-heading text-lg font-extrabold">الفصول</h2>
        {classes.loading && !classes.data ? <Skeleton className="h-16 rounded-2xl" /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-start text-sm">
              <thead><tr className="text-muted-foreground">{["الفصل", "الكود", "المعلمة", "الأطفال", "المحاضرات", "المنشورة"].map((t) => <th key={t} className="p-2 text-start font-bold">{t}</th>)}</tr></thead>
              <tbody>{classes.data?.map((c) => (
                <tr key={c.class_id} className="border-t"><td className="p-2 font-bold">{c.name}</td><td className="p-2 font-mono" dir="ltr">{c.join_code}</td><td className="p-2">{c.teacher}</td><td className="p-2">{c.kids}</td><td className="p-2">{c.lectures}</td><td className="p-2">{c.published}</td></tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        <section aria-labelledby="sys-h" className={card}>
          <h2 id="sys-h" className="mb-3 font-heading text-lg font-extrabold">صحة النظام</h2>
          {!h ? <Skeleton className="h-40 rounded-2xl" /> : (
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex items-center gap-2"><Bot className="size-5" /><span className="font-bold">البوت:</span>
                {h.bot ? <span className={cn("font-bold", botOk ? "text-emerald-500" : "text-destructive")}>{h.bot.error || h.bot.lastError || "يعمل"}</span> : <span className="text-muted-foreground">لم يُضبط BOT_TOKEN</span>}
                {h.bot?.pending ? <span className="text-muted-foreground">({h.bot.pending} رسالة منتظرة)</span> : null}
              </div>
              {h.bot?.webhook !== undefined && <p className="text-muted-foreground">الويب هوك: <span dir="ltr">{h.bot.webhook || "غير مضبوط (يعمل بالاستعلام الدوري)"}</span></p>}
              <p><span className="font-bold">المشغّلات:</span> <span dir="ltr">{h.triggers.join("، ") || "لا يوجد"}</span></p>
              <ul className="grid grid-cols-2 gap-1">
                {h.settings.map((s) => (
                  <li key={s.key} className="flex items-center gap-1.5" dir="ltr">
                    {s.set ? <CheckCircle2 className="size-4 text-emerald-500" aria-label="مضبوط" /> : <XCircle className="size-4 text-destructive" aria-label="غير مضبوط" />}<span className="font-mono text-xs">{s.key}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
        <section aria-labelledby="tables-h" className={card}>
          <h2 id="tables-h" className="mb-3 font-heading text-lg font-extrabold">الجداول</h2>
          {!h ? <Skeleton className="h-40 rounded-2xl" /> : (
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {h.tables.map((t) => (
                <li key={t.name} className="flex justify-between border-b py-1" dir="ltr"><span className="font-mono text-xs">{t.name}</span><span className={cn("font-bold", t.rows < 0 && "text-destructive")}>{t.rows < 0 ? "ناقص" : t.rows}</span></li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <AudioCheck />
      {(health.error || classes.error || users.error) && (
        <BlurFade><p role="alert" className="flex items-center gap-2 rounded-2xl bg-destructive/10 p-3 font-bold text-destructive"><Lock className="size-4" />{health.error || classes.error || users.error}</p></BlurFade>
      )}
    </div>
  );
}
