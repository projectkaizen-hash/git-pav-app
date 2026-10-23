import React from "react";
import { ArrowRight, Check, ShieldCheck, Award } from "lucide-react";
import { Button } from "@/components/ui/button";

export function WhiteningHero() {
  return (
    <section className="relative overflow-hidden bg-[#fffdf9] pt-10 pb-16 sm:pb-24 border-b border-[#e8ddd0]">
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-14 items-center min-h-[68vh]">
          {/* Left Column: Clinical Typography & CTA */}
          <div className="lg:col-span-7 py-4 lg:py-8 z-10">

            {/* Main Headline */}
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] text-[#2a1c12]">
              Designed by Dentists,
              <br />
              <span className="accent-text">Perfected</span> for Your Smile.
            </h1>

            {/* Description */}
            <p className="mt-5 text-base sm:text-lg text-[#6b5848] leading-relaxed max-w-xl">
              Experience clinic-grade, enamel-safe teeth whitening designed to lift up to 10 shades without sensitivity. Formulated, prescribed, and supervised by GDC-registered dental surgeons in West Yorkshire.
            </p>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-wrap gap-4">
              <Button
                asChild
                className="accent-gradient text-white rounded-full px-8 h-12 text-sm font-bold shadow-sm hover:opacity-95"
              >
                <a href="#shade-visualizer" className="flex items-center gap-2">
                  Simulate Your VITA Shade <ArrowRight className="size-4" />
                </a>
              </Button>
              <Button
                variant="outline"
                asChild
                className="rounded-full px-7 h-12 border-[#925a27] text-[#925a27] bg-white text-sm font-semibold hover:bg-[#faf6f0]"
              >
                <a href="#comparison-matrix">Compare Systems &amp; Pricing</a>
              </Button>
            </div>

            {/* Crisp Stats Grid (Clean structured border, no rounded-2xl) */}
            <div className="mt-10 pt-8 border-t border-[#e8ddd0]">
              <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-xl">
                <div className="bg-white p-4 rounded-lg border border-[#e2d4c0] shadow-sm">
                  <p className="font-display text-2xl sm:text-3xl font-bold text-[#925a27]">Up to 10</p>
                  <p className="text-xs text-[#6b5848] mt-1 font-medium">Shades whiter</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-[#e2d4c0] shadow-sm">
                  <p className="font-display text-2xl sm:text-3xl font-bold text-[#925a27]">0.0%</p>
                  <p className="text-xs text-[#6b5848] mt-1 font-medium">Demineralization</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-[#e2d4c0] shadow-sm">
                  <p className="font-display text-2xl sm:text-3xl font-bold text-[#925a27]">100%</p>
                  <p className="text-xs text-[#6b5848] mt-1 font-medium">GDC supervised</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Architectural Clinical Frame */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-xl p-3 border border-[#e2d4c0] shadow-md">
              <div className="relative rounded-lg overflow-hidden aspect-[4/3] bg-[#2a1c12]">
                <img
                  src="https://images.unsplash.com/photo-1609208272522-82d1af6bfb73?auto=format&fit=crop&w=900&q=85"
                  alt="Luminous Whitening Patient Smile"
                  className="size-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#2a1c12]/75 via-transparent to-transparent" />

                {/* Top Badge (Crisp rounded-md) */}
                <div className="absolute top-3 left-3 bg-white rounded-md px-3 py-1.5 shadow-sm border border-[#e2d4c0] flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-[#925a27]" />
                  <span className="text-[11px] font-bold text-[#2a1c12]">GDC Supervised Practice</span>
                </div>

                {/* Patient Result Overprint */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-[#cf9448]">Clinical Verification</p>
                    <p className="font-display text-base font-bold">10 Shades Visible Lift</p>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-900 font-bold text-xs bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                    <Check className="size-3.5 stroke-[3] text-emerald-700" />
                    <span>Zero Sensitivity</span>
                  </div>
                </div>
              </div>

              {/* Bottom Clinical Metadata Strip (Solid crisp footer) */}
              <div className="mt-3 px-2 py-2 flex items-center justify-between text-xs text-[#6b5848] border-t border-[#f0e8dc]">
                <div className="flex items-center gap-2">
                  <Award className="size-4 text-[#925a27]" />
                  <span className="font-semibold text-[#2a1c12]">Dr. M. Hussain</span>
                  <span>&bull;</span>
                  <span>GDC 258941</span>
                </div>
                <span className="text-[11px] text-[#925a27] font-bold uppercase">ACP Enamel Seal</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
