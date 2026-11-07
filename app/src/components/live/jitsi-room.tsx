"use client";
import { useEffect, useRef, useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { loadJitsi, type JitsiApi, type LiveRoom } from "@/lib/live";

// غرفة المحاضرة داخل المنصة (سيرفر Jitsi الخاص): بدون صفحة انتظار ولا طلب تنزيل تطبيق.
// الأطفال يدخلون والمايك والكاميرا مقفولين، وأزرارهم قليلة، والمعلمة تفعّل «إذن الكلام» فلا يتكلم طفل إلا بإذنها.
// زر الخروج الأحمر غير موجود عند المعلمة: الإنهاء من زر المنصة فقط (حتى لا تظن أنها أنهت وهي خرجت فقط)
const KID_TOOLS = ["microphone", "raisehand", "fullscreen", "hangup"];
const TEACHER_TOOLS = ["microphone", "camera", "desktop", "raisehand", "participants-pane", "mute-everyone", "tileview", "fullscreen"];

type Props = { room: LiveRoom; teacher: boolean; onJoined?: () => void; onLeft?: () => void; onMute?: (muted: boolean) => void; onApi?: (api: JitsiApi | null) => void };
export function JitsiRoom({ room, teacher, onJoined, onLeft, onMute, onApi }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const cb = useRef({ onJoined, onLeft, onMute, onApi });
  const [err, setErr] = useState("");
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => { cb.current = { onJoined, onLeft, onMute, onApi }; });

  useEffect(() => {
    let jitsi: JitsiApi | null = null, dead = false;
    // لو الغرفة ما فتحتش خلال ٢٥ ثانية (نت ضعيف أو توكن مرفوض) نعرض رسالة وزر إعادة
    const slow = setTimeout(() => { if (!dead) setErr("المحاضرة بتاخد وقت تفتح… اتأكدي من النت وجربي تاني"); }, 25000);
    loadJitsi(room.domain).then((Api) => {
      if (dead || !box.current) return;
      box.current.textContent = "";
      jitsi = new Api(room.domain, {
        roomName: room.room, jwt: room.jwt, parentNode: box.current, width: "100%", height: "100%", lang: "ar",
        configOverwrite: {
          prejoinConfig: { enabled: false }, prejoinPageEnabled: false, disableDeepLinking: true,
          startWithAudioMuted: !teacher, startWithVideoMuted: true, startAudioOnly: !teacher,
          toolbarButtons: teacher ? TEACHER_TOOLS : KID_TOOLS, disableInviteFunctions: true, hideConferenceSubject: false,
          subject: room.title, disableReactions: !teacher, disableSelfViewSettings: true, enableWelcomePage: false, enableClosePage: false,
          remoteVideoMenu: { disableKick: !teacher, disablePrivateChat: true }, disablePolls: true,
          ...(teacher ? {} : { notifications: [] }),
        },
        interfaceConfigOverwrite: { SHOW_JITSI_WATERMARK: false, SHOW_WATERMARK_FOR_GUESTS: false, MOBILE_APP_PROMO: false, SHOW_CHROME_EXTENSION_BANNER: false },
      });
      cb.current.onApi?.(jitsi);
      jitsi.addListener("videoConferenceJoined", () => {
        clearTimeout(slow); setErr(""); setReady(true);
        if (teacher) try { jitsi?.executeCommand("toggleModeration", true, "audio"); } catch { /* نسخة قديمة */ }
        cb.current.onJoined?.();
      });
      jitsi.addListener("audioMuteStatusChanged", (e) => cb.current.onMute?.(!!(e as { muted?: boolean })?.muted));
      jitsi.addListener("readyToClose", () => cb.current.onLeft?.());
    }).catch((e: Error) => { clearTimeout(slow); setErr(e.message); });
    return () => { dead = true; clearTimeout(slow); cb.current.onApi?.(null); jitsi?.dispose(); };
  }, [room.domain, room.room, room.jwt, room.title, teacher, attempt]);

  return (
    <div className="relative h-[70dvh] min-h-[420px] w-full overflow-hidden rounded-[24px] bg-[#111] shadow-soft">
      <div ref={box} className="absolute inset-0" data-testid="jitsi-box" />
      {!ready && !err && <div className="pointer-events-none absolute inset-0 grid place-items-center text-white/80"><span className="flex items-center gap-2"><Loader2 className="size-5 animate-spin" /> جارٍ فتح المحاضرة…</span></div>}
      {err && !ready && (
        <div className="absolute inset-0 grid place-items-center p-6 text-center text-white">
          <div className="flex flex-col items-center gap-3"><p className="leading-8">{err}</p>
            <button type="button" onClick={() => { setErr(""); setAttempt((a) => a + 1); }} className="flex h-12 items-center gap-2 rounded-2xl bg-white px-5 font-bold text-primary"><RotateCcw className="size-5" /> حاول تاني</button>
          </div>
        </div>
      )}
    </div>
  );
}
