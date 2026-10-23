import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { DOCTORS, Doctor } from "./team-data";
import { TeamCarousel } from "./team-carousel";
import { DoctorProfile } from "./doctor-profile";

export function TeamPage() {
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

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
        ) : (
          <motion.div
            key="carousel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <TeamCarousel
              doctors={DOCTORS}
              onSelect={handleSelectDoctor}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

