import { ErasureQueue } from "./_components/erasure-queue";

export default function ErasureRequestsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-bold text-3xl tracking-tight">Erasure requests</h1>
        <p className="text-muted-foreground text-sm">
          Patients' requests to have their data erased. Each must be answered within one month. Erasing removes their
          login, contact details, saved cards and notifications, and keeps the clinical record until its retention date.
        </p>
      </div>

      <ErasureQueue />
    </div>
  );
}
