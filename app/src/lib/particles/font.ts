// خط الرقعة لأسماء الأنبياء والكلمات في المجسم: ننتظر تحميله (حتى ٣ ثوانٍ) قبل رسم النص بالنقاط
export async function ruqaaFont() {
  const fam = getComputedStyle(document.documentElement).getPropertyValue("--font-ruqaa").trim() || "serif";
  try {
    await Promise.race([document.fonts.load(`700 150px ${fam}`, "سيدنا محمد ﷺ"), new Promise((r) => setTimeout(r, 3000))]);
  } catch { /* نكمل بالخط الاحتياطي */ }
  return fam;
}
