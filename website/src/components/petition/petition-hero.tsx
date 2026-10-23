import { HeartHandshake, PenTool, Share2, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PetitionHeroProps {
  onScrollToSign: () => void;
  onOpenShare: () => void;
}

export function PetitionHero({ onScrollToSign, onOpenShare }: PetitionHeroProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#faf6f0] to-white pb-16 pt-12 sm:pb-20 sm:pt-16">
      {/* Decorative background glows */}
      <div className="pointer-events-none absolute -left-40 -top-40 size-[500px] rounded-full bg-primary/[0.05] blur-3xl" />
      <div className="pointer-events-none absolute -right-40 top-20 size-[500px] rounded-full bg-gold/[0.05] blur-3xl" />

      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 text-center">
        {/* Eyebrow in crimson/coral */}
        <div className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold tracking-wider text-[#d9383a] uppercase">
          <HeartHandshake className="size-4" />
          <span>Community Action</span>
        </div>

        {/* Headline */}
        <h1 className="mt-4 font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#2a1c12] leading-[1.12]">
          NHS Dental Funding Petition
        </h1>

        {/* Subtitle */}
        <p className="mt-3 text-xs sm:text-sm font-medium tracking-wide text-muted">
          — Petition to NHS England / Department of Health and Social Care —
        </p>

        {/* Body narrative */}
        <p className="mt-6 text-sm sm:text-base leading-relaxed text-muted max-w-2xl mx-auto">
          Due to a severe nationwide NHS dental crisis, millions of patients are unable to find routine or emergency dental appointments. Experience from our community in Bradford shows that thousands of families and children are suffering through preventable dental pain. We are petitioning parliament and health authorities to urgently increase NHS dental capacity, fund mobile dental units, and fairly compensate NHS dentists so clinic doors can remain open to all.
        </p>

        {/* Motto */}
        <p className="mt-5 text-sm sm:text-base font-semibold text-[#844d1e]">
          Together we can improve access to urgent dental care.
        </p>

        {/* Action buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <Button
            onClick={onScrollToSign}
            size="lg"
            className="accent-gradient text-white font-semibold text-sm px-8 shadow-sm hover:opacity-95 transition-all gap-2 w-full sm:w-auto"
          >
            <PenTool className="size-4" />
            <span>Sign the Petition</span>
          </Button>

          <Button
            onClick={onOpenShare}
            variant="outline"
            size="lg"
            className="bg-white border-border/80 text-fg hover:bg-[#faf6f0] text-sm font-medium px-7 shadow-2xs gap-2 w-full sm:w-auto"
          >
            <Share2 className="size-4 text-primary" />
            <span>Share with Others</span>
          </Button>
        </div>

        {/* ── TWO ACTION CARDS ── */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 gap-5 text-left max-w-3xl mx-auto">
          {/* Card 1: Sign */}
          <div
            onClick={onScrollToSign}
            className="group cursor-pointer rounded-2xl border border-border/60 bg-white/90 p-6 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-[#faf6f0] text-primary border border-primary/20 transition-colors group-hover:bg-primary group-hover:text-white">
                <PenTool className="size-4.5" />
              </div>
              <h3 className="font-display text-lg font-bold text-fg group-hover:text-primary transition-colors">
                Sign the Petition
              </h3>
            </div>
            <p className="mt-3 text-xs sm:text-sm text-muted leading-relaxed">
              Add your name to our growing list of supporters demanding fair funding and urgent NHS dental access in Bradford.
            </p>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary">
              <span>Sign now</span>
              <ArrowRight className="size-3 transition-transform duration-200 group-hover:translate-x-1" />
            </div>
          </div>

          {/* Card 2: Share */}
          <div
            onClick={onOpenShare}
            className="group cursor-pointer rounded-2xl border border-border/60 bg-white/90 p-6 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-[#faf6f0] text-primary border border-primary/20 transition-colors group-hover:bg-primary group-hover:text-white">
                <Share2 className="size-4.5" />
              </div>
              <h3 className="font-display text-lg font-bold text-fg group-hover:text-primary transition-colors">
                Share with Others
              </h3>
            </div>
            <p className="mt-3 text-xs sm:text-sm text-muted leading-relaxed">
              Spread the word on social media, via WhatsApp, or with family and friends to help reach our target of 5,000 voices.
            </p>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary">
              <span>Share link</span>
              <ArrowRight className="size-3 transition-transform duration-200 group-hover:translate-x-1" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
