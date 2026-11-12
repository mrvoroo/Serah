// نغمات الإشعارات: كل نوع إشعار له ملف صوت في public/sounds/ (اسم الملف هنا)
// لإضافة النغمات: ضع الملفات بنفس الأسماء (mp3) ثم غيّر READY إلى true — بدون أي تعديل آخر.
//
// مهم: المتصفحات (آيفون وأندرويد) لا تسمح لإشعار الويب بنغمة خاصة وهو مقفول؛ يظهر بصوت الجهاز الافتراضي.
// النغمة الخاصة تُسمع لما يكون التطبيق مفتوحًا أو في الخلفية القريبة: عامل الخدمة يبلغ الصفحة فتشغّل النغمة.
export const SOUND_FILES = {
  pre: "pre-prayer.mp3", // قبل الصلاة بـ١٠ دقائق
  adhan: "adhan.mp3", // عند الأذان
  ask: "did-you-pray.mp3", // «صلّيت الظهر؟» بعد الأذان بنصف ساعة
  dhikr: "dhikr.mp3", // تذكير بذكر
  duha: "duha.mp3", // الضحى
  friday: "friday.mp3", // الجمعة
  task: "task.mp3", // اختبار أو واجب جديد
  review: "review.mp3", // ذكر ينتظر المراجعة (للأدمن)
  newkid: "new-student.mp3", // طالب جديد في الفصل (للمعلمة)
} as const;
export type SoundKey = keyof typeof SOUND_FILES;
export const SOUNDS_READY = false;

// نوع الإشعار القادم من الخادم أو الجدول → أي نغمة
export function soundFor(kind: string): SoundKey {
  if (kind.startsWith("pre:")) return "pre";
  if (kind.startsWith("p:")) return "adhan";
  if (kind.startsWith("ask:")) return "ask";
  if (kind === "duha") return "duha";
  if (kind === "fri") return "friday";
  if (kind === "quiz" || kind === "hw") return "task";
  if (kind === "review") return "review";
  if (kind === "newkid") return "newkid";
  return "dhikr";
}

const PREF = "serah_notify_sound";
export const soundsOn = () => { try { return localStorage.getItem(PREF) !== "off"; } catch { return true; } };
export const setSoundsOn = (on: boolean) => { try { localStorage.setItem(PREF, on ? "on" : "off"); } catch { /* لا شيء */ } };

let last = 0;
export function playNotifySound(kind: string) {
  if (!SOUNDS_READY || !soundsOn() || Date.now() - last < 1500) return;
  last = Date.now();
  try {
    const a = new Audio(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/sounds/${SOUND_FILES[soundFor(kind)]}`);
    a.volume = 0.9;
    void a.play().catch(() => { /* المتصفح منع التشغيل التلقائي قبل أي لمسة */ });
  } catch { /* لا شيء */ }
}

// يستقبل رسالة عامل الخدمة عند وصول إشعار والتطبيق مفتوح
export function listenForNotifySounds() {
  const sw = typeof navigator === "undefined" ? undefined : navigator.serviceWorker;
  if (!sw || typeof sw.addEventListener !== "function") return () => {};
  const on = (e: MessageEvent) => { if (e.data?.type === "notify-sound" && typeof e.data.kind === "string") playNotifySound(e.data.kind); };
  try { sw.addEventListener("message", on); } catch { return () => {}; }
  return () => { try { sw.removeEventListener("message", on); } catch { /* لا شيء */ } };
}
