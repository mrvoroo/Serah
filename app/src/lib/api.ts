// الاتصال بالخلفية (Google Apps Script). الطلب بصيغة نص عادي لتجنب طلب preflight.
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "https://script.google.com/macros/s/AKfycbz5QzGujgyndr_k1QpuFkPBQTjgA-KkxQoP9WOBV66-6pi5X-o4Q4JWLiJauDR2Xt39/exec";

export type Role = "student" | "teacher" | "admin" | "superadmin";
export type User = { user_id: string; name: string; role: Role; class_id: string; avatar: string };
export type Kid = { user_id: string; name: string; avatar: string; points?: number };
export type Lecture = {
  lecture_id: string; class_id: string; title: string; date: string; audio_file_id: string;
  duration_sec: number | string; status: "draft" | "published"; images: string[];
  prophet_id?: string; notes?: string; imageItems?: { image_id: string; file_id: string }[];
};
export type Leaderboard = { top: (Kid & { points: number })[]; me: number };

const TOKEN_KEY = "serah_token";
const USER_KEY = "serah_user";

function safeGet(key: string) { try { return localStorage.getItem(key); } catch { return null; } }
function safeSet(key: string, v: string | null) { try { if (v === null) localStorage.removeItem(key); else localStorage.setItem(key, v); } catch { /* تخزين غير متاح */ } }

export const session = {
  token: () => safeGet(TOKEN_KEY),
  user: (): User | null => { const raw = safeGet(USER_KEY); try { return raw ? (JSON.parse(raw) as User) : null; } catch { return null; } },
  save: (d: { token: string; user: User }) => { safeSet(TOKEN_KEY, d.token); safeSet(USER_KEY, JSON.stringify(d.user)); },
  clear: () => { safeSet(TOKEN_KEY, null); safeSet(USER_KEY, null); },
};

export class ApiError extends Error {
  auth: boolean;
  constructor(message: string, auth = false) { super(message); this.auth = auth; }
}

export async function api<T = unknown>(action: string, params: Record<string, unknown> = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, token: session.token(), ...params }),
    });
  } catch {
    throw new ApiError("لا يوجد اتصال بالإنترنت، حاولي مرة أخرى");
  }
  let j: { ok: boolean; data?: T; error?: string };
  try { j = await res.json(); } catch { throw new ApiError("الخادم لا يستجيب الآن، حاولي بعد قليل"); }
  if (!j.ok) {
    const msg = j.error || "حدث خطأ";
    throw new ApiError(msg, /جلسة|مسجل|رمز غير صالح/.test(msg));
  }
  return j.data as T;
}

// روابط ملفات درايف
export const driveAudio = (id: string) => `https://drive.usercontent.google.com/download?id=${id}&export=download`;
export const driveImage = (id: string, w = 1200) => `https://drive.google.com/thumbnail?id=${id}&sz=w${w}`;

export const withBase = (p: string) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${p}`;

export type Me = { points: number; attended: string[]; rank: number; total: number };
export type Dashboard = {
  kids: number; lectures: number; published: number; drafts: number; attendanceRate: number; totalPoints: number;
  perLecture: { title: string; date: string; count: number }[];
  days: { day: string; count: number }[];
  top: (Kid & { points: number })[];
  recent: { name: string; avatar: string; lecture: string; at: string }[];
  newSuggestions: number;
};
export type Suggestion = { id: string; text: string; status: string; at: string; name: string };
export const fmtDate = (d: string) => { try { return new Date(d).toLocaleDateString("ar-EG", { day: "numeric", month: "long" }); } catch { return String(d).slice(0, 10); } };
export const fmtDur = (s: number | string) => { const n = Number(s) || 0; if (!n) return ""; const m = Math.round(n / 60); return m >= 60 ? `${Math.floor(m / 60)} س ${m % 60} د` : `${m} دقيقة`; };
