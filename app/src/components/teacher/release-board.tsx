"use client";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Check, FileText, Image as ImageIcon, Loader2, Lock, Mic, Paperclip, StickyNote, Unlock, X } from "lucide-react";
import { api } from "@/lib/api";
import { invalidate, useApi } from "@/hooks/use-api";
import { useRequireRole } from "@/components/kid/kid-shell";
import { Icon3D, type Icon3DName } from "@/components/icon3d";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RT } from "@/components/religious-text";
import { uploadFile } from "@/lib/upload";
import { ar, type ItemRelease, type ReleaseKind } from "@/lib/eight";
import type { ClassRow } from "@/components/teacher/class-picker";
import { cn } from "@/lib/utils";

// لوحة فتح عامة (الأدمن): أدعية اليوم أو الأحاديث — كل عنصر وتحته الفصول، والضغط على الفصل يفتحه له أو يقفله.
// مع كل عنصر ملاحظة ومرفق واحد (صورة أو تسجيل صوتي أو PDF) بنفس طريقة رفع أذكار الصباح والمساء
export type BoardItem = { id: string; title: string; text: string; sub?: string };
type Row = ItemRelease & { classes: string[] };
type Edit = { id: string; note: string; file_id: string; file_kind: ItemRelease["file_kind"]; file_name: string };

