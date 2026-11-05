"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";

// ذاكرة مؤقتة بسيطة: تعرض آخر بيانات فورًا ثم تحدّثها في الخلفية
const cache = new Map<string, unknown>();

export function useApi<T>(action: string, params: Record<string, unknown> = {}, opts: { enabled?: boolean } = {}) {
  const key = action + JSON.stringify(params);
  // البيانات مربوطة بمفتاحها: عند تغيّر المعاملات (نافذة اختبار/واجب آخر) لا تظهر بيانات المفتاح القديم
  const [state, setState] = useState<{ key: string; data: T | undefined }>(() => ({ key, data: cache.get(key) as T | undefined }));
  const data = state.key === key ? state.data : (cache.get(key) as T | undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!cache.has(key));
  const alive = useRef(true);
  const enabled = opts.enabled ?? true;

  const load = useCallback(async () => {
    setLoading(!cache.has(key));
    setError(null);
    try {
      const d = await api<T>(action, params);
      cache.set(key, d);
      if (alive.current) setState({ key, data: d });
    } catch (e) {
      const err = e as ApiError;
      if (alive.current) setError(err.message);
    } finally {
      if (alive.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    alive.current = true;
    if (enabled) load();
    return () => { alive.current = false; };
  }, [load, enabled]);

  return { data, error, loading: loading || (enabled && state.key !== key && !cache.has(key)), reload: load };
}

export function invalidate(prefix: string) {
  for (const k of [...cache.keys()]) if (k.startsWith(prefix)) cache.delete(k);
}
