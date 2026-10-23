import React from "react";
import { Award, ShieldCheck, Leaf, Star, BadgeCheck } from "lucide-react";

const BADGES = [
  {
    icon: ShieldCheck,
    label: "GDC Certified",
    sub: "Regulated & Safe",
    color: "#cf9448",
  },
  {
    icon: Leaf,
    label: "Vegan Formula",
    sub: "100% Cruelty-Free",
    color: "#4a7c59",
  },
  {
    icon: Award,
    label: "Award Winning",
    sub: "Best Whitening 2024",
    color: "#cf9448",
  },
  {
    icon: BadgeCheck,
    label: "ISO Certified",
    sub: "Quality Assured",
    color: "#5b7fa6",
  },
  {
    icon: Star,
    label: "4.9 Rating",
    sub: "1,200+ Reviews",
    color: "#cf9448",
  },
];

export function WhiteningAwards() {
  return (
    <section className="py-20 sm:py-28 bg-[#2a1c12] text-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="font-display text-3xl sm:text-5xl font-bold text-white">
          Award-Winning Whitening Standards
        </h2>
        <p className="mt-4 text-white/70 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
          Recognised by independent dental bodies and trusted by thousands of patients across West Yorkshire.
        </p>

        {/* Solid Badge Row with crisp rounded-lg */}
        <div className="mt-14 flex flex-wrap justify-center gap-5">
          {BADGES.map((badge) => (
            <div
              key={badge.label}
              className="flex flex-col items-center gap-3 w-36 sm:w-40 p-4 rounded-lg bg-[#372418] border border-[#523825] shadow-sm"
            >
              <div
                className="size-14 sm:size-16 flex items-center justify-center rounded-lg border bg-[#2a1c12]"
                style={{ borderColor: badge.color }}
              >
                <badge.icon
                  className="size-7 sm:size-8"
                  style={{ color: badge.color }}
                />
              </div>
              <div>
                <p className="text-sm font-bold text-white">{badge.label}</p>
                <p className="text-xs text-white/60 mt-0.5">{badge.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Solid Marquee Banner */}
        <div className="mt-16 overflow-hidden border-t border-[#3d2a1d] pt-8">
          <div
            className="flex gap-8 text-white/20 font-display text-5xl sm:text-7xl font-black whitespace-nowrap"
            style={{ animation: "marquee 30s linear infinite" }}
          >
            {[
              "CLINICAL WHITENING",
              "ENAMEL SAFE",
              "GDC SUPERVISED",
              "CLINICAL WHITENING",
              "ENAMEL SAFE",
              "GDC SUPERVISED",
            ].map((w, i) => (
              <span key={i}>{w} &bull;</span>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}
