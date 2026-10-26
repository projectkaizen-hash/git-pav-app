import { DentistProfiles } from "./_components/dentist-profiles";

export default function DentistProfilesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-bold text-3xl tracking-tight">Dentist profiles</h1>
        <p className="text-muted-foreground text-sm">
          The photo, bio and specialisms patients see when they choose a clinician in the app. Switch someone on to list
          them on the website's team page, and use the arrows to set the order. New clinicians are added on the Team &
          Services page.
        </p>
      </div>

      <DentistProfiles />
    </div>
  );
}
