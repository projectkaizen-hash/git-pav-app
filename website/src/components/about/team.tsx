import { TeamShowcase } from "@/components/ui/team-showcase";

const companies = [
  {
    src: "https://cdn.21st.dev/assets/mirror/01/01eed6b231e04442ccc351628f02a2a115a69c5d21e14a5646d006c68d9ac3de.svg",
    alt: "Arc",
  },
  {
    src: "https://cdn.21st.dev/assets/mirror/51/51129a2a091b1e72cfd668d53fd5bea734a95ff5fd071fd25b866a0c1454f0e0.svg",
    alt: "Descript",
  },
  {
    src: "https://cdn.21st.dev/assets/mirror/00/0088937b0b0c70cfabea9beeab64949ab3a0b5ea52f8684a4ce7875b45a2a706.svg",
    alt: "Mercury",
  },
  {
    src: "https://cdn.21st.dev/assets/mirror/76/760366384a3523aa7b033c30a1cb3d64d0b7c93d5c2535f89a770383ee329aab.svg",
    alt: "Ramp",
  },
  {
    src: "https://cdn.21st.dev/assets/mirror/ed/ed0e41fdd91fa17618e67bb21dcf842eb10c4bd82d9196246d231d9069556406.svg",
    alt: "Retool",
  },
  {
    src: "https://cdn.21st.dev/assets/mirror/b6/b6951d37dfa577ecbd68657f8799da4a15e03e55fb110438bd7222ccc9335494.svg",
    alt: "Watershed",
  },
];

export function Team() {
  return (
    <section className="pb-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-12 text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-medium">Meet Our Team</h2>
          <p className="mt-4 text-muted">
            The dedicated professionals behind PavDental's exceptional care
          </p>
        </div>
        <TeamShowcase />
        <div className="mt-10 text-center">
          <a
            href="/team"
            className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-white px-6 py-2.5 text-sm font-semibold text-primary shadow-xs transition-all hover:border-primary hover:bg-primary hover:text-white"
          >
            <span>Explore Full Medical Faculty & Clinical Profiles</span>
            <span aria-hidden="true">&rarr;</span>
          </a>
        </div>
        <div className="mt-20">
          <p className="text-center text-primary font-medium">Valued by clients worldwide</p>
          <div className="mt-8 flex flex-wrap justify-center gap-8">
            {companies.map((company, idx) => (
              <div className="flex items-center gap-3" key={company.src + idx}>
                <img
                  src={company.src}
                  alt={company.alt}
                  className="h-6 w-auto md:h-8"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
