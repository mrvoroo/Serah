"use client";
import { Loader2 } from "lucide-react";
import { useAudioSource } from "@/hooks/use-media-key";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// مشغّل صوت بسيط للقوائم (المحاضرات، صفحة النبي): لا يحمّل شيئًا قبل الضغط على تشغيل،
// ولو رابط درايف فشل يجهّز التسجيل من الخلفية ويكمل التشغيل
export function AudioPlayer({ id, className }: { id: string; className?: string }) {
  const a = useAudioSource(id);
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {a.loading ? (
        <div role="status" className="flex flex-col gap-2 rounded-2xl bg-secondary/60 p-3 text-sm font-bold">
          <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> جاري تجهيز التسجيل… {a.pct.toLocaleString("ar-EG")}٪</span>
          <Progress value={a.pct} />
        </div>
      ) : (
        <audio data-testid="audio" controls preload={a.ready ? "auto" : "none"} src={a.src} onError={a.onError} className="w-full" />
      )}
      {a.error && <p className="text-sm font-bold text-destructive">{a.error}</p>}
    </div>
  );
}
