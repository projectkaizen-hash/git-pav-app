import React from "react";
import { motion } from "motion/react";

const testimonials = [
  {
    text: "Dr Hussain has an incredible eye for facial balance and natural aesthetics. My lips and subtle cheek contouring look so refreshed and soft — not a single person guessed I had filler; they just keep telling me how well I look!",
    name: "Amina K.",
    role: "Lip & Cheek Contouring",
  },
  {
    text: "I was hesitant about having anti-wrinkle injections for the first time, but being in a sterile clinical dental practice put me completely at ease. The gentle technique was virtually painless, and the complimentary 2-week review was so reassuring.",
    name: "Chloe T.",
    role: "Anti-Wrinkle Treatment",
  },
  {
    text: "The results exceeded my expectations. Natural-looking enhancement that boosted my confidence without looking overdone. Highly recommend for anyone considering facial aesthetics.",
    name: "Sarah M.",
    role: "Dermal Fillers",
  },
  {
    text: "Professional consultation with honest advice. Dr Hussain explained what would work best for my face shape rather than pushing unnecessary treatments.",
    name: "Emma L.",
    role: "Consultation",
  },
  {
    text: "After having treatment elsewhere, I came here for correction. The difference in expertise and natural results was remarkable. Worth every penny.",
    name: "Rachel P.",
    role: "Correction Treatment",
  },
  {
    text: "The clinical setting gave me complete confidence. Sterile environment, thorough aftercare, and results that look like me, just refreshed.",
    name: "Jennifer H.",
    role: "Profile Balancing",
  },
];

const TestimonialsColumn = (props: {
  className?: string;
  testimonials: typeof testimonials;
  duration?: number;
}) => {
  return (
    <div className={props.className}>
      <motion.div
        animate={{
          translateY: "-50%",
        }}
        transition={{
          duration: props.duration || 10,
          repeat: Infinity,
          ease: "linear",
          repeatType: "loop",
        }}
        className="flex flex-col gap-6 pb-6"
      >
        {[
          ...new Array(2).fill(0).map((_, index) => (
            <React.Fragment key={index}>
              {props.testimonials.map(({ text, name, role }, i) => (
                <div className="p-10 rounded-2xl glass w-full" key={i}>
                  <div className="text-fg">{text}</div>
                  <div className="flex items-center gap-3 mt-5">
                    <div className="grid size-10 place-items-center rounded-full bg-elevated text-sm font-medium text-primary">
                      {name.charAt(0)}
                    </div>
                    <div className="flex flex-col">
                      <div className="font-medium text-fg">{name}</div>
                      <div className="text-sm text-muted">{role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </React.Fragment>
          )),
        ]}
      </motion.div>
    </div>
  );
};

const firstColumn = testimonials.slice(0, 3);
const secondColumn = testimonials.slice(3, 6);

export function AestheticsTestimonials() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="font-display text-3xl sm:text-5xl font-bold text-[#2a1c12]">
            Real Patient Experiences
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#6b5848] leading-relaxed">
            Genuine testimonials from clients who trust our clinical precision for their facial aesthetic journey.
          </p>
        </div>

        <div className="flex justify-center gap-6 mt-10 [mask-image:linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)] max-h-[740px] overflow-hidden">
          <TestimonialsColumn testimonials={firstColumn} duration={15} />
          <TestimonialsColumn testimonials={secondColumn} className="hidden md:block" duration={19} />
        </div>
      </div>
    </section>
  );
}
