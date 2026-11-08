import { api, API_URL, session } from "@/lib/api";
import { teacherTitle } from "@/lib/utils";
import salah from "@/content/salah.json";
import { buildPlan, loadPlace, loadPrefs, PRAYER_NAMES, type NotifyPrefs } from "@/lib/prayer";

// إشعارات الجوال (Web Push): الخادم يرسل إشعارًا بلا محتوى، وعامل الخدمة يسحب نوعه بمفتاح الجهاز
const SYNC_KEY = "serah_push_sync";
const NOTIFY = "serah-notify";
// مفاتيح التخزين لازم تكون عناوين كاملة ثابتة: الاسم القصير ("texts") يتحسب نسبةً لصفحة التطبيق المفتوحة
// (/Serah/kid/prayer/texts) بينما عامل الخدمة يدور عليه في /Serah/texts، فما كانش بيلاقي النصوص ولا المفتاح ولا الجدول
const NOTIFY_KEYS = ["plan", "texts", "cfg"] as const;
const notifyUrl = (k: string) => `${location.origin}${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/__notify/${k}`;

export type PushState = "unsupported" | "ios-install" | "denied" | "off" | "on";

const isIOS = () => typeof navigator !== "undefined" && /iPhone|iPad|iPod/.test(navigator.userAgent);
const standalone = () => typeof window !== "undefined" && (window.matchMedia?.("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true);

export async function pushState(): Promise<PushState> {
  if (typeof window === "undefined") return "unsupported";
  // على آيفون الإشعارات تعمل فقط بعد «إضافة إلى الشاشة الرئيسية» (iOS 16.4+)
  if (isIOS() && !standalone()) return "ios-install";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    return sub && Notification.permission === "granted" ? "on" : "off";
  } catch { return "off"; }
}

function b64ToBytes(s: string) {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

// نصوص التذكير المراجَعة تُحفظ لعامل الخدمة (تتحدث مع كل فتح للتطبيق)
async function saveForWorker(key?: string, plan?: unknown[]) {
  const c = await caches.open(NOTIFY);
  // نشيل النسخ القديمة المحفوظة بعناوين نسبية غلط
  for (const req of await c.keys()) {
    const p = new URL(req.url).pathname;
    if (!p.includes("/__notify/") && NOTIFY_KEYS.some((k) => p.endsWith("/" + k))) await c.delete(req);
  }
  if (plan) await c.put(notifyUrl("plan"), new Response(JSON.stringify(plan)));
  // اسم صاحب الجهاز ودوره (يبقى على الجهاز فقط): الطفل باسمه الأول بصيغة تحمّسه، والمعلمة بلقبها بصيغة فيها وقار
  const u = session.user(), staff = !!u && u.role !== "student", first = (u?.name ?? "").trim().split(/\s+/)[0] ?? "";
  const who = { name: staff ? teacherTitle(first, u?.role) : first, staff, mosque: staff ? u?.role === "superadmin" : u?.gender !== "f" };
  await c.put(notifyUrl("texts"), new Response(JSON.stringify({ reminders: salah.reminders, names: PRAYER_NAMES, who })));
  if (key) await c.put(notifyUrl("cfg"), new Response(JSON.stringify({ api: API_URL, key })));
}

async function send(sub: PushSubscription, prefs: NotifyPrefs, girl: boolean) {
  const plan = buildPlan(loadPlace(), prefs, girl);
  const r = await api<{ key: string }>("pushSubscribe", { endpoint: sub.endpoint, plan, prefs: { tasks: prefs.tasks } });
  await saveForWorker(r.key, plan);
  try { localStorage.setItem(SYNC_KEY, String(Date.now())); } catch { /* لا شيء */ }
}

export async function enablePush(girl: boolean): Promise<PushState> {
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return perm === "denied" ? "denied" : "off";
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const { publicKey } = await api<{ publicKey: string }>("pushConfig");
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(publicKey) });
  }
  await send(sub, loadPrefs(), girl);
  return "on";
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  try { await api("pushUnsubscribe", { endpoint: sub.endpoint }); } catch { /* نلغي محليًا على أي حال */ }
  await sub.unsubscribe();
  try { localStorage.removeItem(SYNC_KEY); } catch { /* لا شيء */ }
}

// يحدّث جدول المواعيد (١٤ يومًا) عند فتح التطبيق: مرة كل ١٢ ساعة، أو فورًا عند تغيير التفضيلات أو الموقع
export async function syncPush(girl: boolean, force = false) {
  try {
    if ((await pushState()) !== "on") return;
    const last = Number(localStorage.getItem(SYNC_KEY) || 0);
    if (!force && Date.now() - last < 12 * 3600e3) { await saveForWorker(); return; }
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) await send(sub, loadPrefs(), girl);
  } catch { /* المحاولة القادمة عند الفتح التالي */ }
}
