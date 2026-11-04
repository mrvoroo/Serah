"use client";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { api, driveAudio, loadMediaConfig, mediaKey } from "@/lib/api";

// رابط تشغيل الصوت يتحدّث فور وصول مفتاح Drive API من الخلفية (بدون إعادة تحميل الصفحة)
const subscribe = (fn: () => void) => { window.addEventListener("serah-media", fn); return () => window.removeEventListener("serah-media", fn); };
let loaded = false;
export function useAudioUrl() {
  const key = useSyncExternalStore(subscribe, mediaKey, () => "");
  useEffect(() => { if (!loaded) { loaded = true; loadMediaConfig(); } }, []);
  return (id: string) => driveAudio(id, key);
}

// التسجيلات التي جُمّعت من الخلفية (لا نعيد تنزيلها في نفس الزيارة)
const blobs = new Map<string, string>();

// مصدر الصوت: رابط درايف أولًا (يبدأ التشغيل فورًا)، ولو فشل في المتصفح نطلب التسجيل من الخلفية على أجزاء
// (الخلفية تقرأ الملف بصلاحية صاحب الدرايف) ونشغّله من المتصفح مباشرة — يعمل على أي جهاز
export function useAudioSource(id: string) {
  const audioUrl = useAudioUrl();
  const [state, setState] = useState<{ id: string; src?: string; loading: boolean; pct: number; error: string }>({ id, loading: false, pct: 0, error: "" });
  const current = state.id === id ? state : { id, loading: false, pct: 0, error: "" };
  const src = blobs.get(id) ?? current.src ?? (id ? audioUrl(id) : undefined);

  const onError = useCallback(async (e?: { currentTarget: HTMLAudioElement }) => {
    const el = e?.currentTarget;
    if (!id || blobs.has(id)) return;
    setState({ id, loading: true, pct: 0, error: "" });
    try {
      const parts: Uint8Array[] = [];
      let start = 0, total = 1, type = "audio/mpeg";
      while (start < total) {
        const c = await api<{ data: string; total: number; type: string }>("audioChunk", { id, start });
        if (!c.data) break;
        const bin = atob(c.data), part = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) part[i] = bin.charCodeAt(i);
        parts.push(part); start += part.length; total = c.total || start; type = c.type || type;
        setState({ id, loading: true, pct: Math.min(99, Math.round((start / total) * 100)), error: "" });
      }
      const url = URL.createObjectURL(new Blob(parts as BlobPart[], { type }));
      blobs.set(id, url);
      setState({ id, src: url, loading: false, pct: 100, error: "" });
      // نكمل التشغيل لو كان الضغط على تشغيل هو سبب المحاولة
      if (el) setTimeout(() => el.play().catch(() => {}), 0);
    } catch (err) {
      setState({ id, loading: false, pct: 0, error: (err as Error).message || "تعذّر تشغيل التسجيل" });
    }
  }, [id]);

  return { src: current.loading ? undefined : src, onError, loading: current.loading, pct: current.pct, error: current.error, ready: blobs.has(id) };
}
