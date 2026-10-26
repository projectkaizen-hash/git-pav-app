import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Doctor } from "./team-data";
import { useDoctors } from "./use-doctors";
import { TeamCarousel } from "./team-carousel";
import { DoctorProfile } from "./doctor-profile";

export function TeamPage() {
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const { doctors, loading } = useDoctors();

  const handleSelectDoctor = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBackToCarousel = () => {
    setSelectedDoctor(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="relative min-h-[80vh] w-full overflow-hidden">
      <AnimatePresence mode="wait">
        {selectedDoctor ? (
          <motion.div
            key={`profile-${selectedDoctor.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <DoctorProfile
              doctor={selectedDoctor}
              onBack={handleBackToCarousel}
            />
          </motion.div>
        ) : doctors.length === 0 ? (
          <div key="empty" className="mx-auto max-w-xl px-6 py-32 text-center text-muted">
            {loading ? "Loading our team…" : "Our team page is being updated. Please check back soon."}
          </div>
        ) : (
          <motion.div
            key="carousel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <TeamCarousel
              doctors={doctors}
              onSelect={handleSelectDoctor}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

