"use client";
import { motion } from "motion/react";
import { useMotionAllowed } from "@/lib/tier";
import { cn } from "@/lib/utils";
import type { Mood } from "@/components/zaid";

// المرشدة: شخصية شاشات المعلمات — سيدة محجبة بعباءة ونظارة رقيقة، بتعابير هادئة ووقورة تناسب المعلمات والأستاذات.
// تأخذ نفس أسماء مشاعر زيد حتى تُستبدل به مباشرة، وكل شعور يُرسم بطريقة أنضج:
// helping ترحّب ويدها على قلبها، happy مسرورة بابتسامة هادئة ويداها متشابكتان، thinking تتأمل ويدها عند ذقنها،
// surprised مندهشة بهدوء (حاجبان مرفوعان قليلًا ويد عند الخد)
type Look = "welcome" | "pleased" | "thinking" | "concerned";
const LOOK: Record<Mood, Look> = { helping: "welcome", happy: "pleased", cheer: "pleased", play: "pleased", thinking: "thinking", surprised: "concerned" };
const LABEL: Record<Look, string> = { welcome: "المرشدة ترحّب بكِ", pleased: "المرشدة مسرورة", thinking: "المرشدة تتأمل", concerned: "المرشدة مندهشة" };

const INK = "#2A1E3F", SKIN = "#F3C6A2", ABAYA = "#3F2F96", HIJAB = "#7C6BE8", HIJAB_SHADE = "#5B49C9", GOLD = "#E3A93B";

function Arm({ d }: { d: string }) {
  return (<>
    <path d={d} fill="none" stroke={INK} strokeWidth="22" strokeLinecap="round" />
    <path d={d} fill="none" stroke={ABAYA} strokeWidth="14" strokeLinecap="round" />
  </>);
}
const Hand = ({ x, y }: { x: number; y: number }) => <ellipse cx={x} cy={y} rx="10" ry="9" fill={SKIN} stroke={INK} strokeWidth="3.5" />;

