import { TriangleAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { type OutsideHoursVisit, ukDateTime } from "@/lib/pav-schedule";

const CHANNEL_LABELS: Record<string, string> = { clinic: "Clinic visit", video: "Video consultation" };

/** Upcoming visits that no longer fit the hours. They stay booked; staff rearrange them with the patient. */
export function OutsideHoursAlert({
  visits,
  nameOf,
}: {
  visits: OutsideHoursVisit[];
  nameOf?: (clinicianId: string | null) => string;
}) {
  if (visits.length === 0) return null;
  return (
    <Alert>
      <TriangleAlert />
      <AlertTitle>
        {visits.length === 1 ? "1 booked visit is" : `${visits.length} booked visits are`} now outside working hours
      </AlertTitle>
      <AlertDescription>
        <p>These are still booked. Contact the patients to move them, or change the hours back.</p>
        <ul className="mt-2 list-disc pl-5">
          {visits.slice(0, 20).map((visit) => (
            <li key={visit.id}>
              {ukDateTime(visit.startTimeUtc)} · {CHANNEL_LABELS[visit.channel] ?? visit.channel}
              {nameOf ? ` · ${nameOf(visit.clinicianId)}` : ""}
            </li>
          ))}
        </ul>
        {visits.length > 20 ? <p className="mt-1">…and {visits.length - 20} more.</p> : null}
      </AlertDescription>
    </Alert>
  );
}
