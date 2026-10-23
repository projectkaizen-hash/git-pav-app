"use client";
import * as React from "react";

import {
  type ColumnFiltersState,
  type ColumnVisibilityState,
  type PaginationState,
  type SortingState,
  useTable,
} from "@tanstack/react-table";
import { Cog, Download, Grid, Plus, Rows3, Search, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { dataTableFeatures } from "@/lib/data-table-features";

import { filters, type UserRow } from "./data";
import { UserDialog } from "./user-dialog";
import { createUsersColumns } from "./users-columns";
import { UsersTable } from "./users-table";

export function Users({ users: initialUsers }: { users: UserRow[] }) {
  const [users, setUsers] = React.useState<UserRow[]>(initialUsers);
  const [rowSelection, setRowSelection] = React.useState({});
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "joinedDate", desc: true }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>({});
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [selectedUser, setSelectedUser] = React.useState<UserRow | null>(null);
  const [dialogMode, setDialogMode] = React.useState<"view" | "edit">("view");
  const [dialogOpen, setDialogOpen] = React.useState(false);

  // Update local state when prop changes
  React.useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  const handleViewUser = (user: UserRow) => {
    setSelectedUser(user);
    setDialogMode("view");
    setDialogOpen(true);
  };

  const handleEditUser = (user: UserRow) => {
    setSelectedUser(user);
    setDialogMode("edit");
    setDialogOpen(true);
  };

  const handleUserSaved = (updatedUser: UserRow) => {
    // Update the user in the local data
    setUsers((prevUsers) => prevUsers.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
  };

  const handleUserDeleted = (userId: string) => {
    // Remove the user from the local data
    setUsers((prevUsers) => prevUsers.filter((u) => u.id !== userId));
  };

  const table = useTable({
    features: dataTableFeatures,
    data: users,
    columns: createUsersColumns({
      onViewUser: handleViewUser,
      onEditUser: handleEditUser,
      onDeleteUser: handleUserDeleted,
    }),
    state: {
      rowSelection,
      sorting,
      columnFilters,
      columnVisibility,
      pagination,
    },
    getRowId: (row) => row.id,
    autoResetPageIndex: false,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
  });

  const searchQuery = (table.getColumn("search")?.getFilterValue() as string | undefined) ?? "";
  const statusFilter = (table.getColumn("status")?.getFilterValue() as string | undefined) ?? "All";
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;

  function setColumnSelectFilter(columnId: string, value: string) {
    table.getColumn(columnId)?.setFilterValue(value === "All" ? undefined : value);
    table.setPageIndex(0);
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="border-b has-data-[slot=card-action]:grid-cols-1 md:has-data-[slot=card-action]:grid-cols-[1fr_auto]">
          <CardTitle className="text-xl leading-none">Users</CardTitle>
          <CardDescription className="max-w-sm leading-snug">
            Manage your organization members and their access.
          </CardDescription>
          <CardAction className="col-start-1 row-start-auto flex w-full flex-wrap justify-start gap-2 justify-self-stretch md:col-start-2 md:row-span-2 md:row-start-1 md:w-auto md:flex-nowrap md:justify-end md:justify-self-end">
            <InputGroup className="h-7 w-full md:w-64">
              <InputGroupAddon align="inline-start">
                <Search className="size-3.5" />
              </InputGroupAddon>
              <InputGroupInput
                className="h-7"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(event) => {
                  table.getColumn("search")?.setFilterValue(event.target.value.toLowerCase() || undefined);
                  table.setPageIndex(0);
                }}
              />
              <InputGroupAddon align="inline-end">
                <Kbd className="h-4 text-[10px]">⌘K</Kbd>
              </InputGroupAddon>
            </InputGroup>
            <Button variant="outline" size="sm">
              <SlidersHorizontal /> Hide
            </Button>
            <Button variant="outline" size="sm">
              <Cog /> Customize
            </Button>
            <Button variant="outline" size="sm">
              <Download /> Export
            </Button>
            <Button size="sm">
              <Plus /> Add User
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 px-0">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4">
            <div className="flex flex-wrap items-center gap-3">
              <Select value={statusFilter} onValueChange={(value) => setColumnSelectFilter("status", value)}>
                <SelectTrigger size="sm">
                  <span className="text-muted-foreground">Status:</span>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" align="start">
                  <SelectGroup>
                    {filters.status.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 px-4">
            <div className="text-muted-foreground text-sm tabular-nums">{selectedCount} selected</div>

            <Tabs defaultValue="list">
              <TabsList>
                <TabsTrigger value="list" aria-label="List view">
                  <Rows3 />
                </TabsTrigger>
                <TabsTrigger value="grid" aria-label="Grid view">
                  <Grid />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <UsersTable table={table} />
        </CardContent>
      </Card>

      <UserDialog
        user={selectedUser}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        onSave={handleUserSaved}
        onDelete={handleUserDeleted}
      />
    </div>
  );
}
