import { QuranReader } from "@/components/kid/quran-reader";

export const metadata = { title: "القرآن الكريم | المُنْتَهَى" };
// القرآن لولي الأمر: قراءة واستماع مرتّل (مثل المعلمات، ليس المصحف المعلّم)
export default function Page() { return <QuranReader staff />; }
