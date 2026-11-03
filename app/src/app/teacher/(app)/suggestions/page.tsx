"use client";
import { fmtDate, type Suggestion } from "@/lib/api";
import { useApi } from "@/hooks/use-api";
import { Skeleton } from "@/components/ui/skeleton";
import { BlurFade } from "@/components/ui/blur-fade";
import { Icon3D } from "@/components/icon3d";

export default function SuggestionsPage() {
  const { data, loading } = useApi<Suggestion[]>("suggestions");
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3"><Icon3D name="speech" size={48} /><div><h1 className="font-heading text-2xl font-extrabold">الاقتراحات</h1><p className="text-sm text-muted-foreground">أفكار الأطفال والمعلمات</p></div></div>
      {loading && !data ? <Skeleton className="h-24 rounded-[24px]" /> : (
        <ul className="flex flex-col gap-3">
          {data?.map((s, i) => (
            <BlurFade key={s.id} delay={0.03 * Math.min(i, 10)}>
              <li className="rounded-[24px] border bg-card p-4 shadow-soft">
                <div className="mb-1 flex items-center justify-between text-sm text-muted-foreground"><b className="text-foreground">{s.name || "بدون اسم"}</b><span>{fmtDate(s.at)}</span></div>
                <p className="whitespace-pre-wrap leading-relaxed">{s.text}</p>
              </li>
            </BlurFade>
          ))}
          {data?.length === 0 && <p className="rounded-[24px] border bg-card p-6 text-center text-muted-foreground">لا توجد اقتراحات بعد</p>}
        </ul>
      )}
    </div>
  );
}
