"use client";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api, fmtDate, fmtDur, session, type Lecture } from "@/lib/api";
import { useAudioUrl } from "@/hooks/use-media-key";
import { invalidate, useApi } from "@/hooks/use-api";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BlurFade } from "@/components/ui/blur-fade";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LectureEditor, useProphetOptions } from "@/components/teacher/lecture-editor";
import { Icon3D } from "@/components/icon3d";

export default function TeacherLectures() {
  const { data, loading, reload } = useApi<Lecture[]>("lectures");
  const audioUrl = useAudioUrl();
  const [filter, setFilter] = useState<"all" | "draft" | "published">("all");
  const [pending, setPending] = useState<string | null>(null);
  const list = (data ?? []).filter((l) => filter === "all" || l.status === filter);
  const [editing, setEditing] = useState<Lecture | null>(null);
  const [delFor, setDelFor] = useState<Lecture | null>(null);
  const isAdmin = ["admin", "superadmin"].includes(session.user()?.role ?? "");
  const prophets = useProphetOptions();
  const prophetName = (id?: string) => prophets.find((p) => p.value === id)?.label;
  const refresh = () => { invalidate("lectures"); invalidate("dashboard"); reload(); };
  const del = async () => {
    if (!delFor) return;
    setPending(delFor.lecture_id);
    try { await api("deleteLecture", { lecture_id: delFor.lecture_id }); toast.success("تم حذف المحاضرة"); setDelFor(null); refresh(); }
    catch (e) { toast.error((e as Error).message); } finally { setPending(null); }
  };

  const toggle = async (l: Lecture, on: boolean) => {
    setPending(l.lecture_id);
    try {
      await api("setLectureStatus", { lecture_id: l.lecture_id, status: on ? "published" : "draft" });
      toast.success(on ? "تم النشر للأطفال" : "تم إخفاء المحاضرة");
      invalidate("lectures"); invalidate("dashboard"); reload();
    } catch (e) { toast.error((e as Error).message); } finally { setPending(null); }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3"><Icon3D name="headphone" size={48} float /><div><h1 className="font-heading text-2xl font-extrabold">المحاضرات</h1><p className="text-sm text-muted-foreground">استمعي للمسودة ثم انشريها بعد المراجعة</p></div></div>
        <Link href="/teacher/upload/" className={buttonVariants({ variant: "hero", size: "lg2" })}><Plus /> رفع تسجيل</Link>
      </div>
      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList className="h-11 rounded-2xl">
          <TabsTrigger value="all" className="rounded-xl px-4">الكل</TabsTrigger>
          <TabsTrigger value="draft" className="rounded-xl px-4">مسودات</TabsTrigger>
          <TabsTrigger value="published" className="rounded-xl px-4">منشورة</TabsTrigger>
        </TabsList>
      </Tabs>
      {loading && !data ? [0, 1].map((i) => <Skeleton key={i} className="h-36 rounded-[24px]" />) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {list.map((l, i) => (
            <BlurFade key={l.lecture_id} delay={0.03 * Math.min(i, 10)}>
              <li className="flex flex-col gap-3 rounded-[24px] border bg-card p-4 shadow-soft">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-heading text-lg font-extrabold leading-snug">{l.title}</p>
                    <p className="text-sm text-muted-foreground">{fmtDate(l.date)}{fmtDur(l.duration_sec) && ` · ${fmtDur(l.duration_sec)}`} · {l.images?.length ?? 0} صور{prophetName(l.prophet_id) && ` · ${prophetName(l.prophet_id)}`}</p>
                  </div>
                  {l.status === "published" ? <Badge className="rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">منشورة</Badge> : <Badge className="rounded-full bg-gold text-[#3A2400]">مسودة</Badge>}
                </div>
                <audio controls preload="metadata" src={audioUrl(l.audio_file_id)} className="w-full" />
                <div className="flex gap-2">
                  <Button variant="secondary" size="lg2" className="flex-1" aria-label={`تعديل ${l.title}`} onClick={() => setEditing(l)}><Pencil /> تعديل والصور</Button>
                  {(l.status === "draft" || isAdmin) && <Button variant="ghost" size="icon-xl" className="text-destructive" aria-label={`حذف ${l.title}`} onClick={() => setDelFor(l)}><Trash2 /></Button>}
                </div>
                <label className="flex items-center justify-between rounded-2xl bg-secondary/50 p-3 font-bold">
                  تمت المراجعة — ظاهرة للأطفال
                  <Switch checked={l.status === "published"} disabled={pending === l.lecture_id} onCheckedChange={(v) => toggle(l, v)} />
                </label>
              </li>
            </BlurFade>
          ))}
          {list.length === 0 && <p className="col-span-full rounded-[24px] border bg-card p-6 text-center text-muted-foreground">لا توجد محاضرات هنا</p>}
        </ul>
      )}

      <LectureEditor lecture={editing} onClose={() => setEditing(null)} onChanged={refresh} />
      <Dialog open={!!delFor} onOpenChange={(o) => !o && setDelFor(null)}>
        <DialogContent className="rounded-[28px] sm:max-w-sm">
          <DialogHeader><DialogTitle>حذف «{delFor?.title}»؟</DialogTitle><DialogDescription>تختفي المحاضرة وصورها من المنصة (الملفات تبقى على درايف)</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="destructive" size="lg2" disabled={!!pending} onClick={del}>حذف</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
