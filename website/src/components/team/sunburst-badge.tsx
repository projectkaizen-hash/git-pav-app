import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SunburstBadgeProps {
  className?: string;
  variant?: "glass" | "sage" | "dark" | "gold";
  size?: number; // size in px, default 112
  onClick?: () => void;
  interactive?: boolean;
}

export function SunburstBadge({
  className,
  variant = "glass",
  size = 114,
  onClick,
  interactive = true,
}: SunburstBadgeProps) {
  const pathId = `seal-circle-${Math.random().toString(36).substring(2, 9)}`;

  // Variant color mappings
  const variantStyles = {
    glass: {
      container: "bg-white/90 text-[#2a1c12] border border-white/80 shadow-[0_12px_36px_rgba(42,28,18,0.18)] backdrop-blur-md",
      center: "bg-[#2a1c12] text-white group-hover:bg-primary transition-colors",
      textFill: "fill-[#2a1c12]",
      ring: "border-primary/20",
    },
    sage: {
      container: "bg-[#3d5244] text-[#f8f5ef] border border-[#58715f]/40 shadow-[0_12px_36px_rgba(20,32,24,0.35)] backdrop-blur-md",
      center: "bg-[#f8f5ef] text-[#293b2f] group-hover:bg-gold group-hover:text-white transition-colors",
      textFill: "fill-[#f8f5ef]",
      ring: "border-[#f8f5ef]/20",
    },
    dark: {
      container: "bg-[#1f1610] text-[#fffdfa] border border-white/20 shadow-[0_12px_36px_rgba(0,0,0,0.35)] backdrop-blur-md",
      center: "bg-primary text-white group-hover:bg-gold transition-colors",
      textFill: "fill-[#fffdfa]",
      ring: "border-white/10",
    },
    gold: {
      container: "bg-gradient-to-br from-[#cf9448] to-[#925a27] text-white border border-white/40 shadow-[0_12px_36px_rgba(146,90,39,0.3)]",
      center: "bg-white text-primary group-hover:scale-105 transition-transform",
      textFill: "fill-white",
      ring: "border-white/30",
    },
  };

  const style = variantStyles[variant];

  return (
    <div
      onClick={onClick}
      style={{ width: size, height: size }}
      className={cn(
        "group relative flex items-center justify-center rounded-full select-none transition-all duration-300",
        style.container,
        interactive && "cursor-pointer hover:scale-105 active:scale-95",
        className,
      )}
      role={interactive ? "button" : undefined}
      aria-label="Schedule an appointment"
    >
      {/* Outer scalloped/serrated subtle border */}
      <div className={cn("absolute inset-1 rounded-full border border-dashed", style.ring)} />

      {/* Rotating circular SVG text */}
      <svg
        viewBox="0 0 120 120"
        className="absolute inset-0 size-full animate-spin-slow pointer-events-none"
      >
        <defs>
          <path
            id={pathId}
            d="M 60,60 m -44,0 a 44,44 0 1,1 88,0 a 44,44 0 1,1 -88,0"
            fill="none"
          />
        </defs>
        <text
          className={cn(
            "text-[9px] uppercase tracking-[0.24em] font-semibold font-sans",
            style.textFill,
          )}
        >
          <textPath
            href={`#${pathId}`}
            startOffset="0%"
            lengthAdjust="spacing"
            textLength="276"
          >
            SCHEDULE AN APPOINTMENT • SCHEDULE AN APPOINTMENT •
          </textPath>
        </text>
      </svg>

      {/* Center core with ↗ icon */}
      <div
        className={cn(
          "relative z-10 flex size-9 items-center justify-center rounded-full shadow-sm transition-all duration-300",
          style.center,
        )}
      >
        <ArrowUpRight className="size-4 stroke-[2.2] transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
    </div>
  );
}

