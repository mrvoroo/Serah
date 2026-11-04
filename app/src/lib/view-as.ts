"use client";
import { api, session, type Role, type User } from "@/lib/api";

// «عرض كـ» للمطوّر: نحفظ جلسة المطوّر جانبًا، وندخل بتوكن معاينة (ساعتين، للعرض فقط)، ثم نرجع لها
const ADMIN_KEY = "serah_admin_session";
const MARK_KEY = "serah_view_as";
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export type ViewAs = { name: string; role: Role };

function read<T>(key: string): T | null {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : null; } catch { return null; }
}
function write(key: string, v: unknown) {
  try { if (v === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(v)); } catch { /* تخزين غير متاح */ }
}

export function viewAsInfo(): ViewAs | null { return read<ViewAs>(MARK_KEY); }

export const ROLE_LABEL: Record<Role, string> = { student: "طفل", teacher: "معلمة", admin: "معلمة أدمن", superadmin: "مطوّر" };

export async function startViewAs(user_id: string) {
  const d = await api<{ token: string; user: User }>("viewAs", { user_id });
  if (!read(ADMIN_KEY)) write(ADMIN_KEY, { token: session.token(), user: session.user() });
  session.save(d);
  write(MARK_KEY, { name: d.user.name, role: d.user.role });
  // تحميل كامل للصفحة حتى لا تبقى أي بيانات من حساب المطوّر في الذاكرة
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign(`${base}${d.user.role === "student" ? "/kid/" : "/teacher/"}`);
}

export function stopViewAs(to = "/admin/users/") {
  const admin = read<{ token: string; user: User }>(ADMIN_KEY);
  write(MARK_KEY, null);
  write(ADMIN_KEY, null);
  if (admin?.token && admin.user) session.save(admin); else session.clear();
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign(`${base}${admin?.token ? to : "/teacher/login/"}`);
}
