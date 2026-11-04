"use client";
import { useEffect, useSyncExternalStore } from "react";
import { driveAudio, loadMediaConfig, mediaKey } from "@/lib/api";

// رابط تشغيل الصوت يتحدّث فور وصول مفتاح Drive API من الخلفية (بدون إعادة تحميل الصفحة)
const subscribe = (fn: () => void) => { window.addEventListener("serah-media", fn); return () => window.removeEventListener("serah-media", fn); };
let loaded = false;
export function useAudioUrl() {
  const key = useSyncExternalStore(subscribe, mediaKey, () => "");
  useEffect(() => { if (!loaded) { loaded = true; loadMediaConfig(); } }, []);
  return (id: string) => driveAudio(id, key);
}
