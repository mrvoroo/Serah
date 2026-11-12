// الاتصال بالخلفية (Google Apps Script). الطلب بصيغة نص عادي لتجنب طلب preflight.
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "https://script.google.com/macros/s/AKfycbz5QzGujgyndr_k1QpuFkPBQTjgA-KkxQoP9WOBV66-6pi5X-o4Q4JWLiJauDR2Xt39/exec";

export type Role = "student" | "teacher" | "admin" | "superadmin";
export type Gender = "m" | "f";
export type User = { user_id: string; name: string; role: Role; class_id: string; avatar: string; gender?: Gender };
export type Kid = { user_id: string; name: string; avatar: string; points?: number; gender?: Gender };
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
  // الخروج يمسح بيانات صاحب الحساب من الجهاز (سجل الصلوات، اختيار الفصل، نصوص الإشعارات باسمه)
  clear: () => {
    safeSet(TOKEN_KEY, null); safeSet(USER_KEY, null);
    try { Object.keys(localStorage).filter((k) => k.startsWith("serah_plog:") || k === "serah_class" || k === "serah_q_prefs_t").forEach((k) => localStorage.removeItem(k)); } catch { /* لا شيء */ }
    try { void caches.delete("serah-notify"); } catch { /* لا شيء */ }
  },
};

export class ApiError extends Error {
  auth: boolean;
  constructor(message: string, auth = false) { super(message); this.auth = auth; }
}

// الجلسة لم تعد صالحة (انتهت، أو الحساب أُوقف أو حُذف): نخرج فورًا لصفحة الدخول المناسبة مع السبب
const LOGOUT_REASON = "serah_logout_reason";
function endSession(reason: string) {
  if (typeof window === "undefined") return;
  const staff = session.user()?.role !== "student";
  session.clear();
  safeSet(LOGOUT_REASON, reason);
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${staff ? "/teacher/login/" : "/"}`);
}
// سبب آخر خروج إجباري: يُعرض في صفحة الدخول ويُمسح عند الدخول التالي
export const logoutReason = () => safeGet(LOGOUT_REASON) ?? "";
export const clearLogoutReason = () => safeSet(LOGOUT_REASON, null);

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
    const auth = /جلسة|مسجل|رمز غير صالح|الحساب موقوف/.test(msg);
    if (auth && session.token()) endSession(msg);
    throw new ApiError(msg, auth);
  }
  return j.data as T;
}

// روابط ملفات درايف
// الصوت: رابط Drive API (يدعم التشغيل الجزئي Range فيعمل على آيفون) لو مفتاحه متاح، وإلا رابط التنزيل المباشر
// (رابط التنزيل المباشر لا يعمل على سفاري آيفون). المفتاح من إعدادات الخلفية DRIVE_API_KEY ومقيّد بعنوان الموقع
const MEDIA_KEY = "serah_media_key";
export const mediaKey = () => safeGet(MEDIA_KEY) ?? "";
export const driveAudio = (id: string, key = mediaKey()) => key
  ? `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media&key=${encodeURIComponent(key)}`
  : `https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=download`;
export async function loadMediaConfig() {
  if (!session.token()) return;
  try {
    const c = await api<{ driveKey: string }>("config");
    if ((c.driveKey || "") !== mediaKey()) { safeSet(MEDIA_KEY, c.driveKey || null); window.dispatchEvent(new Event("serah-media")); }
  } catch { /* نكمل بالرابط المباشر */ }
}
export const driveImage = (id: string, w = 1200) => `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w${w}`;

export const withBase = (p: string) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${p}`;

export type Me = { points: number; attended: string[]; rank: number; total: number; gender?: Gender };
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

// ===== الاختبارات والواجبات =====
export type QuizStatus = "draft" | "published";
export type QuizMine = { score: number; total: number; stars: number } | null;
export type Quiz = { quiz_id: string; title: string; status: QuizStatus; prophet_id: string; lecture_id: string; created_at: string; count: number; results?: number; mine?: QuizMine };
// correct موجودة للمعلمة فقط (الطفل لا يستلم الإجابة قبل الحل)
export type Question = { question_id: string; text: string; options: string[]; image_file_id: string; correct?: number };
export type QuizFull = { quiz: Quiz; questions: Question[]; mine?: QuizMine };
export type QuizSubmit = { score: number; total: number; stars: number; first: boolean; best: QuizMine; review: { question_id: string; chosen: number; correct: number; ok: boolean }[] };
export type QuizResults = {
  quiz: Quiz; questions: Question[]; per: { right: number; answered: number }[];
  kids: { user_id: string; name: string; avatar: string; done: boolean; score?: number; total?: number; stars?: number; at?: string; answers?: number[] }[];
};
export type SubStatus = "" | "done" | "approved" | "returned";
export type Assignment = { assignment_id: string; title: string; details: string; due: string; prophet_id: string; lecture_id: string; created_at: string; status?: SubStatus; kids?: number; done?: number; approved?: number;
  can_manage?: boolean; helpers?: string[]; created_by?: string; created_by_name?: string };
export type Notice = { notice_id: string; text: string; at: string };
export type AssignmentStatus = { assignment: Assignment; kids: { user_id: string; name: string; avatar: string; status: SubStatus; at: string }[] };
