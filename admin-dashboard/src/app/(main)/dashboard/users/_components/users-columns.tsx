"use client";
import type { ColumnDef } from "@tanstack/react-table";
import { Subscribe } from "@tanstack/react-table";
import { cn } from "cn";
import { MoreHorizontal } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DataTableFeatures } from "@/lib/data-table-features";
import { getInitials } from "@/lib/utils";

import { statusMeta, type UserRow } from "./data";

interface UsersColumnsProps {
  onViewUser?: (user: UserRow) => void;
  onEditUser?: (user: UserRow) => void;
  onDeleteUser?: (userId: string) => void;
}

function StatusBadge({ status }: { status: UserRow["status"] }) {
  const meta = statusMeta[status];

  return (
    <Badge className={cn("gap-1.5 border px-2 py-1 font-medium", meta.badgeClass)} variant="outline">
      <span className={cn("size-1.5 rounded-full", meta.dotClass)} />
      {status}
    </Badge>
  );
}

function getAvatarTone(name: string) {
  const tones = [
    "[&_[data-slot=avatar-fallback]]:bg-amber-100 [&_[data-slot=avatar-fallback]]:text-amber-700 after:border-amber-200 dark:[&_[data-slot=avatar-fallback]]:bg-amber-500/15 dark:[&_[data-slot=avatar-fallback]]:text-amber-300 dark:after:border-amber-500/20",
    "[&_[data-slot=avatar-fallback]]:bg-orange-100 [&_[data-slot=avatar-fallback]]:text-orange-700 after:border-orange-200 dark:[&_[data-slot=avatar-fallback]]:bg-orange-500/15 dark:[&_[data-slot=avatar-fallback]]:text-orange-300 dark:after:border-orange-500/20",
    "[&_[data-slot=avatar-fallback]]:bg-rose-100 [&_[data-slot=avatar-fallback]]:text-rose-700 after:border-rose-200 dark:[&_[data-slot=avatar-fallback]]:bg-rose-500/15 dark:[&_[data-slot=avatar-fallback]]:text-rose-300 dark:after:border-rose-500/20",
    "[&_[data-slot=avatar-fallback]]:bg-pink-100 [&_[data-slot=avatar-fallback]]:text-pink-700 after:border-pink-200 dark:[&_[data-slot=avatar-fallback]]:bg-pink-500/15 dark:[&_[data-slot=avatar-fallback]]:text-pink-300 dark:after:border-pink-500/20",
    "[&_[data-slot=avatar-fallback]]:bg-fuchsia-100 [&_[data-slot=avatar-fallback]]:text-fuchsia-700 after:border-fuchsia-200 dark:[&_[data-slot=avatar-fallback]]:bg-fuchsia-500/15 dark:[&_[data-slot=avatar-fallback]]:text-fuchsia-300 dark:after:border-fuchsia-500/20",
    "[&_[data-slot=avatar-fallback]]:bg-purple-100 [&_[data-slot=avatar-fallback]]:text-purple-700 after:border-purple-200 dark:[&_[data-slot=avatar-fallback]]:bg-purple-500/15 dark:[&_[data-slot=avatar-fallback]]:text-purple-300 dark:after:border-purple-500/20",
    "[&_[data-slot=avatar-fallback]]:bg-violet-100 [&_[data-slot=avatar-fallback]]:text-violet-700 after:border-violet-200 dark:[&_[data-slot=avatar-fallback]]:bg-violet-500/15 dark:[&_[data-slot=avatar-fallback]]:text-violet-300 dark:after:border-violet-500/20",
    "[&_[data-slot=avatar-fallback]]:bg-indigo-100 [&_[data-slot=avatar-fallback]]:text-indigo-700 after:border-indigo-200 dark:[&_[data-slot=avatar-fallback]]:bg-indigo-500/15 dark:[&_[data-slot=avatar-fallback]]:text-indigo-300 dark:after:border-indigo-500/20",
    "[&_[data-slot=avatar-fallback]]:bg-sky-100 [&_[data-slot=avatar-fallback]]:text-sky-700 after:border-sky-200 dark:[&_[data-slot=avatar-fallback]]:bg-sky-500/15 dark:[&_[data-slot=avatar-fallback]]:text-sky-300 dark:after:border-sky-500/20",
    "[&_[data-slot=avatar-fallback]]:bg-emerald-100 [&_[data-slot=avatar-fallback]]:text-emerald-700 after:border-emerald-200 dark:[&_[data-slot=avatar-fallback]]:bg-emerald-500/15 dark:[&_[data-slot=avatar-fallback]]:text-emerald-300 dark:after:border-emerald-500/20",
  ];

  return tones[name.length % tones.length];
}

function AvatarCell({ name }: { name: string }) {
  return (
    <Avatar size="lg" className={cn("font-medium", getAvatarTone(name))}>
      <AvatarFallback>{getInitials(name || "User")}</AvatarFallback>
    </Avatar>
  );
}

export function createUsersColumns({
  onViewUser,
  onEditUser,
  onDeleteUser,
}: UsersColumnsProps): ColumnDef<DataTableFeatures, UserRow>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <div className="flex items-center justify-center">
          <Subscribe
            source={table.atoms.rowSelection}
            selector={() =>
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected() && "indeterminate")
            }
          >
            {(checked) => (
              <Checkbox
                aria-label="Select all users"
                checked={checked}
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
              />
            )}
          </Subscribe>
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Subscribe source={row.table.atoms.rowSelection} selector={(selection) => Boolean(selection?.[row.id])}>
            {(checked) => (
              <Checkbox
                aria-label={`Select ${row.original.name}`}
                checked={checked}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
              />
            )}
          </Subscribe>
        </div>
      ),
      enableHiding: false,
      enableSorting: false,
    },
    {
      id: "search",
      accessorFn: (row) => row.search,
      filterFn: "includesString",
      enableHiding: true,
    },
    {
      accessorKey: "name",
      header: "User",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <AvatarCell name={row.original.name || "User"} />
          <div className="min-w-0">
            <div className="truncate font-medium text-foreground text-sm">{row.original.name || "Unknown"}</div>
            <div className="truncate text-muted-foreground text-sm">{row.original.email}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => <div className="text-muted-foreground text-sm">{row.original.phone || "-"}</div>,
    },
    {
      accessorKey: "status",
      header: "Status",
      filterFn: "equalsString",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "joinedDate",
      accessorFn: (row) => new Date(row.created_at).getTime(),
      header: "Joined date",
      cell: ({ row }) => <div className="text-foreground text-sm">{row.original.joinedDate}</div>,
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                aria-label={`Open actions for ${row.original.name}`}
                className="size-8 rounded-md text-muted-foreground hover:bg-muted/50"
                size="icon-sm"
                variant="ghost"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onViewUser?.(row.original)}>View profile</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEditUser?.(row.original)}>Edit user</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => {
                  if (confirm(`Are you sure you want to delete ${row.original.email}?`)) {
                    onDeleteUser?.(row.original.id);
                  }
                }}
              >
                Delete user
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
      enableHiding: false,
      enableSorting: false,
    },
  ];
}
