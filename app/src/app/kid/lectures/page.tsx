"use client";
import Link from "next/link";
import { CheckCircle2, Clock, Play } from "lucide-react";
import { fmtDate, fmtDur, driveImage, type Lecture, type Me } from "@/lib/api";
import { useApi } from "@/hooks/use-api";
import { BlurFade } from "@/components/ui/blur-fade";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Icon3D } from "@/components/icon3d";
import { Zaid } from "@/components/zaid";
import { g } from "@/lib/kid-text";

export default function LecturesPage() {
  const { data, loading, error, reload } = useApi<Lecture[]>("lectures");
  const me = useApi<Me>("me");
  const heard = new Set(me.data?.attended ?? []);

  return (
    <div className="flex flex-col gap-4">
      <BlurFade>
        <div className="flex items-center gap-3">
          <Icon3D name="headphone" size={56} float />
          <div>
            <h1 className="font-heading text-3xl font-extrabold">المحاضرات</h1>
            <p className="text-muted-foreground">{g("اسمع واكسب", "اسمعي واكسبي")} ١٠ نجوم لكل محاضرة</p>
          </div>
        </div>
      </BlurFade>

      {loading && !data && [0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-[28px]" />)}
      {error && !data && (
        <div className="flex flex-col items-center gap-2 rounded-[28px] border bg-card p-6 text-center">
          <Zaid mood="surprised" size={100} />
          <p>{error}</p>
          <button className="font-bold text-primary" onClick={reload}>{g("حاول تاني", "حاولي تاني")}</button>
        </div>
      )}
      {data?.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-[28px] border bg-card p-6 text-center">
          <Zaid mood="thinking" size={110} />
          <p className="font-bold">لسه مفيش محاضرات، قريبًا إن شاء الله</p>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {data?.map((l, i) => {
          const done = heard.has(l.lecture_id);
          return (
            <BlurFade key={l.lecture_id} delay={0.04 * Math.min(i, 8)} inView>
              <li>
                <Link href={`/kid/lecture/?id=${l.lecture_id}`} className="group flex items-center gap-3 rounded-[28px] border bg-card p-3 shadow-soft transition-transform active:scale-[0.98]">
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-[22px] bg-hero">
                    {l.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={driveImage(l.images[0], 300)} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    ) : <div className="grid size-full place-items-center"><Icon3D name="open-book" size={48} /></div>}
                    <span className="absolute inset-0 grid place-items-center bg-black/25 opacity-0 transition-opacity group-hover:opacity-100"><Play className="size-7 fill-white text-white" /></span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-heading text-lg font-extrabold leading-snug">{l.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <span>{fmtDate(l.date)}</span>
                      {fmtDur(l.duration_sec) && <span className="flex items-center gap-1"><Clock className="size-3.5" />{fmtDur(l.duration_sec)}</span>}
                    </div>
                  </div>
                  {done ? <Badge className="gap-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"><CheckCircle2 className="size-4" />سمعتها</Badge>
                        : <Badge className="rounded-full bg-gold text-[#3A2400]">جديدة</Badge>}
                </Link>
              </li>
            </BlurFade>
          );
        })}
      </ul>
    </div>
  );
}
