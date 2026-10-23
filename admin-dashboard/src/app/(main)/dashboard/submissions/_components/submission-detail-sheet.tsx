"use client";

import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export interface Submission {
  id: string;
  form_type: "contact" | "vacancy" | "petition" | "other";
  data: Record<string, any>;
  is_read: boolean;
  is_archived: boolean;
  submitted_at: string;
}

interface DetailProps {
  submission: Submission | null;
  isOpen: boolean;
  onClose: () => void;
  onMarkRead: (id: string, read: boolean) => void;
  onDelete: (id: string) => void;
}

export function SubmissionDetailSheet({ submission, isOpen, onClose, onMarkRead, onDelete }: DetailProps) {
  if (!submission) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="capitalize">{submission.form_type} Submission</SheetTitle>
            <Badge variant="outline">{submission.form_type.toUpperCase()}</Badge>
          </div>
          <SheetDescription>Received on {format(new Date(submission.submitted_at), "PPP 'at' p")}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 flex flex-col gap-5">
          <div className="rounded-lg border p-4 bg-muted/30 space-y-3">
            {Object.entries(submission.data || {}).map(([key, val]) => (
              <div key={key}>
                <p className="text-xs font-semibold capitalize text-muted-foreground">{key.replace(/_/g, " ")}</p>
                <p className="text-sm mt-0.5 whitespace-pre-wrap">
                  {typeof val === "object" ? JSON.stringify(val) : String(val)}
                </p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-4 border-t">
            {!submission.is_read ? (
              <Button size="sm" onClick={() => onMarkRead(submission.id, true)} className="flex-1">
                Mark as Read
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => onMarkRead(submission.id, false)} className="flex-1">
                Mark as Unread
              </Button>
            )}
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                onDelete(submission.id);
                onClose();
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
