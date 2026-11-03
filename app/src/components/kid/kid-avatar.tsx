import { Icon3D, type Icon3DName } from "@/components/icon3d";
import { cn } from "@/lib/utils";

// أشكال الأطفال: أيقونات ثلاثية الأبعاد (تُخزَّن كـ 3d:اسم). القديمة (إيموجي) تظهر كما هي.
export const AVATARS: Icon3DName[] = ["star", "moon", "rocket", "gem", "crown", "sun", "sparkles", "bulb", "gift", "cap", "books", "trophy"];

export function KidAvatar({ value, size = 48, className }: { value?: string; size?: number; className?: string }) {
  if (value?.startsWith("3d:")) return <Icon3D name={value.slice(3) as Icon3DName} size={size} className={className} />;
  return (
    <span aria-hidden="true" className={cn("grid place-items-center leading-none", className)} style={{ width: size, height: size, fontSize: size * 0.78 }}>
      {value || "⭐"}
    </span>
  );
}
