import type { ReactNode } from "react";
import { KidShell } from "@/components/kid/kid-shell";
import { Ambient } from "@/components/ambient";

export default function KidLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Ambient />
      <KidShell>{children}</KidShell>
    </>
  );
}
