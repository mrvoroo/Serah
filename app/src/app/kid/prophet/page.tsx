"use client";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import type { Lecture } from "@/lib/api";
import type { ContentItem, ProphetRow } from "@/lib/prophets";
import { ProphetView } from "@/components/prophet-view";
import { Skeleton } from "@/components/ui/skeleton";

function Inner() {
  const id = useSearchParams().get("id") ?? "";
  const { data, error } = useApi<{ prophet: ProphetRow; items: ContentItem[] }>("prophet", { id }, { enabled: !!id });
  const { data: lectures } = useApi<Lecture[]>("lectures");
  return (
    <div className="flex flex-col gap-4 pb-28">
      <Link href="/kid/journey/" className="flex w-fit items-center gap-1 rounded-full bg-secondary px-4 py-2 text-sm font-bold text-secondary-foreground">
        <ArrowRight className="size-4" /> رجوع للرحلة
      </Link>
      {error ? <p className="rounded-[28px] border bg-card p-6 text-center text-muted-foreground">{error}</p>
        : !data ? <div className="grid gap-3"><Skeleton className="h-48 rounded-[32px]" /><Skeleton className="h-32 rounded-[28px]" /></div>
        : <ProphetView prophet={data.prophet} items={data.items} lectures={lectures} />}
    </div>
  );
}

export default function ProphetPage() {
  return <Suspense fallback={<Skeleton className="h-48 rounded-[32px]" />}><Inner /></Suspense>;
}
