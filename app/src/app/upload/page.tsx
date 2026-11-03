"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { session } from "@/lib/api";

// رابط البوت القديم: يحوّل لصفحة الرفع (أو الدخول أولًا)
export default function UploadRedirect() {
  const router = useRouter();
  useEffect(() => {
    const u = session.user();
    router.replace(u && u.role !== "student" ? "/teacher/upload/" : "/teacher/login/?next=upload");
  }, [router]);
  return null;
}
