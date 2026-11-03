"use client";
import { motion } from "motion/react";
import { useMotionAllowed } from "@/lib/tier";
import { cn } from "@/lib/utils";

// زيد: الشخصية المرافقة. كل إحساس = مجموعة أجزاء (عيون، حواجب، فم، ذراعين)
export type Mood = "happy" | "surprised" | "thinking" | "helping" | "play" | "cheer";
const PARTS: Record<Mood, string[]> = {
  happy: ["eyesClosed", "browsNormal", "mouthLaugh", "armsDown"],
  surprised: ["eyesBig", "browsUp", "mouthO", "armsBack"],
  thinking: ["eyesUp", "browsThink", "mouthSide", "armsChin"],
  helping: ["eyesWink", "browsNormal", "mouthSmile", "armsPoint"],
  play: ["eyesStar", "browsNormal", "mouthLaugh", "armsBall"],
  cheer: ["eyesOpen", "browsNormal", "mouthSmile", "armsUp"],
};
const LABEL: Record<Mood, string> = { happy: "زيد فرحان", surprised: "زيد مستغرب", thinking: "زيد بيفكر", helping: "زيد بيسلّم", play: "زيد عايز يلعب", cheer: "زيد بيشجع" };

export function Zaid({ mood = "happy", size = 160, className, float = true }: { mood?: Mood; size?: number; className?: string; float?: boolean }) {
  const animate = useMotionAllowed();
  const on = new Set(PARTS[mood]);
  return (
    <motion.svg
      key={mood}
      width={size}
      height={size * 1.2}
      viewBox="0 0 200 240"
      role="img"
      aria-label={LABEL[mood]}
      className={cn("shrink-0 select-none", className)}
      initial={animate ? { scale: 0.85, rotate: -4, opacity: 0 } : false}
      animate={animate ? { scale: 1, rotate: 0, opacity: 1, y: float ? [0, -6, 0] : 0 } : undefined}
      transition={animate ? { scale: { type: "spring", stiffness: 260, damping: 16 }, rotate: { type: "spring", stiffness: 260, damping: 16 }, opacity: { duration: 0.2 }, y: { duration: 3, repeat: Infinity, ease: "easeInOut" } } : undefined}
    >

  {on.has("armsBack") && (<g>
    <path d="M66 192 Q40 196 30 176" fill="none" stroke="#2A1E3F" strokeWidth="22" strokeLinecap="round" />
    <path d="M66 192 Q40 196 30 176" fill="none" stroke="#6D4AFF" strokeWidth="14" strokeLinecap="round" />
    <path d="M134 192 Q160 196 170 176" fill="none" stroke="#2A1E3F" strokeWidth="22" strokeLinecap="round" />
    <path d="M134 192 Q160 196 170 176" fill="none" stroke="#6D4AFF" strokeWidth="14" strokeLinecap="round" />
    <circle cx="30" cy="173" r="11" fill="#F6C9A4" stroke="#2A1E3F" strokeWidth="3.5" />
    <circle cx="170" cy="173" r="11" fill="#F6C9A4" stroke="#2A1E3F" strokeWidth="3.5" />
  </g>)}
  <path d="M50 240 C50 196 72 170 100 170 C128 170 150 196 150 240 Z" fill="#6D4AFF" stroke="#2A1E3F" strokeWidth="4" strokeLinejoin="round" />
  <path d="M84 172 Q100 190 116 172" fill="none" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
  <circle cx="122" cy="210" r="8" fill="#FFC93C" stroke="#2A1E3F" strokeWidth="3" />
  <circle cx="44" cy="110" r="13" fill="#F6C9A4" stroke="#2A1E3F" strokeWidth="4" />
  <circle cx="156" cy="110" r="13" fill="#F6C9A4" stroke="#2A1E3F" strokeWidth="4" />
  <circle cx="100" cy="106" r="58" fill="#F6C9A4" stroke="#2A1E3F" strokeWidth="4" />
  <path d="M44 96 C48 62 74 46 100 46 C126 46 152 62 156 96 C140 82 120 76 100 78 C80 76 60 82 44 96 Z" fill="#3A2618" />
  <path d="M48 72 C52 40 76 24 100 24 C124 24 148 40 152 72 C130 63 70 63 48 72 Z" fill="#FFFFFF" stroke="#2A1E3F" strokeWidth="4" strokeLinejoin="round" />
  <path d="M52 69 C80 61 120 61 148 69" fill="none" stroke="#CFC4FF" strokeWidth="3" />
  <circle cx="80" cy="48" r="3" fill="#CFC4FF" />
  <circle cx="100" cy="40" r="3" fill="#CFC4FF" />
  <circle cx="120" cy="48" r="3" fill="#CFC4FF" />
  <circle cx="90" cy="58" r="2.5" fill="#CFC4FF" />
  <circle cx="110" cy="58" r="2.5" fill="#CFC4FF" />
  <circle cx="68" cy="126" r="9" fill="#FF8FA3" opacity="0.45" />
  <circle cx="132" cy="126" r="9" fill="#FF8FA3" opacity="0.45" />
  <path d="M97 114 Q100 119 104 114" fill="none" stroke="#2A1E3F" strokeWidth="3.5" strokeLinecap="round" />

  {on.has("browsNormal") && (<g fill="none" stroke="#2A1E3F" strokeWidth="4" strokeLinecap="round">
    <path d="M68 88 Q78 83 88 88" /><path d="M112 88 Q122 83 132 88" />
  </g>)}
  {on.has("browsUp") && (<g fill="none" stroke="#2A1E3F" strokeWidth="4" strokeLinecap="round">
    <path d="M67 80 Q78 71 89 80" /><path d="M111 80 Q122 71 133 80" />
  </g>)}
  {on.has("browsThink") && (<g fill="none" stroke="#2A1E3F" strokeWidth="4" strokeLinecap="round">
    <path d="M68 90 L88 88" /><path d="M112 82 Q122 73 133 81" />
  </g>)}

  <motion.g style={{ transformOrigin: "100px 104px", transformBox: "view-box" }} animate={animate ? { scaleY: [1, 1, 0.1, 1, 1] } : undefined} transition={{ duration: 4.2, times: [0, 0.9, 0.93, 0.96, 1], repeat: Infinity }}>
{on.has("eyesOpen") && (<g>
    <ellipse cx="78" cy="104" rx="8" ry="10" fill="#2A1E3F" /><ellipse cx="122" cy="104" rx="8" ry="10" fill="#2A1E3F" />
    <circle cx="81" cy="100" r="3" fill="#FFFFFF" /><circle cx="125" cy="100" r="3" fill="#FFFFFF" />
  </g>)}
  {on.has("eyesClosed") && (<g fill="none" stroke="#2A1E3F" strokeWidth="4.5" strokeLinecap="round">
    <path d="M68 106 Q78 94 88 106" /><path d="M112 106 Q122 94 132 106" />
  </g>)}
  {on.has("eyesBig") && (<g>
    <circle cx="78" cy="104" r="13" fill="#FFFFFF" stroke="#2A1E3F" strokeWidth="3.5" /><circle cx="122" cy="104" r="13" fill="#FFFFFF" stroke="#2A1E3F" strokeWidth="3.5" />
    <circle cx="78" cy="105" r="6.5" fill="#2A1E3F" /><circle cx="122" cy="105" r="6.5" fill="#2A1E3F" />
    <circle cx="80" cy="102" r="2" fill="#FFFFFF" /><circle cx="124" cy="102" r="2" fill="#FFFFFF" />
  </g>)}
  {on.has("eyesUp") && (<g>
    <ellipse cx="81" cy="101" rx="7.5" ry="9.5" fill="#2A1E3F" /><ellipse cx="125" cy="101" rx="7.5" ry="9.5" fill="#2A1E3F" />
    <circle cx="84" cy="97" r="2.8" fill="#FFFFFF" /><circle cx="128" cy="97" r="2.8" fill="#FFFFFF" />
  </g>)}
  {on.has("eyesWink") && (<g>
    <ellipse cx="78" cy="104" rx="8" ry="10" fill="#2A1E3F" /><circle cx="81" cy="100" r="3" fill="#FFFFFF" />
    <path d="M112 106 Q122 97 132 106" fill="none" stroke="#2A1E3F" strokeWidth="4.5" strokeLinecap="round" />
  </g>)}
  {on.has("eyesStar") && (<g fill="#FFC93C" stroke="#2A1E3F" strokeWidth="2.5" strokeLinejoin="round">
    <path transform="translate(78 104)" d="M0 -13 L3.8 -4.3 L13 -4 L6 2.4 L8 12 L0 7 L-8 12 L-6 2.4 L-13 -4 L-3.8 -4.3 Z" />
    <path transform="translate(122 104)" d="M0 -13 L3.8 -4.3 L13 -4 L6 2.4 L8 12 L0 7 L-8 12 L-6 2.4 L-13 -4 L-3.8 -4.3 Z" />
  </g>)}

  </motion.g>
  {on.has("mouthLaugh") && (<g>
    <path d="M84 128 Q100 152 116 128 Z" fill="#7A2238" stroke="#2A1E3F" strokeWidth="3.5" strokeLinejoin="round" />
    <path d="M92 140 Q100 147 108 140 Q100 135 92 140 Z" fill="#FF7A8A" />
  </g>)}
  {on.has("mouthO") && (<g>
    <ellipse cx="100" cy="136" rx="7" ry="9" fill="#7A2238" stroke="#2A1E3F" strokeWidth="3" />
  </g>)}
  {on.has("mouthSide") && (<g>
    <path d="M90 136 Q102 130 112 134" fill="none" stroke="#2A1E3F" strokeWidth="4" strokeLinecap="round" />
  </g>)}
  {on.has("mouthSmile") && (<g>
    <path d="M86 130 Q100 145 114 130" fill="none" stroke="#2A1E3F" strokeWidth="4.5" strokeLinecap="round" />
  </g>)}

  {on.has("armsDown") && (<g>
    <path d="M66 194 Q50 210 54 230" fill="none" stroke="#2A1E3F" strokeWidth="22" strokeLinecap="round" />
    <path d="M66 194 Q50 210 54 230" fill="none" stroke="#6D4AFF" strokeWidth="14" strokeLinecap="round" />
    <path d="M134 194 Q150 210 146 230" fill="none" stroke="#2A1E3F" strokeWidth="22" strokeLinecap="round" />
    <path d="M134 194 Q150 210 146 230" fill="none" stroke="#6D4AFF" strokeWidth="14" strokeLinecap="round" />
  </g>)}
  {on.has("armsChin") && (<g>
    <path d="M66 194 Q50 210 54 230" fill="none" stroke="#2A1E3F" strokeWidth="22" strokeLinecap="round" />
    <path d="M66 194 Q50 210 54 230" fill="none" stroke="#6D4AFF" strokeWidth="14" strokeLinecap="round" />
    <path d="M134 194 Q150 172 122 158" fill="none" stroke="#2A1E3F" strokeWidth="22" strokeLinecap="round" />
    <path d="M134 194 Q150 172 122 158" fill="none" stroke="#6D4AFF" strokeWidth="14" strokeLinecap="round" />
    <circle cx="118" cy="155" r="11" fill="#F6C9A4" stroke="#2A1E3F" strokeWidth="3.5" />
  </g>)}
  {on.has("armsPoint") && (<g>
    <path d="M134 194 Q150 210 146 230" fill="none" stroke="#2A1E3F" strokeWidth="22" strokeLinecap="round" />
    <path d="M134 194 Q150 210 146 230" fill="none" stroke="#6D4AFF" strokeWidth="14" strokeLinecap="round" />
    <path d="M66 194 Q40 180 36 152" fill="none" stroke="#2A1E3F" strokeWidth="22" strokeLinecap="round" />
    <path d="M66 194 Q40 180 36 152" fill="none" stroke="#6D4AFF" strokeWidth="14" strokeLinecap="round" />
    <g fill="none" strokeLinecap="round">
      <path d="M26 142 L17 134 M28 131 L23 116 M35 128 L34 111 M41 129 L44 114 M46 133 L53 122" stroke="#2A1E3F" strokeWidth="10" />
      <path d="M26 142 L17 134 M28 131 L23 116 M35 128 L34 111 M41 129 L44 114 M46 133 L53 122" stroke="#F6C9A4" strokeWidth="5" />
    </g>
    <circle cx="36" cy="139" r="12.5" fill="#F6C9A4" stroke="#2A1E3F" strokeWidth="3.5" />
    <path d="M28 139 Q36 145 44 139" fill="none" stroke="#E0A989" strokeWidth="2" strokeLinecap="round" />
  </g>)}
  {on.has("armsBall") && (<g>
    <circle cx="100" cy="214" r="21" fill="#FFB020" stroke="#2A1E3F" strokeWidth="4" />
    <path d="M79 214 L121 214 M100 193 Q113 214 100 235 M100 193 Q87 214 100 235" fill="none" stroke="#2A1E3F" strokeWidth="3" />
    <path d="M66 194 Q66 212 80 214" fill="none" stroke="#2A1E3F" strokeWidth="22" strokeLinecap="round" />
    <path d="M66 194 Q66 212 80 214" fill="none" stroke="#6D4AFF" strokeWidth="14" strokeLinecap="round" />
    <path d="M134 194 Q134 212 120 214" fill="none" stroke="#2A1E3F" strokeWidth="22" strokeLinecap="round" />
    <path d="M134 194 Q134 212 120 214" fill="none" stroke="#6D4AFF" strokeWidth="14" strokeLinecap="round" />
    <circle cx="82" cy="214" r="10" fill="#F6C9A4" stroke="#2A1E3F" strokeWidth="3.5" />
    <circle cx="118" cy="214" r="10" fill="#F6C9A4" stroke="#2A1E3F" strokeWidth="3.5" />
  </g>)}
  {on.has("armsUp") && (<g>
    <path d="M66 194 Q44 172 42 146" fill="none" stroke="#2A1E3F" strokeWidth="22" strokeLinecap="round" />
    <path d="M66 194 Q44 172 42 146" fill="none" stroke="#6D4AFF" strokeWidth="14" strokeLinecap="round" />
    <path d="M134 194 Q156 172 158 146" fill="none" stroke="#2A1E3F" strokeWidth="22" strokeLinecap="round" />
    <path d="M134 194 Q156 172 158 146" fill="none" stroke="#6D4AFF" strokeWidth="14" strokeLinecap="round" />
    <circle cx="42" cy="140" r="12" fill="#F6C9A4" stroke="#2A1E3F" strokeWidth="3.5" />
    <circle cx="158" cy="140" r="12" fill="#F6C9A4" stroke="#2A1E3F" strokeWidth="3.5" />
  </g>)}

    </motion.svg>
  );
}
