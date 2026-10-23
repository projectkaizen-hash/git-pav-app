import React from "react";
import { Microscope, ShieldCheck, Award } from "lucide-react";

export function WhiteningEvidence() {
  return (
    <section className="bg-[#faf6f0] border-b border-[#e2d4c0] py-10 sm:py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="rounded-lg bg-white p-5 sm:p-6 border border-[#e2d4c0] flex items-center gap-4 shadow-sm">
            <div className="size-12 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0">
              <Microscope className="size-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#2a1c12]">0.0% Demineralization</p>
              <p className="text-xs text-[#6b5848] mt-1 leading-relaxed">
                pH-neutral buffer prevents micro-pitting and enamel softening.
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-white p-5 sm:p-6 border border-[#e2d4c0] flex items-center gap-4 shadow-sm">
            <div className="size-12 rounded-lg bg-[#faf6f0] text-[#925a27] border border-[#cf9448]/30 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="size-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#2a1c12]">GDC-Registered Supervision</p>
              <p className="text-xs text-[#6b5848] mt-1 leading-relaxed">
                Full compliance with UK legal dental prescribing regulations.
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-white p-5 sm:p-6 border border-[#e2d4c0] flex items-center gap-4 shadow-sm">
            <div className="size-12 rounded-lg bg-amber-100 text-[#925a27] flex items-center justify-center flex-shrink-0">
              <Award className="size-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#2a1c12]">ACP Hydroxyapatite Seal</p>
              <p className="text-xs text-[#6b5848] mt-1 leading-relaxed">
                Active remineralization locks in brightness and prevents sensitivity.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
