"use client";
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import "./branched-menu.css";

// قائمة متفرعة (من React Bits): أقسام تنطوي، وخط ذهبي يرسم الطريق من الجذع للعنصر المختار.
// active يأتي من الخارج (مثلًا من مكان السكرول)، والقسم الذي فيه العنصر المختار يُفتح وحده تلقائيًا.

export type BranchedMenuChild = { value: string; label: string; icon?: ReactNode };
export type BranchedMenuItem = { label: string; value?: string; children?: BranchedMenuChild[] };

const PAD = 6;
const MARK = 16;

export function BranchedMenu({
  items,
  active,
  onSelect,
  rowHeight = 34,
  indent = 40,
  trunk = 14,
  radius = 10,
  className,
  label,
}: {
  items: BranchedMenuItem[];
  active: string;
  onSelect: (value: string) => void;
  rowHeight?: number;
  indent?: number;
  trunk?: number;
  radius?: number;
  className?: string;
  label: string;
}) {
  const activeSection = items.findIndex((it) => it.children?.some((k) => k.value === active));
  const [open, setOpen] = useState(() => new Set(activeSection >= 0 ? [activeSection] : []));
  // لما المختار ينتقل لقسم آخر: نفتح قسمه ونطوي الباقي (حساب أثناء الرسم بدل effect)
  const [followed, setFollowed] = useState(activeSection);
  if (followed !== activeSection) {
    setFollowed(activeSection);
    if (activeSection >= 0) setOpen(new Set([activeSection]));
  }

  const navRef = useRef<HTMLElement>(null);
  const heads = useRef<(HTMLButtonElement | null)[]>([]);
  const markerRef = useRef<HTMLSpanElement>(null);
  const markerShown = activeSection >= 0 && open.has(activeSection);

  useLayoutEffect(() => {
    const place = (glide: boolean) => {
      const m = markerRef.current, el = heads.current[activeSection];
      if (!m) return;
      const on = markerShown && !!el;
      if (!glide) m.style.transition = "none";
      if (on) m.style.top = `${el!.offsetTop + (el!.offsetHeight - MARK) / 2}px`;
      m.toggleAttribute("data-on", on);
      if (!glide) { void m.offsetHeight; m.style.transition = ""; }
    };
    place(true);
    let first = true;
    const ro = new ResizeObserver(() => { if (first) { first = false; return; } place(false); });
    if (navRef.current) ro.observe(navRef.current);
    return () => ro.disconnect();
  }, [activeSection, markerShown, items, rowHeight]);

  // قسم واحد مفتوح فقط: فتح قسم يقفل الباقي
  const toggle = (i: number) => setOpen((prev) => (prev.has(i) ? new Set<number>() : new Set([i])));

  const r = Math.min(radius, rowHeight / 2 - 2);
  const endX = indent - 8;
  const rowY = (k: number) => PAD + k * rowHeight + rowHeight / 2;
  const branch = (k: number) => `M ${trunk} ${rowY(k) - r} A ${r} ${r} 0 0 0 ${trunk + r} ${rowY(k)} H ${endX}`;
  const reach = (k: number) => `M ${trunk} 0 V ${rowY(k) - r} A ${r} ${r} 0 0 0 ${trunk + r} ${rowY(k)} H ${endX}`;
  const length = (k: number) => rowY(k) - r + (Math.PI * r) / 2 + (endX - trunk - r);

  return (
    <nav ref={navRef} aria-label={label} className={cn("branched-menu", className)}
      style={{ "--bm-row": `${rowHeight}px`, "--bm-indent": `${indent}px` } as CSSProperties}>
      <span ref={markerRef} className="branched-menu__marker" aria-hidden="true" />
      {items.map((item, i) => {
        const kids = item.children;
        const isOpen = kids ? open.has(i) : false;
        const leafValue = item.value ?? item.label;
        const leafActive = !kids && leafValue === active;
        const bodyH = kids ? PAD * 2 + kids.length * rowHeight : 0;
        return (
          <div key={item.value ?? item.label} className="branched-menu__section" data-open={isOpen ? "" : undefined}>
            <button ref={(el) => { heads.current[i] = el; }} type="button" className="branched-menu__head"
              aria-expanded={kids ? isOpen : undefined} aria-current={leafActive ? "true" : undefined} data-active={leafActive ? "" : undefined}
              onClick={() => (kids ? toggle(i) : onSelect(leafValue))}>
              {item.label}
            </button>
            {kids && (
              <div className="branched-menu__body">
                <div className="branched-menu__fold">
                  <div className="branched-menu__tree" style={{ height: bodyH }}>
                    <svg className="branched-menu__lines" width={indent} height={bodyH} aria-hidden="true">
                      <path className="branched-menu__base" d={`M ${trunk} 0 V ${rowY(kids.length - 1) - r}`} />
                      {kids.map((kid, k) => <path key={kid.value} className="branched-menu__base" d={branch(k)} />)}
                      {kids.map((kid, k) => (
                        <path key={kid.value} className="branched-menu__reach" d={reach(k)}
                          style={{ strokeDasharray: length(k), strokeDashoffset: kid.value === active ? 0 : length(k) }} />
                      ))}
                    </svg>
                    {kids.map((kid) => (
                      <button key={kid.value} type="button" className="branched-menu__item"
                        aria-current={kid.value === active ? "true" : undefined} data-active={kid.value === active ? "" : undefined}
                        tabIndex={isOpen ? 0 : -1} onClick={() => onSelect(kid.value)}>
                        {kid.icon && <span className="branched-menu__icon" aria-hidden="true">{kid.icon}</span>}
                        <span className="branched-menu__label">{kid.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
