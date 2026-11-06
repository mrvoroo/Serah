"use client";
import { Zaid, type Mood } from "@/components/zaid";
import { isGirl } from "@/lib/kid-text";

// رفيق الطفل: زيد للأولاد و«حبيبة» للبنات (حسب ما تحدده المعلمة في صفحة الطلاب)
export function KidBuddy(props: { mood?: Mood; size?: number; className?: string; float?: boolean }) {
  return <Zaid {...props} girl={isGirl()} />;
}
