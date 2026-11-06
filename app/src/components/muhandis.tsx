"use client";
import { motion } from "motion/react";
import { useMotionAllowed } from "@/lib/tier";
import { cn } from "@/lib/utils";

// «م. احمد»: شخصية لوحة المطوّر — مبرمج شاب مرح: شماغ أسود ملفوف بشُرّابة، ونظارة شمس، ولحية كاملة،
// وتيشيرت أسود عليه </> بالذهبي، ولابتوب عليه ملصقات ملونة، وإيموجي ورموز برمجة تطفو حوله.
// coding يكتب ومبتسم، proud يغمز ويرفع إبهامه (كل شيء شغال)، debugging يحك رأسه ويفكر
export type MuhandisLook = "coding" | "proud" | "debugging";
const LABEL: Record<MuhandisLook, string> = { coding: "م. احمد يبرمج", proud: "م. احمد فخور — كل شيء شغال", debugging: "م. احمد يصلّح مشكلة" };

const INK = "#15111F", SKIN = "#E3A982", WRAP = "#1C1A24", WRAP_LIGHT = "#34313F", SHIRT = "#1F1C29", GOLD = "#FFC24D", CYAN = "#5EE6FF", PINK = "#FF6FB5", LIME = "#9BE15D";

function Arm({ d }: { d: string }) {
  return (<>
    <path d={d} fill="none" stroke={INK} strokeWidth="23" strokeLinecap="round" />
    <path d={d} fill="none" stroke={SHIRT} strokeWidth="15" strokeLinecap="round" />
  </>);
}
const Hand = ({ x, y }: { x: number; y: number }) => <ellipse cx={x} cy={y} rx="10" ry="9" fill={SKIN} stroke={INK} strokeWidth="3.5" />;

