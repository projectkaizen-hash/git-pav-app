import React from "react";
import { motion } from "motion/react";

const testimonials = [
  {
    text: "After years of struggling with loose dentures, the implant-retained option changed my life. I can eat apples and steak again without worrying about them slipping.",
    name: "Margaret B.",
    role: "Implant-Retained Dentures",
  },
  {
    text: "The same-day repair service saved my holiday. I dropped my denture on a Saturday morning and they had it fixed by afternoon. Incredible service.",
    name: "Robert H.",
    role: "Emergency Repair",
  },
  {
    text: "I was self-conscious about my smile for years. The natural-looking teeth and gum work means nobody can tell they're dentures. I smile confidently now.",
    name: "Susan T.",
    role: "Full Acrylic Dentures",
  },
  {
    text: "The flexible Valplast partial is so comfortable. No metal clasps showing and it fits perfectly around my remaining teeth. Highly recommend.",
    name: "James P.",
    role: "Flexible Partial",
  },
  {
    text: "As an NHS patient, I was worried about quality. The Band 3 dentures I received are excellent—well-fitting and natural-looking. Great value.",
    name: "Elizabeth M.",
    role: "NHS Dentures",
  },
  {
    text: "The chrome framework is so thin and lightweight compared to my old acrylic denture. I can taste food properly and it's barely noticeable.",
    name: "David W.",
    role: "Cobalt Chrome Dentures",
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

export function DenturesTestimonials() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="font-display text-3xl sm:text-5xl font-bold text-[#2a1c12]">
            What People Say
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#6b5848] leading-relaxed">
            See what our denture patients have to say about us.
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