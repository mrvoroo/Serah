"use client";
import { useMemo } from "react";
import { useApi } from "@/hooks/use-api";
import { stationsKey, toStations, type ProphetRow } from "@/lib/prophets";
import { Journey } from "./journey";

// الرحلة تعرض البيانات الاحتياطية فورًا، ولو أقسام الجدول مختلفة (ترتيب، إخفاء، تعديل) يُعاد بناء المجسم بها
export function JourneyLoader() {
  const { data } = useApi<ProphetRow[]>("journey");
  const stations = useMemo(() => toStations(data), [data]);
  return <Journey key={stationsKey(stations)} stations={stations} />;
}
