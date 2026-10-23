import { SubmissionsTable } from "./_components/submissions-table";

export default function SubmissionsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Form Submissions</h1>
        <p className="text-muted-foreground text-sm">
          Unified inbox for website contact inquiries, dental nurse/receptionist job applications, and NHS petitions.
        </p>
      </div>

      <SubmissionsTable />
    </div>
  );
}
