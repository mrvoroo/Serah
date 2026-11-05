"use client";
import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { session, type Lecture, type Quiz } from "@/lib/api";
import { Icon3D } from "@/components/icon3d";
import type { ContentItem, ProphetRow } from "@/lib/prophets";
import { ProphetView } from "@/components/prophet-view";
import { Skeleton } from "@/components/ui/skeleton";
import { g } from "@/lib/kid-text";

function Inner() {
  const id = useSearchParams().get("id") ?? "";
  // صفحة كل نبي تبدأ من أولها (المتصفح والسكرول الناعم قد يحتفظان بمكان الصفحة السابقة)
  useEffect(() => {
    const lenis = (window as unknown as { __lenis?: { scrollTo: (y: number, o?: object) => void } }).__lenis;
    lenis?.scrollTo(0, { immediate: true, force: true });
    window.scrollTo(0, 0);
  }, [id]);
  const { data, error } = useApi<{ prophet: ProphetRow; items: ContentItem[] }>("prophet", { id }, { enabled: !!id });
  const { data: lectures } = useApi<Lecture[]>("lectures");
  const staff = session.user()?.role !== "student";
  // اختبارات هذا النبي (للطفل فقط)
  const { data: quizzes } = useApi<Quiz[]>("quizzes", { prophet_id: id }, { enabled: !!id && !staff });
  return (
    <div className="flex flex-col gap-4 pb-28">
      <Link href={`/kid/journey/?at=${id}`} className="flex w-fit items-center gap-1 rounded-full bg-secondary px-4 py-2 text-sm font-bold text-secondary-foreground">
        <ArrowRight className="size-4" /> رجوع للرحلة
      </Link>
      {error || (data && !data.prophet) ? <p className="rounded-[28px] border bg-card p-6 text-center text-muted-foreground">{error || "القسم غير موجود"}</p>
        : !data ? <div className="grid gap-3"><Skeleton className="h-48 rounded-[32px]" /><Skeleton className="h-32 rounded-[28px]" /></div>
        : <ProphetView prophet={data.prophet} items={data.items} lectures={lectures} lectureHref={staff ? () => "/teacher/lectures/" : undefined} />}
      {!!quizzes?.length && (
        <section aria-labelledby="h-prophet-quiz" className="flex flex-col gap-2 rounded-[28px] border bg-card p-4 shadow-soft">
          <h2 id="h-prophet-quiz" className="flex items-center gap-2 font-heading text-xl font-extrabold"><Icon3D name="thinking" size={40} /> اختبر نفسك</h2>
          {quizzes.map((z) => (
            <Link key={z.quiz_id} href={`/kid/quiz/?id=${z.quiz_id}`} className="flex min-h-14 items-center justify-between gap-2 rounded-2xl bg-hero px-4 py-2 font-bold text-white transition-transform active:scale-[0.98]">
              <span className="line-clamp-2 leading-snug">{z.title}</span>
              <span className="shrink-0 text-sm text-white/85">{z.mine ? `${z.mine.score.toLocaleString("ar-EG")} من ${z.mine.total.toLocaleString("ar-EG")}` : g("ابدأ", "ابدئي")}</span>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}

export default function ProphetPage() {
  return <Suspense fallback={<Skeleton className="h-48 rounded-[32px]" />}><Inner /></Suspense>;
}
