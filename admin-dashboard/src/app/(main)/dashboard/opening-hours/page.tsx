import { OpeningHoursEditor } from "./_components/opening-hours-editor";

export default function OpeningHoursPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Opening hours</h1>
        <p className="text-muted-foreground text-sm">
          Each clinic's weekly hours and closed days. The app only offers clinic appointments inside these hours (UK
          time).
        </p>
      </div>

      <OpeningHoursEditor />
    </div>
  );
}
