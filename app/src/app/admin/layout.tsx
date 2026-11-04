import type { ReactNode } from "react";
import { TeacherShell } from "@/components/teacher/teacher-shell";

export const metadata = { title: "لوحة المطوّر | رحلة مع الأنبياء" };
export default function AdminLayout({ children }: { children: ReactNode }) { return <TeacherShell roles={["superadmin"]}>{children}</TeacherShell>; }
