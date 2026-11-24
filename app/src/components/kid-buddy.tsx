"use client";
import { Zaid, type Mood } from "@/components/zaid";
import { Murshida } from "@/components/murshida";
import { Father, Mother } from "@/components/family";
import { session } from "@/lib/api";
import { isGirl } from "@/lib/kid-text";

// رفيق صاحب الشاشة في الصفحات المشتركة (مثل رحلة الأنبياء): زيد للأولاد و«حبيبة» للبنات،
// والأب أو الأم لولي الأمر، والمرشدة للمعلمات — بنفس المشاعر
export function KidBuddy(props: { mood?: Mood; size?: number; className?: string; float?: boolean }) {
  const u = session.user();
  if (u?.role === "parent") return u.gender === "f" ? <Mother {...props} /> : <Father {...props} />;
  if (u?.role === "teacher" || u?.role === "admin") return <Murshida {...props} />;
  return <Zaid {...props} girl={isGirl()} />;
}
