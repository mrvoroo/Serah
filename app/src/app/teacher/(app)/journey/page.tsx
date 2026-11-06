"use client";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, DownloadCloud, GripVertical, Loader2, Pencil, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { Icon3D } from "@/components/icon3d";
import { api } from "@/lib/api";
import { invalidate, useApi } from "@/hooks/use-api";
import { useRequireRole } from "@/components/kid/kid-shell";
import { SEED_PROPHETS, SYMBOL_OPTIONS, type ProphetAdminRow } from "@/lib/prophets";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Form = { prophet_id?: string; name: string; title: string; text: string; symbol: string; symbol_name: string };
const EMPTY: Form = { name: "", title: "", text: "", symbol: "", symbol_name: "" };
const symbolLabel = (v: string) => SYMBOL_OPTIONS.find((o) => o.value === v)?.label ?? "";

// إدارة رحلة الأنبياء (للأدمن): ترتيب الأقسام، إظهار/إخفاء، تعديل، إضافة، حذف، والدخول لمحتوى كل نبي
export default function JourneyAdmin() {
  const me = useRequireRole(["admin", "superadmin"]);
  const { data, loading, reload } = useApi<ProphetAdminRow[]>("journeyAdmin", {}, { enabled: !!me });
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const [order, setOrder] = useState<ProphetAdminRow[] | null>(null);
  // تحديد عدة أنبياء لإظهارهم أو إخفائهم مرة واحدة
  const [sel, setSel] = useState<Set<string>>(new Set());
  const toggleSel = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const list = order ?? data ?? [];

  const refresh = () => { invalidate("journey"); invalidate("prophet"); return reload(); };
  const run = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key);
    try { await fn(); toast.success(ok); await refresh(); } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  };
  const saveOrder = (next: ProphetAdminRow[]) => {
    setOrder(next);
    run("order", () => api("reorderProphets", { ids: next.map((p) => p.prophet_id) }), "تم حفظ الترتيب").finally(() => setOrder(null));
  };
  const move = (i: number, to: number) => {
    if (to < 0 || to >= list.length || to === i) return;
    const next = list.slice(); const [x] = next.splice(i, 1); next.splice(to, 0, x); saveOrder(next);
  };
  const bulk = (visible: boolean, all = false) => run("bulk", () => api("setProphetsVisible", all ? { all: true, visible } : { ids: [...sel], visible }),
    all ? (visible ? "كل الأنبياء ظاهرين للأطفال" : "تم إخفاء كل الأنبياء") : visible ? `ظهر ${sel.size.toLocaleString("ar-EG")} للأطفال` : `تم إخفاء ${sel.size.toLocaleString("ar-EG")}`).then(() => setSel(new Set()));
  const save = () => form && run("form", () => api("saveProphet", { ...form }), form.prophet_id ? "تم حفظ التعديل" : "تمت إضافة القسم").then(() => setForm(null));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Icon3D name="rocket" size={48} float />
        <div className="flex-1"><h1 className="font-heading text-2xl font-extrabold">رحلة الأنبياء</h1><p className="text-sm text-muted-foreground">ترتيب الأقسام وإظهارها ومحتوى صفحة كل نبي</p></div>
        {!!data?.length && <Button variant="hero" size="lg2" onClick={() => setForm({ ...EMPTY })}><Plus /> إضافة نبي</Button>}
      </div>

      {loading && !data ? <div className="grid gap-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-[24px]" />)}</div>
        : data && data.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-[28px] border bg-card p-8 text-center shadow-soft">
            <p className="font-bold">لم تُضف أقسام الرحلة للجدول بعد</p>
            <p className="max-w-md text-sm text-muted-foreground">الرحلة تعرض الآن الـ {SEED_PROPHETS.length} نبيًا المكتوبين في الموقع. استوردهم مرة واحدة لتقدري تعدّلي وترتبي وتضيفي محتوى لكل نبي.</p>
            <Button variant="hero" size="lg2" disabled={!!busy} onClick={() => run("seed", () => api("seedProphets", { list: SEED_PROPHETS }), "تم استيراد الأقسام")}>
              {busy === "seed" ? <Loader2 className="animate-spin" /> : <DownloadCloud />} استيراد أقسام الرحلة
            </Button>
          </div>
        ) : (<>
          <div role="toolbar" aria-label="إظهار وإخفاء مجمّع" className="z-10 flex sm:sticky sm:top-2 flex-wrap items-center gap-2 rounded-[24px] border bg-card/95 p-3 shadow-soft backdrop-blur">
            <label className="flex items-center gap-2 font-bold">
              <input type="checkbox" className="size-5 accent-[var(--primary)]" aria-label="تحديد الكل"
                checked={list.length > 0 && sel.size === list.length} onChange={(e) => setSel(e.target.checked ? new Set(list.map((p) => p.prophet_id)) : new Set())} />
              {sel.size ? `تم تحديد ${sel.size.toLocaleString("ar-EG")}` : "تحديد الكل"}
            </label>
            <span className="flex-1" />
            {sel.size > 0 ? (<>
              <Button variant="hero" size="lg2" disabled={!!busy} onClick={() => bulk(true)}><Eye /> إظهار المحدد</Button>
              <Button variant="secondary" size="lg2" disabled={!!busy} onClick={() => bulk(false)}><EyeOff /> إخفاء المحدد</Button>
            </>) : (<>
              <Button variant="secondary" size="lg2" disabled={!!busy} onClick={() => bulk(true, true)}><Eye /> إظهار الكل</Button>
              <Button variant="secondary" size="lg2" disabled={!!busy} onClick={() => bulk(false, true)}><EyeOff /> إخفاء الكل</Button>
            </>)}
            {busy === "bulk" && <Loader2 className="animate-spin" />}
          </div>
          <ol className="grid gap-2">
            {list.map((p, i) => (
              <li key={p.prophet_id} data-testid="prophet-row" draggable onDragStart={() => setDrag(i)} onDragOver={(e) => e.preventDefault()}
                onDrop={() => { if (drag !== null) move(drag, i); setDrag(null); }}
                className={cn("flex flex-wrap items-center gap-3 rounded-[24px] border bg-card p-3 shadow-soft", !p.visible && "opacity-60", drag === i && "ring-2 ring-gold")}>
                <label className="grid size-10 shrink-0 cursor-pointer place-items-center" onPointerDown={(e) => e.stopPropagation()}>
                  <input type="checkbox" className="size-5 accent-[var(--primary)]" aria-label={`تحديد ${p.name}`} checked={sel.has(p.prophet_id)} onChange={() => toggleSel(p.prophet_id)} />
                </label>
                <GripVertical className="hidden size-5 cursor-grab text-muted-foreground sm:block" aria-hidden />
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-sm font-bold">{(i + 1).toLocaleString("ar-EG")}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{p.name} {p.symbol && <span className="ms-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{symbolLabel(p.symbol)}</span>}</p>
                  <p className="truncate text-xs text-muted-foreground">{p.items.toLocaleString("ar-EG")} عنصر{p.pending ? ` · ${p.pending.toLocaleString("ar-EG")} بانتظار الاعتماد` : ""}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon-lg" aria-label={`تحريك ${p.name} لأعلى`} disabled={i === 0 || !!busy} onClick={() => move(i, i - 1)}><ArrowUp /></Button>
                  <Button variant="ghost" size="icon-lg" aria-label={`تحريك ${p.name} لأسفل`} disabled={i === list.length - 1 || !!busy} onClick={() => move(i, i + 1)}><ArrowDown /></Button>
                  <Button variant="ghost" size="icon-lg" aria-label={`تعديل ${p.name}`} onClick={() => setForm({ prophet_id: p.prophet_id, name: p.name, title: p.title, text: p.text, symbol: p.symbol, symbol_name: p.symbol_name })}><Pencil /></Button>
                  <Button variant="ghost" size="icon-lg" aria-label={`حذف ${p.name}`} disabled={!!busy}
                    onClick={() => window.confirm(`حذف قسم ${p.name} وكل محتواه؟ لا يمكن التراجع.`) && run(p.prophet_id, () => api("deleteProphet", { prophet_id: p.prophet_id }), "تم الحذف")}><Trash2 /></Button>
                </div>
                <Label className="flex items-center gap-2 text-sm font-bold">
                  {p.visible ? "ظاهر" : "مخفي"}
                  <Switch checked={p.visible} disabled={!!busy} aria-label={`إظهار ${p.name}`}
                    onCheckedChange={(v) => run(p.prophet_id, () => api("saveProphet", { prophet_id: p.prophet_id, name: p.name, title: p.title, text: p.text, symbol: p.symbol, symbol_name: p.symbol_name, visible: v }), v ? "القسم ظاهر للأطفال" : "تم إخفاء القسم")} />
                </Label>
                <Link href={`/teacher/journey/prophet/?id=${p.prophet_id}`} className={buttonVariants({ variant: "secondary", size: "lg2" })}>المحتوى</Link>
              </li>
            ))}
          </ol>
        </>
        )}

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="rounded-[28px] sm:max-w-lg">
          <DialogHeader><DialogTitle>{form?.prophet_id ? `تعديل ${form.name}` : "إضافة نبي"}</DialogTitle></DialogHeader>
          {form && (
            <div className="grid gap-3">
              <div className="grid gap-1.5"><Label htmlFor="p-name">اسم النبي</Label><Input id="p-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: نوح" /></div>
              <div className="grid gap-1.5"><Label htmlFor="p-title">العنوان في البطاقة</Label><Input id="p-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="سيدنا نوح عليه السلام" /></div>
              <div className="grid gap-1.5"><Label htmlFor="p-text">النص القصير</Label><Textarea id="p-text" rows={3} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} /></div>
              <div className="grid gap-1.5">
                <Label htmlFor="p-symbol">الرمز في المجسم</Label>
                <select id="p-symbol" value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} className="h-11 rounded-2xl border bg-background px-3">
                  {SYMBOL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="grid gap-1.5"><Label htmlFor="p-symname">اسم الرمز (يظهر في البطاقة)</Label><Input id="p-symname" value={form.symbol_name} onChange={(e) => setForm({ ...form, symbol_name: e.target.value })} placeholder="مثال: السفينة" /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="hero" size="lg2" disabled={!form?.name.trim() || !!busy} onClick={save}>{busy === "form" && <Loader2 className="animate-spin" />} حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
