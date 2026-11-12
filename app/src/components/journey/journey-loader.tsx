"use client";
import { useEffect, useMemo, useState } from "react";
import { useApi } from "@/hooks/use-api";
import { stationsKey, toStations, type ProphetRow } from "@/lib/prophets";
import { Journey } from "./journey";

// الرحلة تُبنى مرة واحدة: نعرض آخر أقسام محفوظة على الجهاز فورًا، أو ننتظر الخادم (حتى ٣ ثوانٍ ثم البيانات الاحتياطية).
// لو وصل من الخادم نفس الأقسام لا يُعاد البناء؛ ولو اختلفت (ترتيب، إخفاء، تعديل) يُعاد بناء المجسم بها
const KEY = "serah_journey_rows";
function readRows(): ProphetRow[] | null { try { const v = JSON.parse(localStorage.getItem(KEY) || "null"); return Array.isArray(v) && v.length ? v : null; } catch { return null; } }

export function JourneyLoader() {
  const { data, error } = useApi<ProphetRow[]>("journey");
  const [cached, setCached] = useState<ProphetRow[] | null | undefined>(undefined); // undefined = لم نقرأ الجهاز بعد
  const [late, setLate] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setCached(readRows()); const t = setTimeout(() => setLate(true), 3000); return () => clearTimeout(t); }, []);
  useEffect(() => { if (Array.isArray(data) && data.length) { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* لا شيء */ } } }, [data]);
  const stations = useMemo(() => {
    const rows = Array.isArray(data) && data.length ? data : cached ?? (late || error || Array.isArray(data) ? [] : undefined);
    return rows === undefined ? null : toStations(rows);
  }, [data, cached, late, error]);
  if (!stations) return (
    <div role="status" className="grid min-h-[70svh] place-items-center">
      <span className="flex flex-col items-center gap-3 text-muted-foreground">
        <span className="size-12 animate-spin rounded-full border-4 border-gold/30 border-t-gold" />
        <span className="font-bold">جارٍ تجهيز الرحلة…</span>
      </span>
    </div>
  );
  return <Journey key={stationsKey(stations)} stations={stations} />;
}
