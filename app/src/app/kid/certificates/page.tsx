import { Suspense } from "react";
import { Certificates } from "@/components/eight/certificates";

export const metadata = { title: "شهاداتي | المُنْتَهَى" };
export default function Page() { return <Suspense><Certificates /></Suspense>; }
