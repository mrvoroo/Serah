"use client";
import { motion } from "motion/react";
import { useMotionAllowed } from "@/lib/tier";
import { cn } from "@/lib/utils";
import type { Mood } from "@/components/zaid";

// الأب والأم: شخصيتا شاشات أولياء الأمور، بنفس أسماء مشاعر زيد وحبيبة والمرشدة حتى يُبدَّل بينها مباشرة.
// رسم رمزي بسيط (لا صور حقيقية): الأم بحجاب وعباءة، والأب بطاقية بيضاء ولحية قصيرة وثوب.
// helping يرحّب، happy/cheer/play مسرور، thinking يتأمل ويده عند ذقنه، surprised مندهش بهدوء
type Look = "welcome" | "pleased" | "thinking" | "concerned";
const LOOK: Record<Mood, Look> = { helping: "welcome", happy: "pleased", cheer: "pleased", play: "pleased", thinking: "thinking", surprised: "concerned" };
const INK = "#2A1E3F", SKIN = "#F1C29C", CHEEK = "#E8838F";

type Palette = { robe: string; cover: string; shade: string };
const MOTHER: Palette = { robe: "#1E6F66", cover: "#3FB5A3", shade: "#2A8E80" };
const FATHER: Palette = { robe: "#F4F1EA", cover: "#FFFFFF", shade: "#D9D2C3" };

function Arm({ d, color }: { d: string; color: string }) {
  return (<>
    <path d={d} fill="none" stroke={INK} strokeWidth="22" strokeLinecap="round" />
    <path d={d} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round" />
  </>);
}
const Hand = ({ x, y }: { x: number; y: number }) => <ellipse cx={x} cy={y} rx="10" ry="9" fill={SKIN} stroke={INK} strokeWidth="3.5" />;

