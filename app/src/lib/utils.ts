export { cn } from "cn"

// «أ.» (أستاذة) قبل اسم المعلمة احترامًا، إلا إن كان الاسم يبدأ بلقب (أ. / د. / م.) أو كان الحساب للمطوّر
export function teacherTitle(name: string | undefined, role?: string) {
  const n = (name ?? "").trim();
  if (!n || role === "student" || /^(أ|د|م)\s*[./]/.test(n)) return n;
  // المطوّر «م.»، والمعلمات «أ.»
  return `${role === "superadmin" ? "م." : "أ."} ${n}`;
}

// عدد الأسئلة بالتمييز العربي الصحيح: سؤال واحد، سؤالان، ٣ أسئلة، ١١ سؤالًا
export function questionCount(n: number) {
  const ar = (v: number) => v.toLocaleString("ar-EG");
  if (n === 1) return "سؤال واحد";
  if (n === 2) return "سؤالان";
  if (n >= 3 && n <= 10) return `${ar(n)} أسئلة`;
  return `${ar(n)} سؤالًا`;
}
