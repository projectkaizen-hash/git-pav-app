"use client";
import * as React from "react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldContent, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

import type { UserRow } from "./data";

interface UserDialogProps {
  user: UserRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "view" | "edit";
  onSave?: (updatedUser: UserRow) => void;
  onDelete?: (userId: string) => void;
}

export function UserDialog({ user, open, onOpenChange, mode, onSave, onDelete }: UserDialogProps) {
  const [name, setName] = React.useState(user?.name || "");
  const [phone, setPhone] = React.useState(user?.phone || "");
  const [emailVerified, setEmailVerified] = React.useState(user?.email_verified || false);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (user) {
      setName(user.name || "");
      setPhone(user.phone || "");
      setEmailVerified(user.email_verified);
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/v1/admin/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          email_verified: emailVerified,
        }),
      });

      if (!response.ok) throw new Error("Failed to update user");

      const data = await response.json();
      toast.success("User updated successfully");

      if (onSave) {
        onSave({
          ...user,
          name,
          phone,
          email_verified: emailVerified,
          status: emailVerified ? "Active" : "Inactive",
        });
      }

      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to update user");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;

    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/v1/admin/users/${user.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete user");

      toast.success("User deleted successfully");

      if (onDelete) {
        onDelete(user.id);
      }

      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to delete user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "view" ? "User Details" : "Edit User"}</DialogTitle>
          <DialogDescription>
            {mode === "view"
              ? "View user information and account status."
              : "Update user information and account status."}
          </DialogDescription>
        </DialogHeader>

        {user && (
          <div className="space-y-4 py-4">
            <FieldGroup>
              <Field>
                <FieldLabel>Email</FieldLabel>
                <FieldContent>
                  <Input value={user.email} disabled className="bg-muted/50" />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel>Name</FieldLabel>
                <FieldContent>
                  {mode === "view" ? (
                    <Input value={user.name || "Not provided"} disabled className="bg-muted/50" />
                  ) : (
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter user name" />
                  )}
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel>Phone</FieldLabel>
                <FieldContent>
                  {mode === "view" ? (
                    <Input value={user.phone || "Not provided"} disabled className="bg-muted/50" />
                  ) : (
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Enter phone number" />
                  )}
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel>Email Verified</FieldLabel>
                <FieldContent>
                  <div className="flex items-center gap-2">
                    <Switch checked={emailVerified} onCheckedChange={setEmailVerified} disabled={mode === "view"} />
                    <span className="text-sm text-muted-foreground">{emailVerified ? "Verified" : "Not verified"}</span>
                  </div>
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel>Joined Date</FieldLabel>
                <FieldContent>
                  <Input value={user.joinedDate} disabled className="bg-muted/50" />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel>Status</FieldLabel>
                <FieldContent>
                  <Input value={user.status} disabled className="bg-muted/50" />
                </FieldContent>
              </Field>
            </FieldGroup>

            <div className="flex gap-2 justify-end pt-4">
              {mode === "edit" && (
                <>
                  <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading}>
                    Delete User
                  </Button>
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={handleSave} disabled={loading}>
                    {loading ? "Saving..." : "Save Changes"}
                  </Button>
                </>
              )}

              {mode === "view" && (
                <>
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Close
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
