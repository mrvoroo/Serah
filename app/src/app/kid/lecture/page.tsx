"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Player } from "@/components/kid/player";

function Inner() {
  const id = useSearchParams().get("id") ?? "";
  return <Player id={id} />;
}

export default function LecturePage() {
  return <Suspense fallback={<Skeleton className="aspect-[4/3] rounded-[32px]" />}><Inner /></Suspense>;
}
