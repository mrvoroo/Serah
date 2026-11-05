"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Icon3D } from "@/components/icon3d";
import { g } from "@/lib/kid-text";

export function SuggestDialog({ trigger }: { trigger: React.ReactElement }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try { await api("suggest", { text }); toast.success("وصل اقتراحك، شكرًا لك!"); setText(""); setOpen(false); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="rounded-[28px] sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <Icon3D name="speech" size={64} float />
          <DialogTitle className="font-heading text-2xl">صندوق الاقتراحات</DialogTitle>
          <DialogDescription>{g("عندك فكرة حلوة؟ اكتبها هنا وهتوصل للمعلمة", "عندك فكرة حلوة؟ اكتبيها هنا وهتوصل للمعلمة")}</DialogDescription>
        </DialogHeader>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} rows={4} placeholder={g("اكتب اقتراحك...", "اكتبي اقتراحك...")} className="rounded-2xl text-base" />
        <Button variant="gold" size="xl" onClick={send} disabled={busy || !text.trim()}>
          {busy ? <Loader2 className="animate-spin" /> : <>إرسال <Send /></>}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
