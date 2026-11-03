"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, session } from "@/lib/api";

// ذاكرة مؤقتة بسيطة: تعرض آخر بيانات فورًا ثم تحدّثها في الخلفية
const cache = new Map<string, unknown>();

export function useApi<T>(action: string, params: Record<string, unknown> = {}, opts: { enabled?: boolean } = {}) {
  const key = action + JSON.stringify(params);
  const [data, setData] = useState<T | undefined>(() => cache.get(key) as T | undefined);
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
      if (alive.current) setData(d);
    } catch (e) {
      const err = e as ApiError;
      if (err.auth) { session.clear(); if (typeof window !== "undefined") window.location.assign(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/`); }
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

  return { data, error, loading, reload: load };
}

export function invalidate(prefix: string) {
  for (const k of [...cache.keys()]) if (k.startsWith(prefix)) cache.delete(k);
}
