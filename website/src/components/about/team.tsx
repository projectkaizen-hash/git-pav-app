import { TeamShowcase } from "@/components/ui/team-showcase";
import { useDoctors } from "@/components/team/use-doctors";

// The dentists staff show on the website (dashboard: Dentist profiles).
export function Team() {
  const { doctors } = useDoctors();
  const members = doctors.map((d) => ({ id: d.id, name: d.name, role: d.role, image: d.photo }));
  return (
    <section className="pb-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-12 text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-medium">Meet Our Team</h2>
          <p className="mt-4 text-muted">
            The dedicated professionals behind PavDental's exceptional care
          </p>
        </div>
        <TeamShowcase members={members} />
        <div className="mt-10 text-center">
          <a
            href="/team"
            className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-white px-6 py-2.5 text-sm font-semibold text-primary shadow-xs transition-all hover:border-primary hover:bg-primary hover:text-white"
          >
            <span>Meet our dentists</span>
            <span aria-hidden="true">&rarr;</span>
          </a>
        </div>
      </div>
    </section>
  );
}
