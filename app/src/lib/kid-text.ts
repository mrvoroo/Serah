import { session } from "@/lib/api";

// مخاطبة الطفل حسب جنسه: المعلمة تحدد «ولد/بنت» في صفحة الطلاب، والبنت تخاطبها المنصة بصيغة المؤنث
export const isGirl = () => session.user()?.gender === "f";
export const g = (boy: string, girl: string) => (isGirl() ? girl : boy);
