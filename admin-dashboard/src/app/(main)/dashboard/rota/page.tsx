import { RotaEditor } from "./_components/rota-editor";

export default function RotaPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Rota</h1>
        <p className="text-muted-foreground text-sm">
          When each clinician works, and one-off changes such as leave. Patients can only book a clinician inside these
          hours (UK time).
        </p>
      </div>

      <RotaEditor />
    </div>
  );
}
