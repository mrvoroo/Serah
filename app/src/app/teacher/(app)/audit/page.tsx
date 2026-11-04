"use client";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { useRequireRole } from "@/components/kid/kid-shell";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Icon3D } from "@/components/icon3d";

type Entry = { at: string; user_id: string; name: string; role: string; action: string; target_id: string; details_json: string; imp_name: string };

// أسماء العمليات بالعربي لسهولة القراءة
const ACTION_LABEL: Record<string, string> = {
  addStudent: "إضافة طفل", setStudentPin: "تغيير رمز طفل", removeStudent: "حذف طفل", setClassCode: "تغيير كود الفصل",
  changeMyPin: "تغيير رمزها", createLecture: "إضافة محاضرة", setLectureStatus: "نشر/إخفاء محاضرة",
  viewAs: "عرض كـ", setRole: "تغيير دور", setUserActive: "تفعيل/تعطيل حساب", setUserPin: "رمز جديد لحساب",
  "superadmin.create": "إنشاء حساب المطوّر", "superadmin.resetPin": "تغيير رمز المطوّر"
};
const fmt = (iso: string) => { const d = new Date(iso); return isNaN(+d) ? iso : d.toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" }); };

export default function AuditPage() {
  const me = useRequireRole(["admin", "superadmin"]);
  const { data, loading, error } = useApi<Entry[]>("auditLog", { limit: 300 }, { enabled: !!me });
  const [q, setQ] = useState("");
  const list = useMemo(() => (data ?? []).filter((e) => !q.trim() || [e.name, ACTION_LABEL[e.action] ?? e.action, e.details_json].join(" ").includes(q.trim())), [data, q]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3"><Icon3D name="clipboard" size={48} /><div><h1 className="font-heading text-2xl font-extrabold">سجل العمليات</h1><p className="text-sm text-muted-foreground">كل تعديل إداري: من، ماذا، ومتى</p></div></div>
      <div className="relative">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالاسم أو العملية" aria-label="بحث في السجل" className="h-11 rounded-2xl ps-9" />
      </div>
      {error && <p role="alert" className="rounded-2xl bg-destructive/10 p-3 font-bold text-destructive">{error}</p>}
      {loading && !data ? <Skeleton className="h-40 rounded-[24px]" /> : (
        <ol className="flex flex-col gap-2">
          {list.map((e, i) => (
            <li key={i} data-testid="audit-row" className="rounded-[20px] border bg-card p-3 text-sm shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold">{ACTION_LABEL[e.action] ?? e.action} <span className="font-normal text-muted-foreground">— {e.name}</span></p>
                <time className="text-xs text-muted-foreground" dateTime={e.at}>{fmt(e.at)}</time>
              </div>
              {e.details_json && e.details_json !== "{}" && <p className="mt-1 truncate font-mono text-xs text-muted-foreground" dir="ltr">{e.details_json}</p>}
            </li>
          ))}
          {data && list.length === 0 && <p className="rounded-[24px] border bg-card p-6 text-center text-muted-foreground">لا توجد عمليات</p>}
        </ol>
      )}
    </div>
  );
}
