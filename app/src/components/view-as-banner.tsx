"use client";
import { useEffect, useSyncExternalStore } from "react";
import { Eye, Undo2 } from "lucide-react";
import { session } from "@/lib/api";
import { ROLE_LABEL, stopViewAs, type ViewAs } from "@/lib/view-as";

const MARK_KEY = "serah_view_as";
const noop = () => () => {};
const readMark = () => { try { return localStorage.getItem(MARK_KEY); } catch { return null; } };

// شريط ثابت أعلى الشاشة طوال وضع «عرض كـ»، مع رجوع لحساب المطوّر
export function ViewAsBanner() {
  const raw = useSyncExternalStore(noop, readMark, () => null);
  const info = raw ? (JSON.parse(raw) as ViewAs) : null;
  // انتهت جلسة المعاينة (ساعتان) أو خرج منها: نرجع لحساب المطوّر تلقائيًا
  useEffect(() => { if (raw && !session.token()) stopViewAs(); }, [raw]);
  if (!info) return null;
  return (
    <>
      {/* إزاحة المحتوى والعناوين الثابتة تحت الشريط */}
      <style>{`body{padding-top:44px}.sticky.top-0{top:44px}`}</style>
      <div role="status" className="fixed inset-x-0 top-0 z-[70] flex h-11 items-center justify-center gap-3 bg-gold px-3 text-sm font-bold text-[#3D2600] shadow-soft">
        <Eye className="size-4 shrink-0" />
        <span className="truncate">أنت تشاهد كـ: {info.name} ({ROLE_LABEL[info.role]}) — للعرض فقط</span>
        <button type="button" onClick={() => stopViewAs()} className="flex h-9 shrink-0 items-center gap-1 rounded-full bg-black/15 px-3 hover:bg-black/25">
          <Undo2 className="size-4" /> رجوع لحسابي
        </button>
      </div>
    </>
  );
}
