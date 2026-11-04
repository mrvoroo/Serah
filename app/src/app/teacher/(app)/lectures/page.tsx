"use client";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { api, driveAudio, fmtDate, fmtDur, type Lecture } from "@/lib/api";
import { invalidate, useApi } from "@/hooks/use-api";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BlurFade } from "@/components/ui/blur-fade";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buttonVariants } from "@/components/ui/button";
import { Icon3D } from "@/components/icon3d";

export default function TeacherLectures() {
  const { data, loading, reload } = useApi<Lecture[]>("lectures");
  const [filter, setFilter] = useState<"all" | "draft" | "published">("all");
  const [pending, setPending] = useState<string | null>(null);
  const list = (data ?? []).filter((l) => filter === "all" || l.status === filter);

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
                    <p className="text-sm text-muted-foreground">{fmtDate(l.date)}{fmtDur(l.duration_sec) && ` · ${fmtDur(l.duration_sec)}`} · {l.images?.length ?? 0} صور</p>
                  </div>
                  {l.status === "published" ? <Badge className="rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">منشورة</Badge> : <Badge className="rounded-full bg-gold text-[#3A2400]">مسودة</Badge>}
                </div>
                <audio controls preload="none" src={driveAudio(l.audio_file_id)} className="w-full" />
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
    </div>
  );
}
