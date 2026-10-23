import { Star, Quote } from "lucide-react";

const TESTIMONIALS = [
  {
    title: "Best Dentist I've Ever Been to",
    rating: 5,
    quote:
      "I had excruciating tooth pain late on a Saturday night and thought I would have to suffer until Monday morning. Pav Dental took my call at 11:30 PM, had me in the chair by midnight, and painlessly resolved an acute pulp infection. Truly lifesavers!",
    author: "Sarah M.",
    location: "Bradford BD3",
    tag: "Verified Emergency Patient",
  },
  {
    title: "Excellent Practice & Great Staff",
    rating: 5,
    quote:
      "My son fractured his front tooth playing rugby on Sunday afternoon. We rushed to Pav Dental, where the team welcomed us with such warmth and calmness. They performed emergency composite bonding and saved his tooth. Could not be more grateful.",
    author: "David K.",
    location: "West Yorkshire",
    tag: "Dental Trauma Treatment",
  },
];

export function EmergencyTestimonials() {
  return (
    <section className="py-20 sm:py-28 bg-[#fffdf9]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-xs font-bold uppercase tracking-widest text-[#cf9448] mb-3">
            Patient Stories
          </p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-[#2a1c12] tracking-tight">
            What people <span className="accent-text italic">say?</span>
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#6b5848]">
            Genuine feedback from patients who walked into our emergency clinic in severe pain and walked out relieved.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {TESTIMONIALS.map((review) => (
            <div
              key={review.author}
              className="relative rounded-3xl bg-[#faf6f0] border border-[#e2d4c0] p-8 sm:p-10 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div className="absolute top-6 right-6 text-[#cf9448]/25 pointer-events-none">
                <Quote className="size-12" />
              </div>

              <div>
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: review.rating }).map((_, i) => (
                    <Star
                      key={i}
                      className="size-4 fill-[#cf9448] text-[#cf9448]"
                    />
                  ))}
                </div>

                <h3 className="font-display text-xl font-bold text-[#2a1c12] mb-3">
                  {review.title}
                </h3>

                <p className="text-sm sm:text-base text-[#6b5848] leading-relaxed italic">
                  "{review.quote}"
                </p>
              </div>

              <div className="mt-8 pt-5 border-t border-[#e2d4c0]/70 flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-[#2a1c12]">{review.author}</p>
                  <p className="text-xs text-[#9a8674]">{review.location}</p>
                </div>
                <span className="text-[11px] font-bold text-[#925a27] bg-[#cf9448]/15 px-3 py-1 rounded-full">
                  {review.tag}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
