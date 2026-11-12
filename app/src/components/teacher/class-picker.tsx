"use client";
import { useEffect, useState } from "react";
import { session } from "@/lib/api";
import { useApi } from "@/hooks/use-api";
import { useHydrated } from "@/hooks/use-hydrated";

// الأدمن والمطوّر يديرون كل الفصول: يختارون الفصل الذي يعملون عليه (يُحفظ على الجهاز)
// المعلمة تعمل على فصلها فقط فلا يظهر لها الاختيار
export type ClassRow = { class_id: string; name: string; join_code: string; teacher_id: string; teacher: string; teachers: { user_id: string; name: string; role: string }[]; kids: number; lectures: number; published: number };
const KEY = "serah_class";

export function useClassScope() {
  const hydrated = useHydrated();
  const role = hydrated ? session.user()?.role : undefined;
  const manager = role === "admin" || role === "superadmin";
  const classes = useApi<ClassRow[]>("classes", {}, { enabled: manager });
  const [picked, setPicked] = useState<string>("");
  // الاختيار من الرابط (?class=) أو المحفوظ على الجهاز
  useEffect(() => {
    if (!manager) return;
    const q = new URLSearchParams(location.search).get("class");
    let v = q || "";
    if (!v) { try { v = localStorage.getItem(KEY) || ""; } catch { /* لا شيء */ } }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (v) setPicked(v);
  }, [manager]);
  const list = Array.isArray(classes.data) ? classes.data : [];
  const mine = session.user()?.class_id ?? "";
  // فصل غير موجود (اتحذف) يرجع للافتراضي
  const class_id = manager ? (list.some((c) => c.class_id === picked) ? picked : list.some((c) => c.class_id === mine) ? mine : list[0]?.class_id ?? "") : "";
  const pick = (id: string) => { setPicked(id); try { localStorage.setItem(KEY, id); } catch { /* لا شيء */ } };
  return { manager, classes: list, class_id, current: list.find((c) => c.class_id === class_id), pick, reloadClasses: classes.reload, ready: !manager || !!class_id || (!classes.loading && list.length === 0) };
}

export function ClassSelect({ scope }: { scope: ReturnType<typeof useClassScope> }) {
  if (!scope.manager || scope.classes.length < 2) return null;
  return (
    <label className="flex items-center gap-2 text-sm font-bold">
      الفصل:
      <select value={scope.class_id} onChange={(e) => scope.pick(e.target.value)} aria-label="اختيار الفصل"
        className="h-11 rounded-xl border bg-background px-3 text-base">
        {scope.classes.map((c) => <option key={c.class_id} value={c.class_id}>{c.name} ({c.kids.toLocaleString("ar-EG")})</option>)}
      </select>
    </label>
  );
}
