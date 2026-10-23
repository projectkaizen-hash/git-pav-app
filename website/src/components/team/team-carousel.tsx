import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, ArrowRight, ShieldCheck, Sparkles, Award, Stethoscope } from "lucide-react";
import { Doctor } from "./team-data";
import { SunburstBadge } from "./sunburst-badge";

interface TeamCarouselProps {
  doctors: Doctor[];
  onSelect: (doctor: Doctor) => void;
}

export function TeamCarousel({ doctors, onSelect }: TeamCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  const currentDoctor = doctors[currentIndex];

  const paginate = useCallback(
    (newDirection: 1 | -1) => {
      setDirection(newDirection);
      setCurrentIndex((prev) => (prev + newDirection + doctors.length) % doctors.length);
    },
    [doctors.length],
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") paginate(1);
      if (e.key === "ArrowLeft") paginate(-1);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [paginate]);

  // Next 3 cascading doctors in stack
  const cascade1 = doctors[(currentIndex + 1) % doctors.length];
  const cascade2 = doctors[(currentIndex + 2) % doctors.length];
  const cascade3 = doctors[(currentIndex + 3) % doctors.length];

  const slideVariants: any = {
    enter: (dir: number) => ({
      x: dir > 0 ? 90 : -90,
      opacity: 0,
      scale: 0.95,
      filter: "blur(4px)",
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      filter: "blur(0px)",
      transition: {
        x: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.35 },
        scale: { duration: 0.35 },
      },
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -90 : 90,
      opacity: 0,
      scale: 0.95,
      filter: "blur(4px)",
      transition: {
        x: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.3 },
      },
    }),
  };

  const stackSlideVariants: any = {
    enter: (dir: number) => ({
      x: dir > 0 ? 50 : -50,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -50 : 50,
      opacity: 0,
      transition: { duration: 0.3 },
    }),
  };

  return (
    <section className="relative overflow-hidden bg-[#faf8f5] py-14 sm:py-20 lg:py-24">
      {/* Decorative ambient gradients */}
      <div className="pointer-events-none absolute -right-40 -top-40 size-[550px] rounded-full bg-gradient-to-br from-primary/[0.06] to-gold/[0.04] blur-[110px]" />
      <div className="pointer-events-none absolute -left-32 bottom-0 size-[450px] rounded-full bg-gradient-to-tr from-[#58715f]/[0.05] to-transparent blur-[90px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-14 xl:gap-20">
          {/* ─────────────────────────────────────────────────────────────
              LEFT COLUMN: Editorial Intro & Clinical Credentials (5 cols)
             ───────────────────────────────────────────────────────────── */}
          <div className="lg:col-span-5 lg:pr-4">
            {/* Top eyebrow badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/80 px-4 py-1.5 text-xs font-semibold tracking-wider uppercase text-primary shadow-xs backdrop-blur-xs">
              <Stethoscope className="size-3.5" />
              <span>Our Medical Specialists</span>
            </div>

            <h1 className="mt-6 font-display text-4xl font-bold tracking-tight text-fg sm:text-5xl lg:text-[3.25rem] lg:leading-[1.12]">
              Care Led by World-Class <span className="accent-text italic">Clinicians</span>
            </h1>

            <p className="mt-5 text-base leading-relaxed text-muted sm:text-lg">
              Each member of our medical faculty brings distinguished academic training, hospital
              appointments, and decades of collective experience in restorative, cosmetic, and
              preventive dentistry.
            </p>

            {/* Credential highlights */}
            <div className="mt-8 grid grid-cols-2 gap-4 border-y border-border/50 py-6">
              <div className="flex items-start gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-primary shadow-xs ring-1 ring-border/40">
                  <Award className="size-4" />
                </div>
                <div>
                  <p className="font-display text-lg font-bold text-fg">15+ Yrs</p>
                  <p className="text-xs text-muted">Average Practice</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-primary shadow-xs ring-1 ring-border/40">
                  <ShieldCheck className="size-4" />
                </div>
                <div>
                  <p className="font-display text-lg font-bold text-fg">CQC Regulated</p>
                  <p className="text-xs text-muted">Excellence Standards</p>
                </div>
              </div>
            </div>

            {/* Quick doctor list navigator */}
            <div className="mt-8">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                Quick Select Practitioner
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {doctors.map((doc, idx) => {
                  const isActive = idx === currentIndex;
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => {
                        setDirection(idx > currentIndex ? 1 : -1);
                        setCurrentIndex(idx);
                      }}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-primary text-white shadow-xs scale-105"
                          : "bg-white/80 text-muted border border-border/60 hover:border-primary/40 hover:text-fg"
                      }`}
                    >
                      {doc.firstName} {doc.lastName}
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="mt-8 text-xs text-muted/80 flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-primary" />
              <span>Click on any practitioner's photograph to view their complete clinical profile.</span>
            </p>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              RIGHT COLUMN: Hero Doctor + Cascading Stack Deck (7 cols)
             ───────────────────────────────────────────────────────────── */}
          <div className="lg:col-span-7 flex flex-col items-center lg:items-end">
            <div className="w-full max-w-[540px]">
              {/* Stack Container */}
              <div className="relative pb-4">
                {/* ── CASCADING BACKGROUND STACK (Desktop only: hidden md:block) ── */}
                <div className="hidden md:block">
                  <AnimatePresence custom={direction} initial={false}>
                    <motion.div
                      key={`stack-${currentIndex}`}
                      custom={direction}
                      variants={stackSlideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      className="absolute inset-0 pointer-events-none"
                    >
                      {/* Card 3 (Furthest, most faded) */}
                      <div
                        onClick={() => {
                          setDirection(1);
                          setCurrentIndex((currentIndex + 3) % doctors.length);
                        }}
                        className="pointer-events-auto cursor-pointer absolute right-0 top-3 h-[460px] lg:h-[500px] w-[340px] lg:w-[370px] translate-x-[90px] scale-[0.84] rounded-3xl overflow-hidden border border-white/40 shadow-md opacity-25 transition-transform duration-300 hover:scale-[0.87] hover:opacity-40"
                        title={`View ${cascade3.name}`}
                      >
                        <img
                          src={cascade3.photo}
                          alt={cascade3.name}
                          className="h-full w-full object-cover object-center grayscale-[30%]"
                        />
                      </div>

                      {/* Card 2 (Middle depth) */}
                      <div
                        onClick={() => {
                          setDirection(1);
                          setCurrentIndex((currentIndex + 2) % doctors.length);
                        }}
                        className="pointer-events-auto cursor-pointer absolute right-0 top-1.5 h-[460px] lg:h-[500px] w-[340px] lg:w-[370px] translate-x-[60px] scale-[0.91] rounded-3xl overflow-hidden border border-white/60 shadow-lg opacity-45 transition-transform duration-300 hover:scale-[0.94] hover:opacity-65"
                        title={`View ${cascade2.name}`}
                      >
                        <img
                          src={cascade2.photo}
                          alt={cascade2.name}
                          className="h-full w-full object-cover object-center grayscale-[15%]"
                        />
                      </div>

                      {/* Card 1 (Directly behind hero) */}
                      <div
                        onClick={() => {
                          setDirection(1);
                          setCurrentIndex((currentIndex + 1) % doctors.length);
                        }}
                        className="pointer-events-auto cursor-pointer absolute right-0 top-0 h-[460px] lg:h-[500px] w-[340px] lg:w-[370px] translate-x-[30px] scale-[0.96] rounded-3xl overflow-hidden border border-white/80 shadow-xl opacity-70 transition-transform duration-300 hover:scale-[0.98] hover:opacity-85"
                        title={`View ${cascade1.name}`}
                      >
                        <img
                          src={cascade1.photo}
                          alt={cascade1.name}
                          className="h-full w-full object-cover object-center"
                        />
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* ── HERO DOCTOR PHOTO CARD (Front of stack) ── */}
                <div className="relative z-30 w-full md:w-[380px] lg:w-[410px]">
                  <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                      key={currentDoctor.id}
                      custom={direction}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      className="group relative cursor-pointer overflow-hidden rounded-3xl border border-white/80 bg-white shadow-[0_24px_50px_-12px_rgba(42,28,18,0.22)] transition-shadow duration-300 hover:shadow-[0_32px_64px_-16px_rgba(42,28,18,0.28)]"
                      onClick={() => onSelect(currentDoctor)}
                    >
                      {/* Photo: ~4:5 ratio with Shared layoutId */}
                      <motion.div
                        layoutId={`doctor-photo-${currentDoctor.id}`}
                        className="relative aspect-[4/5] w-full overflow-hidden bg-[#e8e4dc]"
                      >
                        <img
                          src={currentDoctor.photo}
                          alt={currentDoctor.name}
                          className="h-full w-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
                          loading="eager"
                        />

                        {/* Subtle gradient vignette at bottom of photo */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-40" />

                        {/* ── SUNBURST / SEAL BADGE (Fades in on hover with diagonal arrow ↗) ── */}
                        <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-300 scale-95 group-hover:scale-100 backdrop-blur-[2px]">
                          <SunburstBadge
                            variant="glass"
                            size={126}
                            onClick={() => onSelect(currentDoctor)}
                          />
                        </div>

                        {/* Mobile tap prompt */}
                        <div className="absolute bottom-3 right-3 md:hidden rounded-full bg-black/60 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-xs">
                          Tap to view profile ↗
                        </div>
                      </motion.div>
                    </motion.div>
                  </AnimatePresence>

                  {/* ── BELOW PHOTO: Doctor Name in Serif & Specialty Tags ── */}
                  <div className="mt-5">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentDoctor.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.28 }}
                        className="space-y-2.5"
                      >
                        {/* Doctor's name in serif with shared layoutId */}
                        <motion.h3
                          layoutId={`doctor-name-${currentDoctor.id}`}
                          onClick={() => onSelect(currentDoctor)}
                          className="cursor-pointer font-display text-2xl sm:text-3xl font-bold tracking-tight text-fg transition-colors hover:text-primary"
                        >
                          {currentDoctor.name}
                        </motion.h3>

                        {/* 1-2 Pill-shaped Specialty Tags */}
                        <div className="flex flex-wrap items-center gap-2">
                          {currentDoctor.tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center rounded-full border border-[#58715f]/25 bg-[#edf3ef] px-3 py-1 text-[11px] font-semibold tracking-wider uppercase text-[#354f3d] shadow-2xs"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </motion.div>
                    </AnimatePresence>

                    {/* ── CONTROLS: Circular arrow buttons (← →) + Fraction Counter ("1/8") ── */}
                    <div className="mt-6 flex items-center justify-between border-t border-border/60 pt-4">
                      {/* Left: circular arrow buttons */}
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => paginate(-1)}
                          className="group flex size-11 items-center justify-center rounded-full border border-border/70 bg-white text-fg shadow-2xs transition-all duration-200 hover:border-primary hover:bg-primary hover:text-white hover:shadow-sm active:scale-95"
                          aria-label="Previous doctor"
                        >
                          <ArrowLeft className="size-4.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => paginate(1)}
                          className="group flex size-11 items-center justify-center rounded-full border border-border/70 bg-white text-fg shadow-2xs transition-all duration-200 hover:border-primary hover:bg-primary hover:text-white hover:shadow-sm active:scale-95"
                          aria-label="Next doctor"
                        >
                          <ArrowRight className="size-4.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                        </button>
                      </div>

                      {/* Right: fraction counter bottom-right ("1/8") */}
                      <div className="flex items-baseline gap-1 font-mono text-sm tracking-tight text-muted">
                        <span className="font-display text-xl font-bold text-fg">
                          {currentIndex + 1}
                        </span>
                        <span className="text-xs text-muted/60">/</span>
                        <span className="text-sm font-medium text-muted">
                          {doctors.length}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

