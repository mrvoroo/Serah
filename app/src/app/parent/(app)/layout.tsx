import type { ReactNode } from "react";
import { ParentShell } from "@/components/parent/parent-shell";
import { Ambient } from "@/components/ambient";

export default function ParentLayout({ children }: { children: ReactNode }) {
  return (<><Ambient /><ParentShell>{children}</ParentShell></>);
}
