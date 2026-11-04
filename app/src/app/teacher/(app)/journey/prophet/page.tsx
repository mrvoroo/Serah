"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowRight, ArrowUp, BadgeCheck, Clock, FileText, Image as ImageIcon, Loader2, Music, Pencil, Plus, SquarePlay, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { invalidate, useApi } from "@/hooks/use-api";
import { useRequireRole } from "@/components/kid/kid-shell";
import { uploadFile } from "@/lib/upload";
import { youtubeId, type ContentItem, type ContentKind, type ProphetRow } from "@/lib/prophets";
import { ProphetView, YouTube } from "@/components/prophet-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const KINDS: { kind: ContentKind; label: string; icon: typeof FileText }[] = [
  { kind: "text", label: "نص", icon: FileText },
  { kind: "audio", label: "صوت", icon: Music },
  { kind: "image", label: "صورة", icon: ImageIcon },
  { kind: "youtube", label: "فيديو يوتيوب", icon: SquarePlay },
];
const kindOf = (k: ContentKind) => KINDS.find((x) => x.kind === k)!;

type Form = { item_id?: string; kind: ContentKind; title: string; body: string; url: string; file_id: string; approved: boolean };

function Inner() {
  const id = useSearchParams().get("id") ?? "";
  const me = useRequireRole(["admin", "superadmin"]);
  const { data, error, reload } = useApi<{ prophet: ProphetRow; items: ContentItem[] }>("prophet", { id, preview: true }, { enabled: !!me && !!id });
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pct, setPct] = useState(0);
  const items = data?.items ?? [];

  const refresh = () => { invalidate("prophet"); invalidate("journey"); return reload(); };
  const run = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key);
    try { await fn(); toast.success(ok); await refresh(); return true; } catch (e) { toast.error((e as Error).message); return false; } finally { setBusy(null); }
  };
  const move = (i: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const ids = items.map((x) => x.item_id); const [x] = ids.splice(i, 1); ids.splice(to, 0, x);
    run("order", () => api("reorderContent", { ids }), "تم حفظ الترتيب");
  };
  const open = (kind: ContentKind) => { setFile(null); setPct(0); setForm({ kind, title: "", body: "", url: "", file_id: "", approved: false }); };
  const edit = (it: ContentItem) => { setFile(null); setPct(0); setForm({ item_id: it.item_id, kind: it.kind, title: it.title, body: it.body, url: it.url, file_id: it.file_id, approved: it.approved }); };
  const save = async () => {
    if (!form) return;
    const ok = await run("form", async () => {
      let file_id = form.file_id;
      if (file && (form.kind === "audio" || form.kind === "image")) file_id = await uploadFile(file, form.kind, setPct);
      await api("saveContent", { ...form, file_id, prophet_id: id });
    }, form.item_id ? "تم حفظ التعديل" : "تمت الإضافة");
    if (ok) setForm(null);
  };
  const ytId = form?.kind === "youtube" ? youtubeId(form.url) : "";
  const canSave = !!form && !busy && (form.kind === "text" ? !!form.body.trim() : form.kind === "youtube" ? !!ytId : !!(file || form.file_id));

  if (error) return <p className="rounded-[28px] border bg-card p-6 text-center text-muted-foreground">{error}</p>;
  if (!data) return <div className="grid gap-3"><Skeleton className="h-24 rounded-[24px]" /><Skeleton className="h-40 rounded-[24px]" /></div>;

  return (
    <div className="flex flex-col gap-4">
      <Link href="/teacher/journey/" className="flex w-fit items-center gap-1 rounded-full bg-secondary px-4 py-2 text-sm font-bold text-secondary-foreground"><ArrowRight className="size-4" /> كل الأقسام</Link>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1"><h1 className="font-heading text-2xl font-extrabold">صفحة سيدنا {data.prophet.name}</h1><p className="text-sm text-muted-foreground">الطفل يرى العناصر المعتمدة والظاهرة فقط</p></div>
        <div role="tablist" className="flex gap-1 rounded-full bg-secondary p-1">
          {([["edit", "المحتوى"], ["preview", "معاينة كطفل"]] as const).map(([t, l]) => (
            <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)} className={cn("h-10 rounded-full px-4 text-sm font-bold", tab === t ? "bg-hero text-white" : "text-secondary-foreground")}>{l}</button>
          ))}
        </div>
      </div>

      {tab === "preview" ? <ProphetView prophet={data.prophet} items={items.filter((x) => x.visible && x.approved)} /> : (
        <>
          <div className="flex flex-wrap gap-2">
            {KINDS.map((k) => <Button key={k.kind} variant="secondary" size="lg2" onClick={() => open(k.kind)}><Plus /> <k.icon /> {k.label}</Button>)}
          </div>
          <ol className="grid gap-2">
            {items.map((it, i) => {
              const K = kindOf(it.kind);
              return (
                <li key={it.item_id} data-testid="content-row" className={cn("flex flex-wrap items-center gap-3 rounded-[24px] border bg-card p-3 shadow-soft", !it.visible && "opacity-60")}>
                  <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-secondary"><K.icon className="size-5" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{it.title || K.label}</p>
                    <p className="truncate text-xs text-muted-foreground">{it.kind === "youtube" ? `youtu.be/${it.url}` : it.body || K.label}</p>
                  </div>
                  {it.approved
                    ? <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400"><BadgeCheck className="size-4" /> معتمد</span>
                    : <span className="flex items-center gap-1 rounded-full bg-gold/20 px-3 py-1 text-xs font-bold"><Clock className="size-4" /> بانتظار الاعتماد</span>}
                  <Button variant={it.approved ? "secondary" : "hero"} size="lg2" disabled={!!busy}
                    onClick={() => run(it.item_id, () => api("setContentFlags", { item_id: it.item_id, approved: !it.approved }), it.approved ? "تم إلغاء الاعتماد" : "تم الاعتماد")}>
                    {it.approved ? "إلغاء الاعتماد" : "اعتماد"}
                  </Button>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon-lg" aria-label="لأعلى" disabled={i === 0 || !!busy} onClick={() => move(i, i - 1)}><ArrowUp /></Button>
                    <Button variant="ghost" size="icon-lg" aria-label="لأسفل" disabled={i === items.length - 1 || !!busy} onClick={() => move(i, i + 1)}><ArrowDown /></Button>
                    <Button variant="ghost" size="icon-lg" aria-label={`تعديل ${it.title || K.label}`} onClick={() => edit(it)}><Pencil /></Button>
                    <Button variant="ghost" size="icon-lg" aria-label={`حذف ${it.title || K.label}`} disabled={!!busy}
                      onClick={() => window.confirm("حذف هذا العنصر؟") && run(it.item_id, () => api("deleteContent", { item_id: it.item_id }), "تم الحذف")}><Trash2 /></Button>
                  </div>
                  <Label className="flex items-center gap-2 text-sm font-bold">
                    {it.visible ? "ظاهر" : "مخفي"}
                    <Switch checked={it.visible} disabled={!!busy} aria-label={`إظهار ${it.title || K.label}`}
                      onCheckedChange={(v) => run(it.item_id, () => api("setContentFlags", { item_id: it.item_id, visible: v }), v ? "ظاهر" : "تم الإخفاء")} />
                  </Label>
                </li>
              );
            })}
            {items.length === 0 && <p className="rounded-[24px] border bg-card p-6 text-center text-muted-foreground">لا يوجد محتوى بعد. ابدئي بإضافة نص أو صوت أو صورة أو فيديو.</p>}
          </ol>
        </>
      )}

      <Dialog open={!!form} onOpenChange={(o) => !o && !busy && setForm(null)}>
        <DialogContent className="rounded-[28px] sm:max-w-lg">
          <DialogHeader><DialogTitle>{form?.item_id ? "تعديل" : "إضافة"} {form && kindOf(form.kind).label}</DialogTitle></DialogHeader>
          {form && (
            <div className="grid gap-3">
              <div className="grid gap-1.5"><Label htmlFor="c-title">العنوان</Label><Input id="c-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              {form.kind === "youtube" && (
                <div className="grid gap-1.5">
                  <Label htmlFor="c-url">رابط الفيديو على يوتيوب</Label>
                  <Input id="c-url" dir="ltr" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://www.youtube.com/watch?v=..." />
                  {form.url && !ytId && <p className="text-sm text-destructive">الرابط غير صحيح — انسخي رابط الفيديو من يوتيوب</p>}
                  {ytId && <YouTube id={ytId} title={form.title} />}
                </div>
              )}
              {(form.kind === "audio" || form.kind === "image") && (
                <div className="grid gap-1.5">
                  <Label htmlFor="c-file">{form.kind === "audio" ? "ملف الصوت" : "الصورة"}{form.file_id && " (اتركيه فاضي للإبقاء على الحالي)"}</Label>
                  <Input id="c-file" type="file" accept={form.kind === "audio" ? "audio/*" : "image/*"} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                  {busy === "form" && file && <Progress value={pct} />}
                </div>
              )}
              <div className="grid gap-1.5">
                <Label htmlFor="c-body">{form.kind === "text" ? "النص" : "وصف (اختياري)"}</Label>
                <Textarea id="c-body" rows={form.kind === "text" ? 6 : 2} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
              </div>
              {!form.item_id && (
                <Label className="flex items-center gap-2 text-sm font-bold">
                  <Switch checked={form.approved} onCheckedChange={(v) => setForm({ ...form, approved: v })} aria-label="معتمد" /> راجعته — اعتمده مباشرة
                </Label>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="hero" size="lg2" disabled={!canSave} onClick={save}>{busy === "form" && <Loader2 className="animate-spin" />} حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ProphetAdminPage() {
  return <Suspense fallback={<Skeleton className="h-24 rounded-[24px]" />}><Inner /></Suspense>;
}