// ملامح الوجه المشتركة (الحاجبان والعينان والفم) حسب الشعور
function Face({ look, animate, beard }: { look: Look; animate: boolean; beard?: boolean }) {
  return (<>
    <ellipse cx="73" cy="126" rx="7" ry="5" fill={CHEEK} opacity="0.28" />
    <ellipse cx="127" cy="126" rx="7" ry="5" fill={CHEEK} opacity="0.28" />
    <path d="M98 117 Q100 124 104 121" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
    <g fill="none" stroke={INK} strokeWidth={beard ? 4 : 3} strokeLinecap="round">
      {look === "welcome" && <><path d="M74 93 Q84 89 93 92" /><path d="M107 92 Q116 89 126 93" /></>}
      {look === "pleased" && <><path d="M74 92 Q84 88 93 91" /><path d="M107 91 Q116 88 126 92" /></>}
      {look === "thinking" && <><path d="M74 94 Q84 92 93 93" /><path d="M107 89 Q117 84 126 88" /></>}
      {look === "concerned" && <><path d="M74 90 Q83 86 93 85" /><path d="M107 85 Q117 86 126 90" /></>}
    </g>
    <motion.g style={{ transformOrigin: "100px 105px", transformBox: "view-box" }} animate={animate ? { scaleY: [1, 1, 0.1, 1, 1] } : undefined} transition={{ duration: 5.4, times: [0, 0.9, 0.93, 0.96, 1], repeat: Infinity }}>
      {look === "pleased" ? (
        <g fill="none" stroke={INK} strokeWidth="3.2" strokeLinecap="round"><path d="M77 107 Q84 100 91 107" /><path d="M109 107 Q116 100 123 107" /></g>
      ) : (
        <g>
          {look === "concerned" && <><ellipse cx="84" cy="106" rx="7" ry="7.5" fill="#FFFFFF" /><ellipse cx="116" cy="106" rx="7" ry="7.5" fill="#FFFFFF" /></>}
          <ellipse cx={look === "thinking" ? 87 : 84} cy={look === "thinking" ? 104 : 107} rx="4.4" ry="5" fill={INK} />
          <ellipse cx={look === "thinking" ? 119 : 116} cy={look === "thinking" ? 104 : 107} rx="4.4" ry="5" fill={INK} />
          <circle cx={look === "thinking" ? 88.5 : 85.5} cy={look === "thinking" ? 102.5 : 105.5} r="1.5" fill="#FFFFFF" />
          <circle cx={look === "thinking" ? 120.5 : 117.5} cy={look === "thinking" ? 102.5 : 105.5} r="1.5" fill="#FFFFFF" />
          {!beard && <g fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round"><path d="M77 103 L74 100 M123 103 L126 100" /></g>}
        </g>
      )}
    </motion.g>
    {look === "welcome" && <path d="M90 135 Q100 142 110 135" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />}
    {look === "pleased" && <path d="M88 133 Q100 147 112 133 Q100 138 88 133 Z" fill="#B5475E" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />}
    {look === "thinking" && <path d="M93 138 Q101 135 108 137" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />}
    {look === "concerned" && <ellipse cx="100" cy="139" rx="4" ry="5" fill="#8A2E44" stroke={INK} strokeWidth="2.2" />}
  </>);
}

function Hands({ look, color }: { look: Look; color: string }) {
  if (look === "welcome") return (<g><Arm d="M62 202 Q52 220 56 238" color={color} /><Arm d="M138 202 Q160 186 156 160" color={color} /><Hand x={155} y={156} /></g>);
  if (look === "pleased") return (<g><Arm d="M62 202 Q62 222 90 222" color={color} /><Arm d="M138 202 Q138 222 110 222" color={color} /><Hand x={93} y={221} /><Hand x={107} y={221} /></g>);
  if (look === "thinking") return (<g><Arm d="M62 202 Q52 220 56 238" color={color} /><Arm d="M140 202 Q150 180 124 166" color={color} /><Hand x={119} y={164} /></g>);
  return (<g><Arm d="M138 202 Q148 220 144 238" color={color} /><Arm d="M62 202 Q48 178 70 160" color={color} /><Hand x={73} y={156} /></g>);
}

type Props = { mood?: Mood; size?: number; className?: string; float?: boolean };
function Frame({ look, size, className, float, label, children }: { look: Look; size: number; className?: string; float: boolean; label: string; children: React.ReactNode }) {
  const animate = useMotionAllowed();
  return (
    <motion.svg key={look} width={size} height={size * 1.2} viewBox="0 0 200 240" role="img" aria-label={label} className={cn("shrink-0 select-none", className)}
      initial={animate ? { scale: 0.92, opacity: 0 } : false}
      animate={animate ? { scale: 1, opacity: 1, y: float ? [0, -4, 0] : 0, rotate: look === "thinking" ? -2 : 0 } : { scale: 1, opacity: 1, y: 0, rotate: 0 }}
      transition={animate ? { scale: { type: "spring", stiffness: 200, damping: 20 }, opacity: { duration: 0.25 }, rotate: { duration: 0.5 }, y: { duration: 4.2, repeat: Infinity, ease: "easeInOut" } } : undefined}>
      {children}
    </motion.svg>
  );
}
const WORD: Record<Look, [string, string]> = { welcome: ["يرحّب", "ترحّب"], pleased: ["مسرور", "مسرورة"], thinking: ["يتأمل", "تتأمل"], concerned: ["مندهش", "مندهشة"] };

export function Mother({ mood = "helping", size = 150, className, float = true }: Props) {
  const animate = useMotionAllowed(), look = LOOK[mood], c = MOTHER;
  return (
    <Frame look={look} size={size} className={className} float={float} label={`الأم ${WORD[look][1]}`}>
      <path d="M42 240 C42 204 66 180 100 180 C134 180 158 204 158 240 Z" fill={c.robe} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d="M36 206 C30 150 44 50 100 44 C156 50 170 150 164 206 Q100 226 36 206 Z" fill={c.cover} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d="M58 168 Q70 190 64 206 M142 168 Q130 190 136 206" fill="none" stroke={c.shade} strokeWidth="3" strokeLinecap="round" opacity="0.8" />
      <ellipse cx="100" cy="107" rx="46" ry="54" fill={c.shade} />
      <ellipse cx="100" cy="110" rx="40" ry="47" fill={SKIN} stroke={INK} strokeWidth="3.5" />
      <path d="M66 80 Q100 62 134 80" fill="none" stroke={c.shade} strokeWidth="6" strokeLinecap="round" />
      <Face look={look} animate={animate} />
      {/* زهرة صغيرة على الحجاب */}
      <g transform="translate(140 158)"><circle r="6" fill="#FFD25A" stroke={INK} strokeWidth="2.5" /><circle r="2.2" fill="#E07A00" /></g>
      <Hands look={look} color={c.robe} />
    </Frame>
  );
}

export function Father({ mood = "helping", size = 150, className, float = true }: Props) {
  const animate = useMotionAllowed(), look = LOOK[mood], c = FATHER;
  return (
    <Frame look={look} size={size} className={className} float={float} label={`الأب ${WORD[look][0]}`}>
      {/* الثوب بياقة */}
      <path d="M40 240 C40 202 66 180 100 180 C134 180 160 202 160 240 Z" fill={c.robe} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d="M100 182 L100 222" stroke={c.shade} strokeWidth="3" strokeLinecap="round" />
      <circle cx="100" cy="196" r="2.6" fill={INK} /><circle cx="100" cy="208" r="2.6" fill={INK} />
      {/* الرقبة والأذنان */}
      <rect x="86" y="150" width="28" height="34" rx="10" fill={SKIN} stroke={INK} strokeWidth="3.5" />
      <ellipse cx="58" cy="112" rx="8" ry="12" fill={SKIN} stroke={INK} strokeWidth="3.5" />
      <ellipse cx="142" cy="112" rx="8" ry="12" fill={SKIN} stroke={INK} strokeWidth="3.5" />
      <ellipse cx="100" cy="110" rx="42" ry="48" fill={SKIN} stroke={INK} strokeWidth="3.5" />
      {/* لحية قصيرة مرتبة وشارب خفيف */}
      <path d="M60 112 C60 150 78 168 100 168 C122 168 140 150 140 112 C134 138 120 150 100 150 C80 150 66 138 60 112 Z" fill="#3B2A22" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M86 128 Q100 122 114 128" fill="none" stroke="#3B2A22" strokeWidth="5" strokeLinecap="round" />
      {/* طاقية بيضاء */}
      <path d="M56 92 C56 56 76 44 100 44 C124 44 144 56 144 92 Z" fill={c.cover} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d="M62 80 Q100 70 138 80" fill="none" stroke={c.shade} strokeWidth="3" strokeDasharray="4 5" />
      <Face look={look} animate={animate} beard />
      <Hands look={look} color={c.robe} />
    </Frame>
  );
}
