import { Suspense } from "react";
import { Certificates } from "@/components/eight/certificates";

export const metadata = { title: "شهادات أطفالي | المُنْتَهَى" };
export default function Page() { return <Suspense><Certificates parent /></Suspense>; }
