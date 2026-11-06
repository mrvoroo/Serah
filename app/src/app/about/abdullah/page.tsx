"use client";
import { ProfilePage, Float3DText } from "@/components/about/profile-page";

// الصفحة الشخصية: عبد الله
export default function AbdullahPage() {
  return (
    <ProfilePage photo="/about/abdullah.jpg" photoPosition="center 20%" name="عبد الله" line="طالب أمن سيبراني · مبرمج"
      skills={["الأمن السيبراني", "برمجة", "الذكاء الاصطناعي", "Cyber Security"]} floaters={["key", "gem", "sparkles"]}
      closing={<Float3DText emoji="🤲" sub="ربنا يوفّقه وينفع بيه 🌙">ادعوله بالتوفيق</Float3DText>}>
      <p>السلام عليكم ورحمة الله وبركاته 👋</p>
      <p className="mt-3"><b>عبد الله</b> بيدرس دلوقتي <b>الأمن السيبراني</b> (<span dir="ltr">Cyber Security</span>) — يعني إزاي نحمي البرامج والمواقع وبيانات الناس من أي حد يحاول يخترقها. وكمان قوي جدًا في <b>البرمجة</b> و<b>الذكاء الاصطناعي</b>.</p>
      <p className="mt-3">عبد الله وأحمد صحاب، ولما شافوا قد إيه في احتياج لنظام سهل يدير المحاضرات والمحتوى الديني، دمجوا شغلهم مع بعض عشان يطلّعوا «<span className="font-ruqaa text-[1.15em] text-[#FFC24D]">المنتهى</span>» بشكل احترافي وآمن.</p>
      <p className="mt-3">ودوره إن المنصة تكون قوية وآمنة، وإن بيانات الأطفال والمعلمات تفضل محمية ومتطمّنين عليها ❤️</p>
    </ProfilePage>
  );
}
