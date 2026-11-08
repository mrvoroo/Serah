"use client";
import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

// نسخة جديدة من المنصة: GitHub Pages يمسح ملفات النسخة القديمة مع كل تحديث، والآيفون يفضل فاتح الصفحة القديمة من الذاكرة،
// فلما تطلب ملفًا اتمسح تعلق. هنا: نسأل كل شوية عن رقم النسخة، ولو اتغير يظهر زر «حدّث الآن» لكل المستخدمين،
// ولو ملف من النسخة القديمة فشل تحميله نحدّث تلقائيًا مرة واحدة.
const BUILD = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const RELOADED = "serah_chunk_reload";
const STALE = /ChunkLoadError|Loading chunk|Loading CSS chunk|dynamically imported module|Importing a module script failed|error loading dynamically/i;

async function latestBuild(): Promise<string | null> {
  try {
    const r = await fetch(`${BASE}/version.json?t=${Date.now()}`, { cache: "no-store" });
    if (!r.ok) return null;
    return String((await r.json()).build || "") || null;
  } catch { return null; }
}

// تحديث نظيف: نحدّث عامل الخدمة، ونمسح ملفات الواجهة المخزنة (مش إعدادات الإشعارات)، ونفتح الصفحة برابط جديد يتخطى ذاكرة سفاري
export async function applyUpdate() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    await reg?.update();
    reg?.waiting?.postMessage?.("skip");
  } catch { /* نكمل */ }
  try { const ks = await caches.keys(); await Promise.all(ks.filter((k) => k !== "serah-notify").map((k) => caches.delete(k))); } catch { /* نكمل */ }
  const u = new URL(location.href);
  u.searchParams.set("_v", String(Date.now()));
  location.replace(u.toString());
}

export function UpdateBanner() {
  const [fresh, setFresh] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (BUILD === "dev") return;
    // بعد التحديث: نشيل علامة الرابط
    const u = new URL(location.href);
    if (u.searchParams.has("_v")) { u.searchParams.delete("_v"); history.replaceState(history.state, "", u.toString()); }
    let alive = true;
    const check = async () => { const b = await latestBuild(); if (alive && b && b !== BUILD) setFresh(true); };
    const onVisible = () => { if (document.visibilityState === "visible") check(); };
    // ملف من نسخة قديمة فشل: نحدّث تلقائيًا (مرة واحدة كل ١٠ دقائق عشان ما ندخلش في حلقة)
    const onFail = (msg: string) => {
      if (!STALE.test(msg)) return;
      let last = 0;
      try { last = Number(sessionStorage.getItem(RELOADED) || 0); } catch { /* */ }
      if (Date.now() - last > 10 * 60e3) { try { sessionStorage.setItem(RELOADED, String(Date.now())); } catch { /* */ } applyUpdate(); }
      else setFresh(true);
    };
    const onError = (e: ErrorEvent) => onFail(`${e.message} ${(e.error as Error)?.name ?? ""}`);
    const onReject = (e: PromiseRejectionEvent) => { const r = e.reason as Error | undefined; onFail(`${r?.name ?? ""} ${r?.message ?? String(e.reason ?? "")}`); };
    check();
    const t = setInterval(check, 10 * 60e3);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onReject);
    return () => {
      alive = false; clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onReject);
    };
  }, []);

  if (!fresh) return null;
  return (
    <div role="alert" className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+12px)] z-[100] mx-auto flex max-w-md items-center gap-3 rounded-[22px] bg-gradient-to-l from-[#7B5CFF] to-[#4B2FD1] p-3 pr-4 text-white shadow-2xl">
      <span className="min-w-0 flex-1 text-sm font-bold leading-6">فيه نسخة جديدة من المنصة ✨</span>
      <button type="button" disabled={busy} onClick={() => { setBusy(true); applyUpdate(); }}
        className="flex h-11 shrink-0 items-center gap-2 rounded-2xl bg-white px-4 font-extrabold text-[#4B2FD1] disabled:opacity-70">
        <RefreshCw className={busy ? "size-4 animate-spin" : "size-4"} /> حدّث الآن
      </button>
    </div>
  );
}
