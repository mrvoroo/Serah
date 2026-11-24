"use client";
import { useState } from "react";
import { toast } from "sonner";
import { BookCheck, Copy, KeyRound, Loader2, Star, Trash2, UserMinus } from "lucide-react";
import { api, fmtDate, type Kid } from "@/lib/api";
import { invalidate, useApi } from "@/hooks/use-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// أدوات المعلمة لكل طفل: كود ولي الأمر (يظهر مرة واحدة)، وإنجازات الحفظ (حديث ٢ نجمة، سورة/جزء ١٠ نجوم)
type Links = { parents: { parent_id: string; name: string; gender: "m" | "f"; linked_at: string }[]; code_expires_at: string };
type Ach = { key: string; kind: "hadith" | "surah"; title: string; stars: number; at: string };
const fmtCode = (c: string) => `${c.slice(0, 4)}-${c.slice(4)}`;

export function ParentCodeDialog({ kid, onClose }: { kid: Kid | null; onClose: () => void }) {
  const links = useApi<Links>("parentLinks", { user_id: kid?.user_id }, { enabled: !!kid });
  const [code, setCode] = useState<{ code: string; expires_at: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const close = () => { setCode(null); onClose(); };
  const issue = async () => {
    if (!kid) return;
    setBusy(true);
    try { setCode(await api<{ code: string; expires_at: string }>("parentCode", { user_id: kid.user_id })); invalidate("parentLinks"); void links.reload(); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  const unlink = async (parent_id: string, name: string) => {
    if (!kid || !window.confirm(`فك ربط «${name}» بـ ${kid.name}؟ سيحتاج كودًا جديدًا ليربطه مرة أخرى.`)) return;
    setBusy(true);
    try { await api("unlinkParent", { user_id: kid.user_id, parent_id }); toast.success("تم فك الربط"); invalidate("parentLinks"); await links.reload(); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  const copy = () => { if (!code) return; const t = fmtCode(code.code); const manual = () => toast.error(`انسخي الكود يدويًا: ${t}`); if (navigator.clipboard) navigator.clipboard.writeText(t).then(() => toast.success("تم نسخ الكود"), manual); else manual(); };
  const parents = links.data?.parents ?? [];
  return (
    <Dialog open={!!kid} onOpenChange={(o) => !o && !busy && close()}>
      <DialogContent className="rounded-[28px] sm:max-w-sm">
        <DialogHeader><DialogTitle>ولي أمر {kid?.name}</DialogTitle><DialogDescription>كود يصلح لمرة واحدة خلال ١٤ يومًا، يدخل به ولي الأمر من صفحة «أولياء الأمور» وينشئ حسابه</DialogDescription></DialogHeader>
        {code ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl bg-secondary p-4 text-center">
            <p data-testid="parent-code" dir="ltr" className="select-all font-heading text-3xl font-extrabold tracking-[0.25em]">{fmtCode(code.code)}</p>
            <p className="text-xs text-muted-foreground">صالح حتى {fmtDate(code.expires_at)} — لن يظهر مرة أخرى، انسخيه الآن</p>
            <Button variant="hero" size="lg2" onClick={copy}><Copy /> نسخ الكود</Button>
          </div>
        ) : (
          <Button variant="hero" size="lg2" disabled={busy} onClick={issue}>{busy ? <Loader2 className="animate-spin" /> : <KeyRound />} {links.data?.code_expires_at ? "كود جديد (يلغي السابق)" : "إصدار كود"}</Button>
        )}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold">أولياء الأمور المربوطون</p>
          {links.loading && !links.data ? <Loader2 className="mx-auto animate-spin" /> : parents.length === 0 ? <p className="text-sm text-muted-foreground">لا أحد بعد</p> : parents.map((p) => (
            <div key={p.parent_id} className="flex items-center justify-between gap-2 rounded-2xl border p-2 text-sm">
              <span className="min-w-0 truncate font-bold">{p.gender === "f" ? "👩" : "👨"} {p.name}</span>
              <Button variant="ghost" size="lg" className="text-destructive" disabled={busy} onClick={() => unlink(p.parent_id, p.name)} aria-label={`فك ربط ${p.name}`}><UserMinus /> فك</Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AchievementDialog({ kid, onClose, onSaved }: { kid: Kid | null; onClose: () => void; onSaved: () => void }) {
  const list = useApi<Ach[]>("kidAchievements", { user_id: kid?.user_id }, { enabled: !!kid });
  const [kind, setKind] = useState<"hadith" | "surah">("surah");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try { await fn(); toast.success(ok); invalidate("kidAchievements"); invalidate("students"); await list.reload(); onSaved(); return true; }
    catch (e) { toast.error((e as Error).message); return false; } finally { setBusy(false); }
  };
  const save = async () => { if (kid && await run(() => api("kidAchievement", { user_id: kid.user_id, kind, title }), kind === "surah" ? `تم التسجيل — +١٠ نجوم لـ${kid.name} 🎉` : `تم التسجيل — +٢ نجمة لـ${kid.name} ⭐`)) setTitle(""); };
  const items = Array.isArray(list.data) ? list.data : [];
  return (
    <Dialog open={!!kid} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="rounded-[28px] sm:max-w-md">
        <DialogHeader><DialogTitle>إنجازات {kid?.name}</DialogTitle><DialogDescription>إتمام سورة أو جزء بشهادة = ١٠ نجوم، وحفظ حديث = نجمتان (مرة لكل عنوان)</DialogDescription></DialogHeader>
        <form id="ach-form" className="grid gap-3" onSubmit={(e) => { e.preventDefault(); if (title.trim() && !busy) void save(); }}>
          <div role="radiogroup" aria-label="نوع الإنجاز" className="grid grid-cols-2 gap-2">
            {([["surah", "أتمّ سورة / جزءًا", BookCheck], ["hadith", "حفظ حديثًا", Star]] as const).map(([v, l, Icon]) => (
              <button key={v} type="button" role="radio" aria-checked={kind === v} onClick={() => setKind(v)}
                className={cn("flex h-11 items-center justify-center gap-1 rounded-xl border font-bold transition", kind === v ? "border-primary bg-primary/10 text-primary" : "bg-background")}><Icon className="size-4" /> {l}</button>
            ))}
          </div>
          <div className="grid gap-1.5"><Label htmlFor="ach-title">{kind === "surah" ? "اسم السورة أو الجزء" : "الحديث أو عنوانه"}</Label>
            <Input id="ach-title" value={title} maxLength={60} placeholder={kind === "surah" ? "مثال: سورة النبأ" : "مثال: إنما الأعمال بالنيات"} onChange={(e) => setTitle(e.target.value)} className="h-12 rounded-xl text-base" /></div>
        </form>
        <DialogFooter><Button type="submit" form="ach-form" variant="hero" size="lg2" disabled={!title.trim() || busy}>{busy && <Loader2 className="animate-spin" />} تسجيل</Button></DialogFooter>
        {items.length > 0 && (
          <ul className="flex max-h-48 flex-col gap-1.5 overflow-y-auto">
            {items.map((a) => (
              <li key={a.key} className="flex items-center gap-2 rounded-2xl border p-2 text-sm">
                {a.kind === "surah" ? <BookCheck className="size-4 text-emerald-500" /> : <Star className="size-4 text-amber-500" />}
                <span className="min-w-0 flex-1 truncate">{a.title}</span>
                <span className="text-xs text-muted-foreground">{fmtDate(a.at)}</span>
                <button type="button" aria-label={`إلغاء ${a.title}`} disabled={busy} onClick={() => { if (window.confirm(`إلغاء «${a.title}»؟ ستُخصم نجومه من الطفل.`)) void run(() => api("deleteKidAchievement", { key: a.key }), "تم الإلغاء"); }} className="text-destructive"><Trash2 className="size-4" /></button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
