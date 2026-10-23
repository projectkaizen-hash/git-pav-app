import React, { useState } from "react";
import { Play, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function WhiteningVideo() {
  const [videoOpen, setVideoOpen] = useState(false);

  return (
    <section id="clinical-video" className="py-20 sm:py-28 bg-[#2a1c12] text-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          {/* Left Text / Info */}
          <div className="lg:col-span-6">
            <h2 className="font-display text-3xl sm:text-5xl font-bold mb-4 leading-tight">
Informed Consent for Tooth Whitening
            </h2>

            <p className="text-sm sm:text-base text-white/80 leading-relaxed mb-8 max-w-2xl">
              how laboratory-created  a watertight mechanical seal.
            </p>

            <div className="space-y-3.5 mb-10">
              {[
                "Graduated carbamide peroxide concentration tailored.",
                "Includes remineralizing ACP serum to eliminate post-treatment.",
                "Full GDC-registered clinical oversight with pre-treatment oral.",
              ].map((point) => (
                <div key={point} className="flex items-start gap-3 text-sm text-white/90">
                  <CheckCircle2 className="size-5 text-[#cf9448] flex-shrink-0 mt-0.5" />
                  <span className="leading-snug">{point}</span>
                </div>
              ))}
            </div>

            <Button
              onClick={() => setVideoOpen(!videoOpen)}
              className="accent-gradient rounded-full px-8 h-12 text-sm font-bold text-white shadow-sm flex items-center gap-2.5 hover:opacity-95"
            >
              <Play className="size-4 fill-current" />
              {videoOpen ? "Close Video Player" : "Watch 3-Min Doctor Video"}
            </Button>
          </div>

          {/* Right Video / Poster Player (Clean rounded-xl) */}
          <div className="lg:col-span-6">
            <div className="relative rounded-xl overflow-hidden aspect-video sm:aspect-[4/3] border border-white/20 shadow-xl bg-[#2a1c12]">
              {videoOpen ? (
                <div className="relative size-full">
                  <video
                    src="/media/clinic-reel.mp4"
                    autoPlay
                    controls
                    className="size-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setVideoOpen(false)}
                    className="absolute top-3 right-3 z-20 size-8 rounded-full bg-black/80 text-white flex items-center justify-center hover:bg-black"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <>
                  <img
                    src="https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=800&q=85"
                    alt="Dr Hussain discussing clinical whitening safety"
                    className="size-full object-cover opacity-85"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => setVideoOpen(true)}
                      aria-label="Play doctor consultation video"
                      className="size-16 sm:size-20 rounded-full bg-[#cf9448] text-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
                    >
                      <Play className="size-7 sm:size-8 fill-current translate-x-0.5" />
                    </button>
                  </div>
                  <div className="absolute bottom-4 inset-x-5 flex items-center justify-between text-xs font-bold text-white">
                    <span>Dr. M. Hussain &bull; Lead Dental Surgeon</span>
                    <span className="bg-black/60 px-2 py-0.5 rounded text-[11px] font-mono">3:24 mins</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
