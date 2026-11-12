import { QuranReader } from "@/components/kid/quran-reader";

export const metadata = { title: "القرآن الكريم | المُنْتَهَى" };
// القرآن للمعلمات: قراءة واستماع بتلاوة الحصري أو المنشاوي المرتّلة (ليس المصحف المعلّم)
export default function Page() { return <QuranReader staff />; }
