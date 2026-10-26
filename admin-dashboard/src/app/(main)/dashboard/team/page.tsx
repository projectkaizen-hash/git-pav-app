import { TeamEditor } from "./_components/team-editor";

export default function TeamPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Team & Services</h1>
        <p className="text-muted-foreground text-sm">
          Add clinicians, van operators, services, vans and clinics to the app. New staff get an email to set their
          password. Use Edit to fix a service, van or clinic, and Retire to stop new bookings while keeping its history.
        </p>
      </div>

      <TeamEditor />
    </div>
  );
}