export function ReleaseBoard({ kind, items, title, hint, icon }: { kind: ReleaseKind; items: BoardItem[]; title: string; hint: string; icon: Icon3DName }) {
  const me = useRequireRole(["admin", "superadmin"]);
  const rel = useApi<Row[]>("releases", { kind }, { enabled: !!me });
  const cls = useApi<ClassRow[]>("classes", {}, { enabled: !!me });
  const [busy, setBusy] = useState<string | null>(null);
  const [edit, setEdit] = useState<Edit | null>(null);
  const [pct, setPct] = useState<number | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const classes = Array.isArray(cls.data) ? cls.data : [];
  const rows = Array.isArray(rel.data) ? rel.data : [];
  const rowOf = (id: string) => rows.find((r) => r.zikr_id === id);
  const titleOf = (id: string) => items.find((x) => x.id === id)?.title ?? "";

  const save = async (id: string, patch: Partial<Edit> & { classes?: string[] }, ok: string) => {
    const r = rowOf(id);
    const body = { kind, item_id: id, classes: patch.classes ?? r?.classes ?? [], note: patch.note ?? r?.note ?? "",
      file_id: patch.file_id ?? r?.file_id ?? "", file_kind: patch.file_kind ?? r?.file_kind ?? "", file_name: patch.file_name ?? r?.file_name ?? "" };
    setBusy(id);
    try { await api("saveRelease", body); toast.success(ok); invalidate("releases"); invalidate("kidReleases"); await rel.reload(); return true; }
    catch (e) { toast.error((e as Error).message); return false; } finally { setBusy(null); }
  };
  const toggle = (id: string, c: ClassRow) => {
    const cur = rowOf(id)?.classes ?? [], on = cur.includes(c.class_id);
    void save(id, { classes: on ? cur.filter((x) => x !== c.class_id) : [...cur, c.class_id] }, on ? `اتقفل عن ${c.name}` : `اتفتح لـ ${c.name} ✨`);
  };
  const pickFile = async (f: File | undefined) => {
    if (!f || !edit) return;
    const k: ItemRelease["file_kind"] = f.type.startsWith("image/") ? "image" : f.type.startsWith("audio/") ? "audio" : f.type === "application/pdf" ? "file" : "";
    if (!k) { toast.error("المرفق: صورة أو تسجيل صوتي أو ملف PDF"); return; }
    if (f.size > 25 * 1024 * 1024) { toast.error("الملف أكبر من ٢٥ ميجا"); return; }
    setPct(0);
    try {
      const id = await uploadFile(f, k === "image" ? "image" : k === "audio" ? "audio" : "file", setPct);
      setEdit((e) => (e ? { ...e, file_id: id, file_kind: k, file_name: f.name.slice(0, 80) } : e));
    } catch { toast.error("تعذّر رفع الملف، حاولي مرة أخرى"); } finally { setPct(null); }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Icon3D name={icon} size={48} float />
        <div>
          <h1 className="font-heading text-2xl font-extrabold">{title}</h1>
          <p className="text-sm text-muted-foreground">{hint}</p>
        </div>
      </div>

      {(rel.loading && !rel.data) || (cls.loading && !cls.data) ? <div className="grid gap-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-36 rounded-[24px]" />)}</div> : (rel.error && !rel.data) || (cls.error && !cls.data) ? (
        // بدون البيانات الحالية لا نسمح بالضغط (وإلا يُرسل فصل واحد فيقفل العنصر عن باقي الفصول)
        <div role="alert" className="rounded-[24px] border bg-card p-5 text-center"><p className="font-bold">تعذّر تحميل الفصول أو المفتوح حاليًا</p><Button variant="secondary" size="lg2" className="mt-3" onClick={() => { void rel.reload(); void cls.reload(); }}>حاولي مرة أخرى</Button></div>
      ) : (
        <ol className="flex flex-col gap-3">
          {items.map((it, k) => {
            const r = rowOf(it.id), open = r?.classes ?? [], all = classes.length > 0 && classes.every((c) => open.includes(c.class_id));
            return (
              <li key={it.id} data-testid="release-card" className="flex flex-col gap-3 rounded-[24px] border bg-card p-4 shadow-soft">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-muted-foreground">{ar(k + 1)}{it.sub ? ` · ${it.sub}` : ""}</p>
                    <h2 className="font-heading text-lg font-extrabold">{it.title}</h2>
                    <p className="line-clamp-2 text-sm leading-7 text-muted-foreground"><RT text={it.text} /></p>
                  </div>
                  {busy === it.id && <Loader2 className="size-5 shrink-0 animate-spin text-muted-foreground" />}
                </div>
                <div className="flex flex-wrap gap-2" role="group" aria-label={`فصول ${it.title}`}>
                  {classes.map((c) => {
                    const on = open.includes(c.class_id);
                    return (
                      <button key={c.class_id} type="button" aria-pressed={on} disabled={!!busy} onClick={() => toggle(it.id, c)}
                        className={cn("flex h-10 items-center gap-1 rounded-full border px-3 text-sm font-bold transition disabled:opacity-60",
                          on ? "border-emerald-500 bg-emerald-500 text-white" : "bg-background text-muted-foreground")}>
                        {on ? <Check className="size-4" /> : <Lock className="size-3.5" />} {c.name}
                      </button>
                    );
                  })}
                  {classes.length > 1 && (
                    <button type="button" disabled={!!busy} onClick={() => void save(it.id, { classes: all ? [] : classes.map((c) => c.class_id) }, all ? "اتقفل عن كل الفصول" : "اتفتح لكل الفصول ✨")}
                      className="flex h-10 items-center gap-1 rounded-full bg-secondary px-3 text-sm font-bold disabled:opacity-60">
                      {all ? <><Lock className="size-4" /> قفل للكل</> : <><Unlock className="size-4" /> كل الفصول</>}
                    </button>
                  )}
                  {classes.length === 0 && <p className="text-sm text-muted-foreground">أنشئي فصلًا أولًا من صفحة الفصول</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {r?.note && <span className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 font-bold"><StickyNote className="size-4" /> ملاحظة</span>}
                  {r?.file_id && <span className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 font-bold">{r.file_kind === "image" ? <ImageIcon className="size-4" /> : r.file_kind === "audio" ? <Mic className="size-4" /> : <FileText className="size-4" />} {r.file_name || "مرفق"}</span>}
                  <Button variant="ghost" size="lg2" className="ms-auto" onClick={() => setEdit({ id: it.id, note: r?.note ?? "", file_id: r?.file_id ?? "", file_kind: r?.file_kind ?? "", file_name: r?.file_name ?? "" })}>
                    <Paperclip /> ملاحظة ومرفق
                  </Button>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <Dialog open={!!edit} onOpenChange={(o) => !o && pct === null && !busy && setEdit(null)}>
        <DialogContent className="rounded-[28px] sm:max-w-md">
          <DialogHeader><DialogTitle>{edit ? titleOf(edit.id) : ""}</DialogTitle><DialogDescription>ملاحظة تظهر للأطفال تحته، ومرفق واحد (صورة، تسجيل صوتي، أو PDF)</DialogDescription></DialogHeader>
          {edit && (
            <div className="grid gap-3">
              <div className="grid gap-1.5"><Label htmlFor="rb-note">الملاحظة</Label><Textarea id="rb-note" value={edit.note} maxLength={600} rows={4} onChange={(e) => setEdit({ ...edit, note: e.target.value })} placeholder="مثال: نحفظه هذا الأسبوع إن شاء الله" /></div>
              <input ref={file} type="file" accept="image/*,audio/*,application/pdf" className="hidden" onChange={(e) => { void pickFile(e.target.files?.[0]); e.target.value = ""; }} />
              {edit.file_id ? (
                <div className="flex items-center gap-2 rounded-2xl bg-secondary p-3 text-sm font-bold">
                  {edit.file_kind === "image" ? <ImageIcon className="size-4" /> : edit.file_kind === "audio" ? <Mic className="size-4" /> : <FileText className="size-4" />}
                  <span className="min-w-0 flex-1 truncate">{edit.file_name || "مرفق"}</span>
                  <button type="button" aria-label="حذف المرفق" className="grid size-10 place-items-center rounded-xl hover:bg-background" onClick={() => setEdit({ ...edit, file_id: "", file_kind: "", file_name: "" })}><X className="size-4" /></button>
                </div>
              ) : (
                <Button variant="secondary" size="lg2" disabled={pct !== null} onClick={() => file.current?.click()}>
                  {pct !== null ? <><Loader2 className="animate-spin" /> جاري الرفع {ar(pct)}٪</> : <><Paperclip /> إضافة مرفق</>}
                </Button>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="hero" size="lg2" disabled={!edit || pct !== null || !!busy} onClick={async () => { if (edit && await save(edit.id, edit, "تم الحفظ")) setEdit(null); }}>
              {busy && <Loader2 className="animate-spin" />} حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
