export { cn } from "cn"

// «أ.» (أستاذة) قبل اسم المعلمة احترامًا، إلا إن كان الاسم يبدأ بلقب (أ. / د. / م.) أو كان الحساب للمطوّر
export function teacherTitle(name: string | undefined, role?: string) {
  const n = (name ?? "").trim();
  if (!n || role === "superadmin" || role === "student" || /^(أ|د|م)\s*[./]/.test(n)) return n;
  return `أ. ${n}`;
}
