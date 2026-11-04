"use client";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { api, driveImage, type Lecture } from "@/lib/api";
import { useApi } from "@/hooks/use-api";
import { uploadFile } from "@/lib/upload";
import { SEED_PROPHETS, type ProphetRow } from "@/lib/prophets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// قائمة الأنبياء لاختيار «المحاضرة عن أي نبي» (من جدول الرحلة، أو الافتراضية لو لم يُستورد بعد)
export function useProphetOptions() {
  const { data } = useApi<ProphetRow[]>("journey");
  return (data?.length ? data : SEED_PROPHETS).map((p) => ({ value: p.prophet_id, label: p.name }));
}

export function ProphetSelect({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  const options = useProphetOptions();
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="h-12 rounded-xl border bg-background px-3 text-base">
      <option value="">موضوع عام (بدون نبي)</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

const day = (d: string) => String(d || "").slice(0, 10);

// تعديل المحاضرة: البيانات + صورها (إضافة، ترتيب، حذف)
export function LectureEditor({ lecture, onClose, onChanged }: { lecture: Lecture | null; onClose: () => void; onChanged: () => void }) {
  return (
    <Dialog open={!!lecture} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto rounded-[28px] sm:max-w-lg">
        {lecture && <Inner key={lecture.lecture_id} lecture={lecture} onClose={onClose} onChanged={onChanged} />}
      </DialogContent>
    </Dialog>
  );
}

function Inner({ lecture, onClose, onChanged }: { lecture: Lecture; onClose: () => void; onChanged: () => void }) {
  const [title, setTitle] = useState(lecture.title);
  const [date, setDate] = useState(day(lecture.date));
  const [prophet, setProphet] = useState(lecture.prophet_id ?? "");
  const [notes, setNotes] = useState(lecture.notes ?? "");
  const [images, setImages] = useState(lecture.imageItems ?? []);
  const [busy, setBusy] = useState<string | null>(null);
  const [pct, setPct] = useState(0);

  const run = async (key: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(key);
    try { await fn(); if (ok) toast.success(ok); onChanged(); return true; } catch (e) { toast.error((e as Error).message); return false; } finally { setBusy(null); }
  };
  const save = async () => { if (await run("save", () => api("updateLecture", { lecture_id: lecture.lecture_id, title, date, prophet_id: prophet, notes }), "تم حفظ المحاضرة")) onClose(); };
  const move = (i: number, to: number) => {
    const next = images.slice(); const [x] = next.splice(i, 1); next.splice(to, 0, x);
    setImages(next);
    run("order", () => api("reorderLectureImages", { lecture_id: lecture.lecture_id, ids: next.map((im) => im.image_id) }));
  };
  const remove = (image_id: string) => run(image_id, async () => { await api("deleteLectureImage", { image_id }); setImages((l) => l.filter((x) => x.image_id !== image_id)); }, "تم حذف الصورة");
  const add = (files: FileList | null) => {
    if (!files?.length) return;
    run("add", async () => {
      for (const f of Array.from(files)) {
        setPct(0);
        const file_id = await uploadFile(f, "image", setPct);
        const image_id = await api<string>("addLectureImage", { lecture_id: lecture.lecture_id, file_id });
        setImages((l) => [...l, { image_id, file_id }]);
      }
    }, files.length > 1 ? `تمت إضافة ${files.length} صور` : "تمت إضافة الصورة");
  };

  return (
    <>
      <DialogHeader><DialogTitle>تعديل المحاضرة</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div className="grid gap-1.5"><Label htmlFor="le-title">العنوان</Label><Input id="le-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className="h-12 rounded-xl text-base" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5"><Label htmlFor="le-date">التاريخ</Label><Input id="le-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-12 rounded-xl" /></div>
          <div className="grid gap-1.5"><Label htmlFor="le-prophet">عن أي نبي؟</Label><ProphetSelect id="le-prophet" value={prophet} onChange={setProphet} /></div>
        </div>
        <div className="grid gap-1.5"><Label htmlFor="le-notes">ملاحظات</Label><Textarea id="le-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>

        <div className="grid gap-2">
          <Label>الصور ({images.length.toLocaleString("ar-EG")})</Label>
          <ul className="grid grid-cols-3 gap-2">
            {images.map((im, i) => (
              <li key={im.image_id} data-testid="lecture-image" className="relative overflow-hidden rounded-2xl border bg-secondary">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={driveImage(im.file_id, 300)} alt={`صورة ${i + 1}`} className="aspect-square w-full object-cover" loading="lazy" />
                <div className="absolute inset-x-1 bottom-1 flex justify-between gap-1">
                  <Button variant="secondary" size="icon-sm" aria-label={`تقديم صورة ${i + 1}`} disabled={i === 0 || !!busy} onClick={() => move(i, i - 1)}><ArrowRight /></Button>
                  <Button variant="destructive" size="icon-sm" aria-label={`حذف صورة ${i + 1}`} disabled={!!busy} onClick={() => remove(im.image_id)}>{busy === im.image_id ? <Loader2 className="animate-spin" /> : <Trash2 />}</Button>
                  <Button variant="secondary" size="icon-sm" aria-label={`تأخير صورة ${i + 1}`} disabled={i === images.length - 1 || !!busy} onClick={() => move(i, i + 1)}><ArrowLeft /></Button>
                </div>
              </li>
            ))}
            <li>
              <label className="grid aspect-square cursor-pointer place-items-center rounded-2xl border-2 border-dashed text-sm font-bold text-muted-foreground hover:bg-secondary">
                <span className="flex flex-col items-center gap-1">{busy === "add" ? <Loader2 className="animate-spin" /> : <ImagePlus />} إضافة صور</span>
                <input type="file" accept="image/*" multiple className="sr-only" aria-label="إضافة صور" disabled={!!busy} onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
              </label>
            </li>
          </ul>
          {busy === "add" && <Progress value={pct} />}
        </div>
      </div>
      <DialogFooter>
        <Button variant="hero" size="lg2" disabled={!title.trim() || !!busy} onClick={save}>{busy === "save" && <Loader2 className="animate-spin" />} حفظ</Button>
      </DialogFooter>
    </>
  );
}
