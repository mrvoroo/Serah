"use client";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// القارئ يقرأ إعدادات الطفل وآخر موضع من المتصفح، فيُعرض في المتصفح فقط (بدون نسخة مبنية مسبقًا تختلف عنه)
const QuranReader = dynamic(() => import("./quran-reader").then((m) => m.QuranReader), {
  ssr: false,
  loading: () => <div className="grid gap-3"><Skeleton className="h-16 rounded-[28px]" /><Skeleton className="h-48 rounded-[28px]" /><Skeleton className="h-72 rounded-[28px]" /></div>,
});
export function QuranPage() { return <QuranReader />; }