export function Murshida({ mood = "helping", size = 160, className, float = true }: { mood?: Mood; size?: number; className?: string; float?: boolean }) {
  const animate = useMotionAllowed();
  const look = LOOK[mood];
  return (
    <motion.svg
      key={look}
      width={size}
      height={size * 1.2}
      viewBox="0 0 200 240"
      role="img"
      aria-label={LABEL[look]}
      className={cn("shrink-0 select-none", className)}
      initial={animate ? { scale: 0.92, opacity: 0 } : false}
      // بدون حركة: نثبتها ظاهرة (وإلا تبقى شفافة لو أُلغيت الحركة بعد أول رسم)
      animate={animate ? { scale: 1, opacity: 1, y: float ? [0, -4, 0] : 0, rotate: look === "thinking" ? -2 : 0 } : { scale: 1, opacity: 1, y: 0, rotate: 0 }}
      transition={animate ? { scale: { type: "spring", stiffness: 200, damping: 20 }, opacity: { duration: 0.25 }, rotate: { duration: 0.5 }, y: { duration: 4, repeat: Infinity, ease: "easeInOut" } } : undefined}
    >
      {/* العباءة */}
      <path d="M42 240 C42 204 66 180 100 180 C134 180 158 204 158 240 Z" fill={ABAYA} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      {/* الحجاب: يحيط بالوجه وينسدل على الصدر */}
      <path d="M36 206 C30 150 44 50 100 44 C156 50 170 150 164 206 Q100 226 36 206 Z" fill={HIJAB} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d="M58 168 Q70 190 64 206 M142 168 Q130 190 136 206" fill="none" stroke={HIJAB_SHADE} strokeWidth="3" strokeLinecap="round" opacity="0.8" />
      <ellipse cx="100" cy="107" rx="46" ry="54" fill={HIJAB_SHADE} />
      {/* الوجه */}
      <ellipse cx="100" cy="110" rx="40" ry="47" fill={SKIN} stroke={INK} strokeWidth="3.5" />
      <path d="M66 80 Q100 62 134 80" fill="none" stroke={HIJAB_SHADE} strokeWidth="6" strokeLinecap="round" />
      <ellipse cx="73" cy="126" rx="7" ry="5" fill="#E8838F" opacity="0.28" />
      <ellipse cx="127" cy="126" rx="7" ry="5" fill="#E8838F" opacity="0.28" />
      <path d="M98 117 Q100 124 104 121" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />

      {/* الحاجبان */}
      <g fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round">
        {look === "welcome" && <><path d="M74 93 Q84 89 93 92" /><path d="M107 92 Q116 89 126 93" /></>}
        {look === "pleased" && <><path d="M74 92 Q84 88 93 91" /><path d="M107 91 Q116 88 126 92" /></>}
        {look === "thinking" && <><path d="M74 94 Q84 92 93 93" /><path d="M107 89 Q117 84 126 88" /></>}
        {look === "concerned" && <><path d="M74 90 Q83 86 93 85" /><path d="M107 85 Q117 86 126 90" /></>}
      </g>

      {/* العينان (ترمش) */}
      <motion.g style={{ transformOrigin: "100px 105px", transformBox: "view-box" }} animate={animate ? { scaleY: [1, 1, 0.1, 1, 1] } : undefined} transition={{ duration: 5, times: [0, 0.9, 0.93, 0.96, 1], repeat: Infinity }}>
        {look === "pleased" ? (
          <g fill="none" stroke={INK} strokeWidth="3.2" strokeLinecap="round"><path d="M77 107 Q84 100 91 107" /><path d="M109 107 Q116 100 123 107" /></g>
        ) : (
          <g>
            {look === "concerned" && <><ellipse cx="84" cy="106" rx="7" ry="7.5" fill="#FFFFFF" /><ellipse cx="116" cy="106" rx="7" ry="7.5" fill="#FFFFFF" /></>}
            <ellipse cx={look === "thinking" ? 87 : 84} cy={look === "thinking" ? 104 : 107} rx="4.2" ry="4.8" fill={INK} />
            <ellipse cx={look === "thinking" ? 119 : 116} cy={look === "thinking" ? 104 : 107} rx="4.2" ry="4.8" fill={INK} />
            <circle cx={look === "thinking" ? 88.5 : 85.5} cy={look === "thinking" ? 102.5 : 105.5} r="1.4" fill="#FFFFFF" />
            <circle cx={look === "thinking" ? 120.5 : 117.5} cy={look === "thinking" ? 102.5 : 105.5} r="1.4" fill="#FFFFFF" />
            <g fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round">
              <path d="M77 104 Q84 98 91 103" /><path d="M109 103 Q116 98 123 104" />
              <path d="M77 104 L74 101 M123 104 L126 101" />
            </g>
            {look === "welcome" && <g fill="none" stroke={INK} strokeWidth="1.8" strokeLinecap="round" opacity="0.6"><path d="M79 112 Q84 114 89 112" /><path d="M111 112 Q116 114 121 112" /></g>}
          </g>
        )}
      </motion.g>

      {/* نظارة رقيقة بإطار ذهبي */}
      <g fill="none" stroke={GOLD} strokeWidth="2.2">
        <circle cx="84" cy="106" r="11.5" /><circle cx="116" cy="106" r="11.5" />
        <path d="M95.5 105 Q100 102 104.5 105" /><path d="M72.5 104 L62 100 M127.5 104 L138 100" />
      </g>

      {/* الفم */}
      {look === "welcome" && <path d="M90 135 Q100 142 110 135" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />}
      {look === "pleased" && <path d="M89 133 Q100 146 111 133 Q100 138 89 133 Z" fill="#B5475E" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />}
      {look === "thinking" && <path d="M93 138 Q101 135 108 137" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />}
      {look === "concerned" && <ellipse cx="100" cy="139" rx="4" ry="5" fill="#8A2E44" stroke={INK} strokeWidth="2.2" />}

      {/* دبوس الحجاب */}
      <circle cx="140" cy="158" r="5" fill={GOLD} stroke={INK} strokeWidth="2.5" />

      {/* اليدان */}
      {look === "welcome" && (<g>
        <Arm d="M62 202 Q52 220 56 238" />
        <Arm d="M140 202 Q130 218 110 208" />
        <Hand x={106} y={206} />
      </g>)}
      {look === "pleased" && (<g>
        <Arm d="M62 202 Q62 222 90 222" />
        <Arm d="M138 202 Q138 222 110 222" />
        <Hand x={93} y={221} /><Hand x={107} y={221} />
      </g>)}
      {look === "thinking" && (<g>
        <Arm d="M62 202 Q52 220 56 238" />
        <Arm d="M140 202 Q150 180 124 166" />
        <Hand x={119} y={162} />
      </g>)}
      {look === "concerned" && (<g>
        <Arm d="M138 202 Q148 220 144 238" />
        <Arm d="M62 202 Q48 178 70 160" />
        <Hand x={73} y={156} />
      </g>)}
    </motion.svg>
  );
}
