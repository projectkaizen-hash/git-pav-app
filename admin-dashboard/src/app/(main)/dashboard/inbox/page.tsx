import { InboxView } from "./_components/inbox-view";

export default function InboxPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-bold text-3xl tracking-tight">Patient inbox</h1>
        <p className="text-muted-foreground text-sm">
          Messages patients send to the practice from the app. Replies go to the patient as the Pav Dental Practice
          Team.
        </p>
      </div>

      <InboxView />
    </div>
  );
}
