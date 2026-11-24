"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { api, fmtDate, session, type Suggestion } from "@/lib/api";
import { invalidate, useApi } from "@/hooks/use-api";
import { Skeleton } from "@/components/ui/skeleton";
import { BlurFade } from "@/components/ui/blur-fade";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Icon3D } from "@/components/icon3d";
import { cn } from "@/lib/utils";

// الاقتراحات: الأدمن والمطوّر يرون كل الاقتراحات (من الأطفال والمعلمات)، والمعلمة ترى اقتراحات أطفال فصلها واقتراحاتها هي.
// والمعلمة والأدمن ترسلان اقتراحًا يصل للأدمن والمطوّر
const ROLE: Record<string, string> = { student: "طفل", teacher: "معلمة", admin: "أدمن", superadmin: "المطوّر" };

export default function SuggestionsPage() {
  const { data, loading, reload } = useApi<(Suggestion & { role?: string; mine?: boolean })[]>("suggestions");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const manager = ["admin", "superadmin"].includes(session.user()?.role ?? "");
  const send = async () => {
    setBusy(true);
    try { await api("suggest", { text }); toast.success("وصل اقتراحك للإدارة، جزاكِ الله خيرًا"); setText(""); invalidate("suggestions"); await reload(); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3"><Icon3D name="speech" size={48} float /><div><h1 className="font-heading text-2xl font-extrabold">الاقتراحات</h1><p className="text-sm text-muted-foreground">{manager ? "أفكار الأطفال والمعلمات" : "أفكار أطفال فصلكِ، واقتراحاتكِ للإدارة"}</p></div></div>
      <form onSubmit={(e) => { e.preventDefault(); if (text.trim() && !busy) void send(); }} className="flex flex-col gap-2 rounded-[24px] border bg-card p-4 shadow-soft">
        <label htmlFor="sg-text" className="font-bold">اقتراح جديد {manager ? "" : "(يصل للأدمن والمطوّر)"}</label>
        <Textarea id="sg-text" value={text} maxLength={1000} rows={3} onChange={(e) => setText(e.target.value)} placeholder="فكرة لتحسين المنصة أو المحتوى…" />
        <Button type="submit" variant="hero" size="lg2" className="self-start" disabled={!text.trim() || busy}>{busy ? <Loader2 className="animate-spin" /> : <Send />} إرسال</Button>
      </form>
      {loading && !data ? <Skeleton className="h-24 rounded-[24px]" /> : (
        <ul className="flex flex-col gap-3">
          {data?.map((s, i) => (
            <BlurFade key={s.id} delay={0.03 * Math.min(i, 10)}>
              <li data-testid="suggestion" className="rounded-[24px] border bg-card p-4 shadow-soft">
                <div className="mb-1 flex items-center justify-between gap-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2"><b className="text-foreground">{s.mine ? "أنا" : s.name || "بدون اسم"}</b>
                    {s.role && <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", s.role === "student" ? "bg-secondary" : "bg-primary/15 text-primary")}>{ROLE[s.role] ?? s.role}</span>}</span>
                  <span>{fmtDate(s.at)}</span>
                </div>
                <p className="whitespace-pre-wrap leading-relaxed">{s.text}</p>
              </li>
            </BlurFade>
          ))}
          {data?.length === 0 && <p className="rounded-[24px] border bg-card p-6 text-center text-muted-foreground">لا توجد اقتراحات بعد</p>}
        </ul>
      )}
    </div>
  );
}
