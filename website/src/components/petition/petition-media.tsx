import { useState } from "react";
import { Play, Volume2, VolumeX, X, AlertTriangle, Tv, CheckCircle } from "lucide-react";

export function PetitionMedia() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  return (
    <section className="py-16 sm:py-24 bg-white">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 text-center">
        {/* Title */}
        <h2 className="font-display text-3xl sm:text-4xl lg:text-[2.6rem] font-bold text-[#844d1e] tracking-tight">
          Petition for NHS Dental Funding in Bradford
        </h2>
        <p className="mt-3 text-sm sm:text-base text-muted max-w-2xl mx-auto">
          As seen on national and regional broadcasts highlighting the devastating consequences of NHS dental shortages across West Yorkshire.
        </p>

        {/* ── BROADCAST VIDEO FRAME ── */}
        <div className="mt-10 max-w-4xl mx-auto overflow-hidden rounded-3xl border border-border/70 bg-black shadow-2xl">
          <div className="relative aspect-video w-full bg-[#1c1815] overflow-hidden group">
            {isPlaying ? (
              <div className="relative size-full">
                <video
                  src="/media/clinic-reel.mp4"
                  autoPlay
                  controls
                  loop
                  muted={isMuted}
                  className="size-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setIsPlaying(false)}
                  className="absolute top-4 right-4 z-20 flex size-9 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black"
                  aria-label="Close video"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <>
                {/* News broadcast snapshot mockup */}
                <img
                  src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1400&q=85"
                  alt="News Broadcast Interview on NHS Dental Crisis"
                  className="size-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-105"
                />

                {/* Broadcast Lower Third Bar */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-4 sm:p-6 text-left">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="inline-flex items-center gap-1.5 rounded-sm bg-[#d9383a] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
                      <Tv className="size-3" />
                      Special Report
                    </span>
                    <span className="text-[11px] font-medium text-white/80">BBC Look North / ITV News</span>
                  </div>
                  <p className="font-display text-base sm:text-xl md:text-2xl font-bold text-white tracking-tight">
                    DENTIST ACCESS: PATIENTS RESORTING TO DIY EXTRACTIONS
                  </p>
                  <p className="hidden sm:block text-xs text-white/80 mt-1">
                    Bradford resident Linda speaks on waiting over 3 years for emergency NHS care and why fair clinic funding is vital.
                  </p>
                </div>

                {/* Big Center Play Button */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => setIsPlaying(true)}
                    className="group/btn relative flex size-20 sm:size-24 items-center justify-center rounded-full bg-[#b77436]/90 text-white shadow-2xl backdrop-blur-xs transition-all duration-300 hover:scale-110 hover:bg-[#cf9448] active:scale-95"
                    aria-label="Play broadcast report"
                  >
                    {/* Pulsing ring */}
                    <span className="absolute inset-0 rounded-full bg-[#b77436] animate-ping opacity-25" />
                    <Play className="size-8 sm:size-10 fill-current translate-x-1" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Crisis facts summary cards below video */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-5 text-left max-w-4xl mx-auto">
          <div className="rounded-2xl border border-border/60 bg-[#faf6f0] p-5">
            <div className="flex items-center gap-2 text-[#b77436] font-semibold text-xs uppercase tracking-wider">
              <AlertTriangle className="size-4" />
              <span>80%+ Shortage</span>
            </div>
            <p className="mt-2 text-sm text-fg font-bold">Closed NHS Books</p>
            <p className="mt-1 text-xs text-muted leading-relaxed">
              Over 8 out of 10 dental practices in West Yorkshire are entirely unable to register new adult NHS patients.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-[#faf6f0] p-5">
            <div className="flex items-center gap-2 text-[#b77436] font-semibold text-xs uppercase tracking-wider">
              <AlertTriangle className="size-4" />
              <span>Child Dental Health</span>
            </div>
            <p className="mt-2 text-sm text-fg font-bold">Highest Decay Rates</p>
            <p className="mt-1 text-xs text-muted leading-relaxed">
              Bradford has one of the highest tooth decay rates among five-year-olds in England due to missed check-ups.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-[#faf6f0] p-5">
            <div className="flex items-center gap-2 text-[#354f3d] font-semibold text-xs uppercase tracking-wider">
              <CheckCircle className="size-4 text-emerald-600" />
              <span>Our Solution</span>
            </div>
            <p className="mt-2 text-sm text-fg font-bold">Mobile & Local Units</p>
            <p className="mt-1 text-xs text-muted leading-relaxed">
              Petitioning for mobile community crisis units and reformed NHS contracts so local practices can serve everyone.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

