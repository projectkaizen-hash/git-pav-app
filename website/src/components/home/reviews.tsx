import React from "react";
import { motion } from "motion/react";

const testimonials = [
  {
    text: "Best dentist I've ever been to. Welcoming staff. I've always had a fear of dentists — they explained everything first so I had no worries.",
    name: "Verified patient",
    role: "First-time visit",
  },
  {
    text: "Reception were calm and polite. The dentist was patient and gave excellent aftercare. I left reassured, not rushed.",
    name: "Verified patient",
    role: "Emergency appointment",
  },
  {
    text: "Same-day treatment when I needed it most. Clear fees, no surprises, and a team that actually listens.",
    name: "Verified patient",
    role: "24/7 care",
  },
  {
    text: "The calm atmosphere made all the difference. No rushing, clear explanations, and genuine care throughout my visit.",
    name: "Verified patient",
    role: "Regular check-up",
  },
  {
    text: "Emergency care at 2am was handled professionally. Pain relieved quickly with proper follow-up instructions.",
    name: "Verified patient",
    role: "Urgent treatment",
  },
  {
    text: "Mobile service was a lifesaver. They came to my care home with all equipment needed for a thorough examination.",
    name: "Verified patient",
    role: "Home visit",
  },
  {
    text: "Whitening results exceeded expectations. No sensitivity, clear guidance, and the shade matching was perfect.",
    name: "Verified patient",
    role: "Cosmetic treatment",
  },
  {
    text: "Surgery was explained step-by-step. Recovery was smooth with excellent aftercare support available 24/7.",
    name: "Verified patient",
    role: "Oral surgery",
  },
  {
    text: "Insurance handling was seamless. They dealt directly with my provider, making the whole process stress-free.",
    name: "Verified patient",
    role: "General dentistry",
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
const thirdColumn = testimonials.slice(6, 9);

export function Reviews() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true }}
          className="flex flex-col items-center justify-center max-w-[540px] mx-auto"
        >
          <p className="text-xs font-medium text-primary">Voices</p>

          <h2 className="mt-3 font-display text-3xl sm:text-4xl">
            What people say
          </h2>
          <p className="text-center mt-4 text-muted">
            See what our patients have to say about us.
          </p>
        </motion.div>

        <div className="flex justify-center gap-6 mt-10 [mask-image:linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)] max-h-[740px] overflow-hidden">
          <TestimonialsColumn testimonials={firstColumn} duration={15} />
          <TestimonialsColumn testimonials={secondColumn} className="hidden md:block" duration={19} />
          <TestimonialsColumn testimonials={thirdColumn} className="hidden lg:block" duration={17} />
        </div>
      </div>
    </section>
  );
}
