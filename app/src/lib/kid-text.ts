import { session } from "@/lib/api";

// مخاطبة الطفل حسب جنسه: المعلمة تحدد «ولد/بنت» في صفحة الطلاب، والبنت تخاطبها المنصة بصيغة المؤنث
export const isGirl = () => { const u = session.user(); return u?.gender === "f" || u?.role === "teacher" || u?.role === "admin"; };
export const g = (boy: string, girl: string) => (isGirl() ? girl : boy);
