import { PatientsTable } from "./_components/patients-table";

export default function PatientsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Patients Directory</h1>
        <p className="text-muted-foreground text-sm">
          Browse and manage registered patient records and appointment histories.
        </p>
      </div>

      <PatientsTable />
    </div>
  );
}
