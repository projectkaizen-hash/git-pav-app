import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  Calendar,
  Globe,
  MapPin,
  CheckCircle2,
  Phone,
  Clock,
  Sparkles,
  Award,
} from "lucide-react";
import { Doctor } from "./team-data";
import { SunburstBadge } from "./sunburst-badge";
import { Button } from "@/components/ui/button";

interface DoctorProfileProps {
  doctor: Doctor;
  onBack: () => void;
}

export function DoctorProfile({ doctor, onBack }: DoctorProfileProps) {
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);

  const handleOpenBooking = () => {
    setShowBookingModal(true);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ─────────────────────────────────────────────────────────────
          TOP BAND (Cream background)
          Specialty tags centered at top, then large serif headline:
          Doctor's first name italicized in sage and last name + credential in black
         ───────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#faf6f0] border-b border-border/40 pb-12 pt-10 sm:pb-16 sm:pt-14">
        {/* Subtle decorative wash */}
        <div className="pointer-events-none absolute -left-32 -top-32 size-[400px] rounded-full bg-[#58715f]/[0.05] blur-[80px]" />
        <div className="pointer-events-none absolute -right-32 top-0 size-[400px] rounded-full bg-gold/[0.04] blur-[80px]" />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          {/* Back button */}
          <div className="mb-8 flex items-center justify-between">
            <button
              type="button"
              onClick={onBack}
              className="group inline-flex items-center gap-2 rounded-full border border-border/70 bg-white/90 px-4 py-2 text-xs font-semibold text-fg shadow-2xs backdrop-blur-xs transition-all duration-200 hover:border-primary hover:bg-primary hover:text-white"
            >
              <ArrowLeft className="size-3.5 transition-transform duration-200 group-hover:-translate-x-1" />
              <span>Back to all doctors</span>
            </button>

            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-muted">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              Accepting new patients
            </span>
          </div>

          {/* Specialty Tags Centered at Top */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5"
          >
            {doctor.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full border border-[#58715f]/30 bg-[#edf3ef] px-4 py-1.5 text-xs font-semibold tracking-wider uppercase text-[#354f3d] shadow-2xs"
              >
                {tag}
              </span>
            ))}
          </motion.div>

          {/* Large Serif Headline with First Name Italicized in Sage, Last Name in Black */}
          <motion.div
            layoutId={`doctor-name-${doctor.id}`}
            className="mt-6 text-center"
          >
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-[4.25rem] font-bold tracking-tight text-fg leading-[1.1]">
              <span className="italic font-normal text-[#4a6b57]">
                {doctor.firstName}
              </span>{" "}
              <span>
                {doctor.lastName}, {doctor.credential}
              </span>
            </h1>
          </motion.div>

          <p className="mx-auto mt-4 max-w-xl text-center text-sm sm:text-base text-muted">
            Consultant in {doctor.tags[0].toLowerCase()} and restorative patient care at PavDental
          </p>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          FULL-WIDTH TWO-COLUMN SECTION
          Left: Large Photo (doctor at a desk / clinic)
          Right: Sage-Green Panel containing:
            - Short bio paragraph (affiliations, where born, languages spoken)
            - Rotating sunburst "SCHEDULE AN APPOINTMENT" badge (top-right)
            - Two stat callouts at bottom:
              large serif number + label ("12 — Years in practice", "4.8 — Average rating on Healthgrades")
         ───────────────────────────────────────────────────────────── */}
      <section className="py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12 lg:gap-10">
            {/* ── LEFT COLUMN: Large Photo (Doctor at a desk / clinic) ── */}
            <div className="lg:col-span-6 flex flex-col">
              <motion.div
                layoutId={`doctor-photo-${doctor.id}`}
                className="group relative h-full min-h-[460px] sm:min-h-[540px] w-full overflow-hidden rounded-3xl border border-border/40 bg-[#f4f1ea] shadow-[0_20px_50px_-15px_rgba(42,28,18,0.18)]"
              >
                <img
                  src={doctor.deskPhoto || doctor.photo}
                  alt={`${doctor.name} at desk`}
                  className="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                />

                {/* Subtle vignette */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

                {/* Overlaid caption badge */}
                <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between rounded-2xl border border-white/30 bg-black/40 p-4 text-white backdrop-blur-md">
                  <div>
                    <p className="font-display text-base font-bold">{doctor.name}</p>
                    <p className="text-xs text-white/80">Clinical Consultation Desk · Bradford</p>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur-xs">
                    <Sparkles className="size-3 text-gold" />
                    <span>Active Faculty</span>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* ── RIGHT COLUMN: Sage-Green Panel ── */}
            <div className="lg:col-span-6 flex flex-col">
              <motion.div
                initial={{ opacity: 0, x: 25 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="relative flex h-full flex-col justify-between overflow-hidden rounded-3xl bg-[#3d5244] p-8 text-[#f8f5ef] shadow-[0_24px_60px_-16px_rgba(30,45,35,0.35)] sm:p-10 lg:p-12"
              >
                {/* Subtle ambient lighting inside the sage panel */}
                <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-[#58715f]/30 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-24 -left-24 size-72 rounded-full bg-black/20 blur-3xl" />

                {/* ── TOP-RIGHT: Rotating Sunburst "SCHEDULE AN APPOINTMENT" Badge ── */}
                <div className="absolute top-6 right-6 sm:top-8 sm:right-8 z-20">
                  <SunburstBadge
                    variant="sage"
                    size={116}
                    onClick={handleOpenBooking}
                  />
                </div>

                {/* Upper portion: Editorial Bio */}
                <div className="relative z-10 pr-24 sm:pr-28">
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#f8f5ef]/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#f8f5ef]/90">
                    <Award className="size-3 text-gold" />
                    <span>Clinical Profile</span>
                  </span>

                  <h2 className="mt-4 font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#f8f5ef]">
                    Philosophy of Care
                  </h2>

                  {/* Short bio paragraph (affiliations, where born, languages spoken) */}
                  <p className="mt-5 text-base sm:text-lg leading-relaxed text-[#f8f5ef]/90 font-light">
                    {doctor.bio}
                  </p>

                  {/* Structured metadata list: Born, Languages, Key Affiliations */}
                  <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-[#f8f5ef]/15 pt-6 text-xs text-[#f8f5ef]/80">
                    <div className="flex items-start gap-2.5">
                      <MapPin className="size-4 shrink-0 text-gold mt-0.5" />
                      <div>
                        <span className="block font-semibold uppercase tracking-wider text-[10px] text-[#f8f5ef]/60">
                          Origins
                        </span>
                        <span className="font-medium text-[#f8f5ef]">{doctor.born}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <Globe className="size-4 shrink-0 text-gold mt-0.5" />
                      <div>
                        <span className="block font-semibold uppercase tracking-wider text-[10px] text-[#f8f5ef]/60">
                          Languages Spoken
                        </span>
                        <span className="font-medium text-[#f8f5ef]">
                          {doctor.languages.join(", ")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Key Clinical Affiliations */}
                  <div className="mt-6 border-t border-[#f8f5ef]/15 pt-5">
                    <span className="block font-semibold uppercase tracking-wider text-[10px] text-[#f8f5ef]/60 mb-2">
                      Fellowships & Affiliations
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {doctor.affiliations.map((affil) => (
                        <span
                          key={affil}
                          className="rounded-lg border border-[#f8f5ef]/20 bg-white/5 px-2.5 py-1 text-[11px] text-[#f8f5ef]/90"
                        >
                          {affil}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── BOTTOM STAT CALLOUTS + Direct Booking Button ── */}
                <div className="relative z-10 mt-10 border-t border-[#f8f5ef]/20 pt-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
                    {/* Stat 1: Large serif number + label */}
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-white">
                          {doctor.yearsInPractice}
                        </span>
                        <span className="text-xl text-gold font-light">—</span>
                      </div>
                      <p className="mt-1 text-xs sm:text-sm font-medium uppercase tracking-wider text-[#f8f5ef]/80">
                        Years in practice
                      </p>
                    </div>

                    {/* Stat 2: Large serif number + rating source as underlined link */}
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-white">
                          {doctor.rating}
                        </span>
                        <span className="text-xl text-gold font-light">—</span>
                      </div>
                      <p className="mt-1 text-xs sm:text-sm font-medium uppercase tracking-wider text-[#f8f5ef]/80">
                        Average rating on{" "}
                        <a
                          href={doctor.ratingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline underline-offset-4 decoration-[#f8f5ef]/50 hover:decoration-white hover:text-white transition-colors"
                        >
                          {doctor.ratingSource}
                        </a>
                      </p>
                    </div>
                  </div>

                  {/* Primary CTA button */}
                  <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
                    <Button
                      onClick={handleOpenBooking}
                      size="lg"
                      className="w-full sm:w-auto bg-[#f8f5ef] text-[#293b2f] hover:bg-white hover:text-primary font-semibold shadow-md gap-2"
                    >
                      <Calendar className="size-4" />
                      <span>Book Consultation with Dr. {doctor.lastName}</span>
                    </Button>

                    <Button
                      asChild
                      variant="outline"
                      size="lg"
                      className="w-full sm:w-auto border-[#f8f5ef]/30 bg-transparent text-[#f8f5ef] hover:bg-white/10 hover:text-white"
                    >
                      <a href="tel:08001938786">
                        <Phone className="size-4" />
                        <span>Call 0800 1938 786</span>
                      </a>
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SCHEDULE AN APPOINTMENT MODAL (Prompted by seal badge or button)
         ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showBookingModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => setShowBookingModal(false)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl"
            >
              {bookingSuccess ? (
                <div className="py-6 text-center">
                  <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <CheckCircle2 className="size-7" />
                  </div>
                  <h3 className="mt-4 font-display text-2xl font-bold text-fg">
                    Appointment Requested
                  </h3>
                  <p className="mt-2 text-sm text-muted">
                    We have reserved your inquiry for <strong>{doctor.name}</strong>. Our clinical
                    reception will contact you within 30 minutes to confirm your preferred slot.
                  </p>
                  <Button
                    onClick={() => {
                      setBookingSuccess(false);
                      setShowBookingModal(false);
                    }}
                    className="mt-6"
                  >
                    Close Window
                  </Button>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setBookingSuccess(true);
                  }}
                  className="space-y-4"
                >
                  <div className="border-b border-border/50 pb-4">
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                      Direct Appointment
                    </span>
                    <h3 className="font-display text-2xl font-bold text-fg">
                      Schedule with {doctor.name}
                    </h3>
                    <p className="text-xs text-muted mt-1">
                      {doctor.tags.join(" · ")}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-fg/80 mb-1">
                        First Name
                      </label>
                      <input
                        required
                        placeholder="Sarah"
                        className="w-full rounded-xl border border-border/80 bg-[#faf8f5] px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-fg/80 mb-1">
                        Last Name
                      </label>
                      <input
                        required
                        placeholder="Jenkins"
                        className="w-full rounded-xl border border-border/80 bg-[#faf8f5] px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-fg/80 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="sarah@example.com"
                      className="w-full rounded-xl border border-border/80 bg-[#faf8f5] px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-fg/80 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+44 7311 871 456"
                      className="w-full rounded-xl border border-border/80 bg-[#faf8f5] px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-fg/80 mb-1">
                      Preferred Date / Reason
                    </label>
                    <input
                      placeholder="e.g. Next Tuesday morning - Consultation"
                      className="w-full rounded-xl border border-border/80 bg-[#faf8f5] px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Clock className="size-3.5 text-primary" />
                    <span className="text-xs text-muted">Typical clinic response time: &lt; 30 mins</span>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setShowBookingModal(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      Confirm Request
                    </Button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

