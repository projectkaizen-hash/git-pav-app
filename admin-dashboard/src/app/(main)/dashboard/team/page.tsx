import { TeamEditor } from "./_components/team-editor";

export default function TeamPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Team & Services</h1>
        <p className="text-muted-foreground text-sm">
          Add clinicians, van operators, services and vans to the app. New staff get an email to set their password.
        </p>
      </div>

      <TeamEditor />
    </div>
  );
}
