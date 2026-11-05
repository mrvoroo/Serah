"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { QuizPlayer } from "@/components/kid/quiz-player";

function Inner() {
  const id = useSearchParams().get("id") ?? "";
  return <QuizPlayer key={id} id={id} />;
}

export default function QuizPage() {
  return <Suspense fallback={<Skeleton className="h-80 rounded-[32px]" />}><Inner /></Suspense>;
}
