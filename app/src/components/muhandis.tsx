"use client";
import { motion } from "motion/react";
import { useMotionAllowed } from "@/lib/tier";
import { cn } from "@/lib/utils";

// «م. أحمد»: شخصية لوحة المطوّر — مبرمج شاب بشعر مرتب ولحية قصيرة ونظارة داكنة وهودي، وسماعات على رقبته،
// ولابتوب أمامه عليه شعار { }، ورموز برمجة تطفو حوله.
// coding يكتب بتركيز، proud فخور ويرفع إبهامه (كل شيء شغال)، debugging يصلّح مشكلة (حاجب مرفوع ويد عند الذقن)
export type MuhandisLook = "coding" | "proud" | "debugging";
const LABEL: Record<MuhandisLook, string> = { coding: "م. أحمد يبرمج", proud: "م. أحمد فخور — كل شيء شغال", debugging: "م. أحمد يصلّح مشكلة" };

const INK = "#1B1630", SKIN = "#E9B48C", HAIR = "#1E1A2B", HOODIE = "#2D2A6B", HOODIE_LIGHT = "#4A44B8", GOLD = "#FFC24D", CYAN = "#5EE6FF";

function Arm({ d }: { d: string }) {
  return (<>
    <path d={d} fill="none" stroke={INK} strokeWidth="23" strokeLinecap="round" />
    <path d={d} fill="none" stroke={HOODIE} strokeWidth="15" strokeLinecap="round" />
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
      className={cn("shrink-0 select-none overflow-visible", className)}
      initial={animate ? { scale: 0.92, opacity: 0 } : false}
      animate={animate ? { scale: 1, opacity: 1, y: float ? [0, -4, 0] : 0 } : { scale: 1, opacity: 1, y: 0 }}
      transition={animate ? { scale: { type: "spring", stiffness: 200, damping: 20 }, opacity: { duration: 0.25 }, y: { duration: 4, repeat: Infinity, ease: "easeInOut" } } : undefined}
    >
      {/* رموز برمجة تطفو حوله */}
      <motion.g direction="ltr" style={{ unicodeBidi: "isolate" }} fontFamily="ui-monospace, Consolas, monospace" fontWeight="700" animate={animate ? { opacity: [0.5, 1, 0.5] } : undefined} transition={{ duration: 2.6, repeat: Infinity }}>
        <text x="8" y="60" fontSize="18" fill={CYAN}>{"</>"}</text>
        <text x="160" y="44" fontSize="20" fill={GOLD}>{"{ }"}</text>
        <text x="164" y="96" fontSize="13" fill={CYAN}>{"01"}</text>
        <text x="14" y="104" fontSize="13" fill={GOLD}>{"=>"}</text>
      </motion.g>

      {/* الهودي */}
      <path d="M38 240 C38 202 64 178 100 178 C136 178 162 202 162 240 Z" fill={HOODIE} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d="M74 182 Q100 204 126 182" fill={HOODIE_LIGHT} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M92 196 L90 220 M108 196 L110 220" stroke="#E8E6FF" strokeWidth="3" strokeLinecap="round" />
      <circle cx="90" cy="222" r="2.6" fill="#E8E6FF" /><circle cx="110" cy="222" r="2.6" fill="#E8E6FF" />

      {/* الرقبة والسماعات حولها */}
      <rect x="88" y="150" width="24" height="30" rx="8" fill={SKIN} stroke={INK} strokeWidth="3.5" />
      <path d="M66 176 Q100 150 134 176" fill="none" stroke={INK} strokeWidth="7" strokeLinecap="round" />
      <path d="M66 176 Q100 150 134 176" fill="none" stroke="#3A3A4A" strokeWidth="3.5" strokeLinecap="round" />
      <rect x="56" y="168" width="18" height="22" rx="7" fill="#3A3A4A" stroke={INK} strokeWidth="3" />
      <rect x="126" y="168" width="18" height="22" rx="7" fill="#3A3A4A" stroke={INK} strokeWidth="3" />
      <rect x="60" y="173" width="10" height="12" rx="4" fill={CYAN} opacity="0.8" />
      <rect x="130" y="173" width="10" height="12" rx="4" fill={CYAN} opacity="0.8" />

      {/* الأذنان والرأس */}
      <ellipse cx="60" cy="112" rx="7" ry="10" fill={SKIN} stroke={INK} strokeWidth="3.5" />
      <ellipse cx="140" cy="112" rx="7" ry="10" fill={SKIN} stroke={INK} strokeWidth="3.5" />
      <ellipse cx="100" cy="110" rx="40" ry="46" fill={SKIN} stroke={INK} strokeWidth="3.5" />

      {/* الشعر: قصّة مرتبة مرفوعة للأمام */}
      <path d="M60 104 C54 66 74 46 102 46 C132 46 150 66 140 104 C138 90 132 80 120 76 C112 84 92 86 78 80 C68 86 62 94 60 104 Z" fill={HAIR} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M84 54 Q104 44 128 58" fill="none" stroke="#3B3456" strokeWidth="3" strokeLinecap="round" />

      {/* لحية قصيرة مهذبة وشارب */}
      <path d="M61 116 C63 148 82 160 100 160 C118 160 137 148 139 116 C134 138 120 148 100 149 C80 148 66 138 61 116 Z" fill={HAIR} opacity="0.92" />
      <path d="M88 133 Q100 128 112 133" fill="none" stroke={HAIR} strokeWidth="5" strokeLinecap="round" />

      {/* الحاجبان */}
      <g fill="none" stroke={HAIR} strokeWidth="4" strokeLinecap="round">
        {look === "coding" && <><path d="M73 94 Q83 91 93 94" /><path d="M107 94 Q117 91 127 94" /></>}
        {look === "proud" && <><path d="M73 92 Q83 87 93 91" /><path d="M107 91 Q117 87 127 92" /></>}
        {look === "debugging" && <><path d="M73 96 Q83 94 93 95" /><path d="M107 90 Q117 84 127 89" /></>}
      </g>

      {/* العينان (ترمش) */}
      <motion.g style={{ transformOrigin: "100px 106px", transformBox: "view-box" }} animate={animate ? { scaleY: [1, 1, 0.1, 1, 1] } : undefined} transition={{ duration: 5.5, times: [0, 0.9, 0.93, 0.96, 1], repeat: Infinity }}>
        {look === "proud" ? (
          <g fill="none" stroke={INK} strokeWidth="3.2" strokeLinecap="round"><path d="M77 108 Q84 101 91 108" /><path d="M109 108 Q116 101 123 108" /></g>
        ) : (
          <g fill={INK}>
            <ellipse cx={look === "debugging" ? 86 : 84} cy={look === "coding" ? 109 : 106} rx="4.2" ry="4.6" />
            <ellipse cx={look === "debugging" ? 118 : 116} cy={look === "coding" ? 109 : 106} rx="4.2" ry="4.6" />
            <circle cx={look === "debugging" ? 87.5 : 85.5} cy={look === "coding" ? 107.5 : 104.5} r="1.4" fill="#FFFFFF" />
            <circle cx={look === "debugging" ? 119.5 : 117.5} cy={look === "coding" ? 107.5 : 104.5} r="1.4" fill="#FFFFFF" />
          </g>
        )}
      </motion.g>

      {/* نظارة داكنة مستطيلة مع لمعة */}
      <g fill="none" stroke={INK} strokeWidth="3.6" strokeLinejoin="round">
        <rect x="70" y="96" width="27" height="20" rx="6" /><rect x="103" y="96" width="27" height="20" rx="6" />
        <path d="M97 104 Q100 101 103 104" /><path d="M70 102 L60 99 M130 102 L140 99" />
      </g>
      <path d="M74 100 L80 99 M107 100 L113 99" stroke={CYAN} strokeWidth="2.2" strokeLinecap="round" opacity="0.9" />

      {/* الفم */}
      {look === "coding" && <path d="M92 140 Q100 143 108 140" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />}
      {look === "proud" && <path d="M88 138 Q100 151 112 138 Q100 143 88 138 Z" fill="#FFFFFF" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />}
      {look === "debugging" && <path d="M93 142 Q101 138 109 141" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />}

      {/* اللابتوب واليدان */}
      {look !== "proud" && (<g>
        {look === "coding" ? (<>
          <Arm d="M58 202 Q60 222 80 226" /><Arm d="M142 202 Q140 222 120 226" />
          <Hand x={82} y={224} /><Hand x={118} y={224} />
        </>) : (<>
          <Arm d="M58 202 Q60 222 80 226" /><Hand x={82} y={224} />
          <Arm d="M142 202 Q154 176 128 160" /><Hand x={123} y={156} />
        </>)}
        <path d="M54 240 L62 214 L138 214 L146 240 Z" fill="#C9CBDA" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
        <rect x="64" y="208" width="72" height="8" rx="3" fill="#9EA1B8" stroke={INK} strokeWidth="3" />
        <motion.text x="100" y="234" textAnchor="middle" fontFamily="ui-monospace, Consolas, monospace" fontWeight="800" fontSize="15" fill={GOLD}
          animate={animate ? { opacity: [0.6, 1, 0.6] } : undefined} transition={{ duration: 1.8, repeat: Infinity }}>{"{ }"}</motion.text>
      </g>)}
      {look === "proud" && (<g>
        <Arm d="M58 202 Q52 222 56 240" />
        <Arm d="M142 204 Q160 186 150 164" />
        {/* إبهام لأعلى */}
        {/* قبضة بإبهام مرفوع (لا إصبع سبابة) */}
        <rect x="136" y="150" width="28" height="22" rx="8" fill={SKIN} stroke={INK} strokeWidth="3.5" />
        <path d="M150 155 L162 155 M150 161 L162 161 M150 167 L161 167" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
        <path d="M140 152 Q136 138 142 130 Q148 126 149 134 L148 151" fill={SKIN} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      </g>)}
    </motion.svg>
  );
}