export function Muhandis({ look = "coding", size = 160, className, float = true }: { look?: MuhandisLook; size?: number; className?: string; float?: boolean }) {
  const animate = useMotionAllowed();
  return (
    <motion.svg
      key={look}
      width={size}
      height={size * 1.2}
      viewBox="0 0 200 240"
      role="img"
      aria-label={LABEL[look]}
      className={cn("shrink-0 select-none overflow-visible drop-shadow-[0_0_14px_rgba(255,194,77,0.45)]", className)}
      initial={animate ? { scale: 0.85, rotate: -5, opacity: 0 } : false}
      // حركة مرحة: يتمايل ويقفز قليلًا
      animate={animate ? { scale: 1, opacity: 1, y: float ? [0, -7, 0] : 0, rotate: float ? [0, -2, 0, 2, 0] : 0 } : { scale: 1, opacity: 1, y: 0, rotate: 0 }}
      transition={animate ? { scale: { type: "spring", stiffness: 260, damping: 15 }, opacity: { duration: 0.25 }, y: { duration: 2.4, repeat: Infinity, ease: "easeInOut" }, rotate: { duration: 4.8, repeat: Infinity, ease: "easeInOut" } } : undefined}
    >
      {/* رموز وإيموجي تطفو حوله */}
      <motion.g direction="ltr" style={{ unicodeBidi: "isolate" }} fontFamily="ui-monospace, Consolas, monospace" fontWeight="800"
        animate={animate ? { y: [0, -4, 0], opacity: [0.65, 1, 0.65] } : undefined} transition={{ duration: 2.2, repeat: Infinity }}>
        <text x="4" y="58" fontSize="18" fill={CYAN}>{"</>"}</text>
        <text x="158" y="40" fontSize="20" fill={GOLD}>{"{ }"}</text>
        <text x="12" y="100" fontSize="14" fill={LIME}>{"=>"}</text>
        <text x="168" y="92" fontSize="17">⚡</text>
        <text x="150" y="14" fontSize="16">🚀</text>
      </motion.g>

      {/* طرف الشماغ ينسدل خلف الكتف */}
      <path d="M138 96 C164 120 168 176 150 214 L126 206 C140 170 138 132 124 108 Z" fill={WRAP} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />

      {/* التيشيرت */}
      <path d="M40 240 C40 202 64 180 100 180 C136 180 160 202 160 240 Z" fill={SHIRT} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d="M86 182 Q100 194 114 182" fill="none" stroke={WRAP_LIGHT} strokeWidth="3" strokeLinecap="round" />
      <text x="100" y="228" textAnchor="middle" direction="ltr" fontFamily="ui-monospace, Consolas, monospace" fontWeight="800" fontSize="15" fill={GOLD}>{"</>"}</text>

      {/* الرقبة والرأس */}
      <rect x="88" y="150" width="24" height="30" rx="8" fill={SKIN} stroke={INK} strokeWidth="3.5" />
      <ellipse cx="100" cy="112" rx="39" ry="45" fill={SKIN} stroke={INK} strokeWidth="3.5" />

      {/* لحية كاملة مهذبة وشارب */}
      <path d="M61 112 C61 154 82 168 100 168 C118 168 139 154 139 112 C134 132 124 140 112 141 Q100 136 88 141 C76 140 66 132 61 112 Z" fill={WRAP} />
      <path d="M86 137 Q100 129 114 137" fill="none" stroke={WRAP} strokeWidth="6" strokeLinecap="round" />

      {/* الشماغ الأسود ملفوفًا على الرأس، وشُرّابة صغيرة فوق */}
      <path d="M58 104 C52 62 74 40 102 40 C132 40 152 62 144 104 C134 88 120 82 100 82 C82 82 68 88 58 104 Z" fill={WRAP} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M62 92 Q100 70 140 92 M70 70 Q100 54 132 70" fill="none" stroke={WRAP_LIGHT} strokeWidth="3" strokeLinecap="round" />
      <motion.g style={{ transformOrigin: "104px 40px", transformBox: "view-box" }} animate={animate ? { rotate: [-8, 8, -8] } : undefined} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}>
        <path d="M104 40 L98 28 M104 40 L104 26 M104 40 L110 28" stroke={WRAP} strokeWidth="3" strokeLinecap="round" />
      </motion.g>

      {/* الحاجبان (فوق النظارة) */}
      <g fill="none" stroke={WRAP} strokeWidth="4" strokeLinecap="round">
        {look === "coding" && <><path d="M70 92 Q81 87 92 91" /><path d="M108 91 Q119 87 130 92" /></>}
        {look === "proud" && <><path d="M70 89 Q81 82 92 88" /><path d="M108 88 Q119 82 130 89" /></>}
        {look === "debugging" && <><path d="M70 93 Q81 91 92 92" /><path d="M108 87 Q119 80 130 86" /></>}
      </g>

      {/* نظارة شمس داكنة بلمعة (وفي الفخر غمزة فوقها) */}
      <g stroke={INK} strokeWidth="3.4" strokeLinejoin="round">
        <rect x="67" y="96" width="30" height="21" rx="8" fill="#0E0C16" /><rect x="103" y="96" width="30" height="21" rx="8" fill="#0E0C16" />
        <path d="M97 103 Q100 100 103 103" fill="none" /><path d="M67 101 L59 98 M133 101 L141 98" fill="none" />
      </g>
      <motion.path d="M72 101 L82 100 M108 101 L118 100" stroke={CYAN} strokeWidth="2.6" strokeLinecap="round"
        animate={animate ? { opacity: [0.4, 1, 0.4] } : undefined} transition={{ duration: 2, repeat: Infinity }} />

      {/* الفم: ابتسامة عريضة */}
      {look === "coding" && <path d="M88 147 Q100 156 112 147" fill="none" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" />}
      {look === "proud" && <path d="M85 144 Q100 162 115 144 Q100 150 85 144 Z" fill="#FFFFFF" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />}
      {look === "debugging" && <path d="M90 150 Q101 145 111 149" fill="none" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" />}

      {/* اللابتوب بالملصقات واليدان */}
      {look !== "proud" && (<g>
        {look === "coding" ? (<>
          <Arm d="M58 202 Q60 222 80 226" /><Arm d="M142 202 Q140 222 120 226" />
          <Hand x={82} y={224} /><Hand x={118} y={224} />
        </>) : (<>
          <Arm d="M58 202 Q60 222 80 226" /><Hand x={82} y={224} />
          {/* يحك رأسه */}
          <Arm d="M142 200 Q170 160 146 112" /><Hand x={143} y={108} />
        </>)}
        <path d="M54 240 L62 214 L138 214 L146 240 Z" fill="#C9CBDA" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
        <circle cx="74" cy="228" r="5" fill={PINK} /><circle cx="128" cy="230" r="4.5" fill={LIME} /><rect x="112" y="219" width="9" height="7" rx="2" fill={CYAN} />
        <motion.text x="100" y="234" textAnchor="middle" direction="ltr" fontFamily="ui-monospace, Consolas, monospace" fontWeight="800" fontSize="15" fill={GOLD}
          animate={animate ? { opacity: [0.6, 1, 0.6] } : undefined} transition={{ duration: 1.8, repeat: Infinity }}>{"{ }"}</motion.text>
      </g>)}
      {look === "debugging" && <text x="160" y="76" fontSize="18">🤔</text>}
      {look === "proud" && (<g>
        <Arm d="M58 202 Q52 222 56 240" />
        <Arm d="M142 204 Q160 186 150 164" />
        <rect x="136" y="150" width="28" height="22" rx="8" fill={SKIN} stroke={INK} strokeWidth="3.5" />
        <path d="M150 155 L162 155 M150 161 L162 161 M150 167 L161 167" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
        <path d="M140 152 Q136 138 142 130 Q148 126 149 134 L148 151" fill={SKIN} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
        <motion.text x="166" y="130" fontSize="16" animate={animate ? { scale: [1, 1.3, 1] } : undefined} transition={{ duration: 1.2, repeat: Infinity }}>✨</motion.text>
      </g>)}
    </motion.svg>
  );
}
