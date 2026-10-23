export type UserStatus = "Active" | "Inactive";

export type UserRow = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
  status: UserStatus;
  joinedDate: string;
  search: string;
};

export const filters = {
  status: ["All", "Active", "Inactive"],
  initialStatus: "All",
};

export const statusMeta: Record<UserStatus, { badgeClass: string; dotClass: string }> = {
  Active: {
    badgeClass: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    dotClass: "bg-emerald-500",
  },
  Inactive: {
    badgeClass: "border-border bg-muted/50 text-muted-foreground",
    dotClass: "bg-muted-foreground",
  },
};

export function transformDbUsers(dbUsers: any[]): UserRow[] {
  return dbUsers.map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    email_verified: user.email_verified,
    created_at: user.created_at,
    updated_at: user.updated_at,
    status: user.email_verified ? "Active" : "Inactive",
    joinedDate: new Date(user.created_at).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    search: `${user.email} ${user.name || ""} ${user.phone || ""}`.toLowerCase(),
  }));
}
