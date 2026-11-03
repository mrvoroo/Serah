import type { ReactNode } from "react";
import { TeacherShell } from "@/components/teacher/teacher-shell";
export default function TeacherLayout({ children }: { children: ReactNode }) { return <TeacherShell>{children}</TeacherShell>; }
