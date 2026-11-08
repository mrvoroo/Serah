"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Radio } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { session } from "@/lib/api";
import { nextSlot, type LiveState } from "@/lib/live";
import { g } from "@/lib/kid-text";

// المحاضرة المباشرة تظهر في القوائم فقط لما سيرفرها يكون جاهز (المطوّر يشوفها دايمًا عشان يجهّزها)
export function useLiveReady() {
  const { data } = useApi<LiveState>("liveState");
  return !!data?.ready || session.user()?.role === "superadmin";
}

// شريط في الصفحة الرئيسية: يظهر لما المحاضرة شغالة (للكل) أو حان ميعادها (للمعلمة)
export function LiveBanner({ teacher }: { teacher: boolean }) {
  const { data } = useApi<LiveState>("liveState");
  const [now] = useState(() => Date.now());
  if (!data?.ready) return null;
  const soon = teacher && !data.live ? nextSlot(data.slots, new Date(now)) : null;
  const due = soon && (soon.running || soon.start.getTime() - now < 30 * 60000) ? soon : null;
  if (!data.live && !due) return null;
  const text = data.live
    ? (teacher ? `المحاضرة شغالة الآن: ${data.live.title}` : `المحاضرة شغالة الآن! ${g("ادخل", "ادخلي")} بسرعة`)
    : `ميعاد المحاضرة: ${due!.slot.title} — ابدئي بضغطة واحدة`;
  return (
    <Link href={teacher ? "/teacher/live/" : "/kid/live/"} className="flex items-center gap-3 rounded-[24px] bg-gradient-to-l from-[#E5484D] to-[#B4237A] p-4 font-bold text-white shadow-soft transition active:scale-[0.98]">
      <Radio className="size-6 shrink-0 animate-pulse" /><span className="min-w-0 flex-1">{text}</span><ArrowLeft className="size-5" />
    </Link>
  );
}
