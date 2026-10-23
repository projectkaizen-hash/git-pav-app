import React, { useState } from "react";
import { Play, X, FileText, Clock, Check } from "lucide-react";

const STEPS = [
  {
    icon: FileText,
    title: "Review the consent form",
    desc: "Read the documented risks, benefits and aftercare before treatment begins.",
  },
  {
    icon: Clock,
    title: "Watch the procedure walkthrough",
    desc: "Our lead dentist explains exactly what happens during your extraction.",
  },
  {
    icon: Check,
    title: "Sign & be seen",
    desc: "Once consent is given, you proceed directly into your appointment.",
  },
];

export function ExtractionVideo() {
  const [playing, setPlaying] = useState(false);

  return (
    <section className="py-20 sm:py-28 bg-[#2a1c12] border-b border-[#3d2a1d]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <h2 className="font-display text-3xl sm:text-5xl font-bold text-white leading-tight">
            Informed Consent for Tooth Extraction
          </h2>
          <p className="mt-4 text-white/60 max-w-2xl text-sm sm:text-base leading-relaxed">
            Before any extraction, we ensure every patient fully understands
            the procedure, risks, alternatives and what to expect during recovery.
          </p>
        </div>

        {/* Video player */}
        <div className="rounded-xl overflow-hidden border border-[#523825] shadow-xl">
          <div className="relative aspect-video bg-[#2a1c12] group">
            {playing ? (
              <>
                <video
                  src="/media/clinic-reel.mp4"
                  autoPlay
                  controls
                  loop
                  className="size-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setPlaying(false)}
                  className="absolute top-4 right-4 z-20 size-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black"
                >
                  <X className="size-4" />
                </button>
              </>
            ) : (
              <>
                <img
                  src="https://images.unsplash.com/photo-1609208272522-82d1af6bfb73?auto=format&fit=crop&w=1400&q=85"
                  alt="Dentist explaining extraction procedure"
                  className="size-full object-cover opacity-70"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                {/* Lower-third */}
                <div className="absolute bottom-6 left-6 right-6 text-left">
                  <span className="inline-flex items-center gap-1.5 bg-[#925a27] px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase text-white mb-2">
                    Consent Video
                  </span>
                  <p className="font-display text-lg sm:text-2xl font-bold text-white">
                    What Happens During a Tooth Extraction
                  </p>
                  <p className="hidden sm:block text-xs text-white/60 mt-1">
                    Dr. Hussain walks through the process, anaesthetic options and recovery timeline.
                  </p>
                </div>

                {/* Play button */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => setPlaying(true)}
                    className="relative flex size-20 sm:size-24 items-center justify-center rounded-full bg-[#cf9448]/90 text-white shadow-xl hover:scale-110 hover:bg-[#cf9448] transition-all duration-300"
                    aria-label="Play consent video"
                  >
                    <span className="absolute inset-0 rounded-full bg-[#cf9448] animate-ping opacity-20" />
                    <Play className="size-8 sm:size-10 fill-current translate-x-1" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

       
      </div>
    </section>
  );
}
