import { AuditLogTable } from "./_components/audit-log-table";

export default function AuditLogPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-bold text-3xl tracking-tight">Audit log</h1>
        <p className="text-muted-foreground text-sm">
          Who did what in the app, newest first. Entries can't be changed or deleted. Filter by the start of an action,
          for example "admin." for staff changes, or paste an appointment or patient ID to see its history.
        </p>
      </div>

      <AuditLogTable />
    </div>
  );
}
