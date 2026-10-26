import { AppointmentsList } from "./_components/appointments-list";

export default function AppAppointmentsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-bold text-3xl tracking-tight">App appointments</h1>
        <p className="text-muted-foreground text-sm">
          Clinic, van and video visits booked in the app. Change a visit's status when the app couldn't, for example to
          mark a no-show. Cancelling refunds any deposit to the patient's card. Every change is kept in the audit log.
        </p>
      </div>

      <AppointmentsList />
    </div>
  );
}
