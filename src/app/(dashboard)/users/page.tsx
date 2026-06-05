"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  Plus,
  MoreHorizontal,
  Trash2,
  Shield,
  Pencil,
  KeyRound,
  Clock,
  CheckCircle,
  RotateCcw,
} from "lucide-react"
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table"
import type { ColumnDef } from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { clearToken } from "@/lib/auth"
import { fetchUsers, deleteUser, restoreUser, type User } from "@/lib/users"
import { formatDate } from "@/lib/date"
import { cn } from "@/lib/utils"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UsersActionDialog } from "./users-action-dialog"
import { ChangePasswordDialog } from "./change-password-dialog"
import { DataTablePagination } from "@/components/data-table"

/* ------------------------------------------------------------------ */
/* Columns                                                            */
/* ------------------------------------------------------------------ */

const columns: ColumnDef<User>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue("name")}</span>
    ),
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => {
      const email = row.getValue<string>("email")
      const verified = row.original.email_verified_at
      return (
        <>
          {verified ? (
            <CheckCircle className="mr-1 inline-block size-4 text-emerald-500" />
          ) : (
            <Clock className="mr-1 inline-block size-4 text-orange-500" />
          )}
          {email}
        </>
      )
    },
  },
  {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {formatDate(row.getValue("created_at"))}
      </span>
    ),
  },
  {
    id: "actions",
    header: "",
    enableGlobalFilter: false,
    enableSorting: false,
    meta: { className: "w-12" },
    cell: () => null, // rendered inline below
  },
]

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function UsersPage() {
  const router = useRouter()

  // --- Data ---
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // --- Filters ---
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "deleted">("all")
  const [emailFilter, setEmailFilter] = useState<"all" | "verified" | "unverified">("all")

  // --- Pagination ---
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)

  // --- Dialogs ---
  const [deleteDialog, setDeleteDialog] = useState<User | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [actionOpen, setActionOpen] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [passwordDialog, setPasswordDialog] = useState<User | null>(null)

  /* ---------------------------------------------------------------- */
  /* Fetch all users                                                   */
  /* ---------------------------------------------------------------- */

  const loadUsers = useCallback(
    async (signal: AbortSignal) => {
      setLoading(true)
      setError(null)
      try {
        const result = await fetchUsers({ limit: 100000, signal })
        setAllUsers(result.users)
      } catch (err) {
        if ((err as Error).name === "AbortError") return
        const msg =
          err instanceof Error ? err.message : "Failed to load users"
        if (
          msg.includes("Not Found") ||
          msg.includes("user token not found") ||
          msg.includes("Not Authenticated") ||
          msg.includes("401")
        ) {
          clearToken()
          router.replace("/login")
          return
        }
        setError(msg)
      } finally {
        setLoading(false)
      }
    },
    [router],
  )

  useEffect(() => {
    const controller = new AbortController()
    loadUsers(controller.signal)
    return () => controller.abort()
  }, [loadUsers])

  /* ---------------------------------------------------------------- */
  /* Pre-filter: status + email_verified (non-column fields)          */
  /* ---------------------------------------------------------------- */

  const filtered = useMemo(() => {
    let result = allUsers
    if (statusFilter === "active") {
      result = result.filter((u) => !u.deleted_at)
    } else if (statusFilter === "deleted") {
      result = result.filter((u) => u.deleted_at)
    }
    if (emailFilter === "verified") {
      result = result.filter((u) => u.email_verified_at != null)
    } else if (emailFilter === "unverified") {
      result = result.filter((u) => u.email_verified_at == null)
    }
    return result
  }, [allUsers, statusFilter, emailFilter])

  /* ---------------------------------------------------------------- */
  /* Text search (manual, no TanStack filtering)                      */
  /* ---------------------------------------------------------------- */

  const searched = useMemo(() => {
    if (!search) return filtered
    const q = search.toLowerCase()
    return filtered.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    )
  }, [filtered, search])

  /* ---------------------------------------------------------------- */
  /* Manual pagination                                                */
  /* ---------------------------------------------------------------- */

  const pageStart = page * pageSize
  const displayed = useMemo(
    () => searched.slice(pageStart, pageStart + pageSize),
    [searched, pageStart, pageSize],
  )
  const totalPages = Math.max(1, Math.ceil(searched.length / pageSize))

  // Reset to page 0 when filters change
  useEffect(() => {
    setPage(0)
  }, [search, statusFilter, emailFilter, pageSize])

  /* ---------------------------------------------------------------- */
  /* TanStack Table — display only, no filtering, no pagination       */
  /* ---------------------------------------------------------------- */

  const table = useReactTable({
    data: displayed,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  /* ---------------------------------------------------------------- */
  /* Handlers                                                          */
  /* ---------------------------------------------------------------- */

  const handleDelete = async () => {
    if (!deleteDialog) return
    setDeleting(true)
    try {
      await deleteUser(deleteDialog.id)
      setDeleteDialog(null)
      loadUsers(new AbortController().signal)
    } catch (err) {
      console.error("Delete failed", err)
    } finally {
      setDeleting(false)
    }
  }

  const handleRestore = async (user: User) => {
    try {
      const restored = await restoreUser(user.id)
      setAllUsers((prev) =>
        prev.map((u) => (u.id === restored.id ? restored : u)),
      )
    } catch (err) {
      console.error("Restore failed", err)
    }
  }

  const refresh = () => loadUsers(new AbortController().signal)

  /* ---------------------------------------------------------------- */
  /* Render: loading                                                   */
  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        </div>
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 4 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  /* ---------------------------------------------------------------- */
  /* Render: error                                                     */
  /* ---------------------------------------------------------------- */

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <div className="flex flex-col items-center justify-center rounded-md border py-12 text-muted-foreground">
          <p className="text-sm">Failed to load users</p>
          <p className="mt-1 text-xs">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => router.refresh()}
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  /* ---------------------------------------------------------------- */
  /* Render: main                                                      */
  /* ---------------------------------------------------------------- */

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">
            {allUsers.length} user{allUsers.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <Button
          onClick={() => {
            setEditUser(null)
            setActionOpen(true)
          }}
          size="lg"
          className="shadow-xs"
        >
          <Plus className="mr-2 size-4" />
          Add User
        </Button>
      </div>

      {/* Search + Status filter + Email filter */}
      <div className="flex items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
          />
        </div>
        <Tabs
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="deleted">Deleted</TabsTrigger>
          </TabsList>
        </Tabs>
        <Tabs
          value={emailFilter}
          onValueChange={(v) => setEmailFilter(v as typeof emailFilter)}
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="verified">Verified</TabsTrigger>
            <TabsTrigger value="unverified">Unverified</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="group/row">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      "bg-background group-hover/row:bg-muted",
                      header.column.columnDef.meta?.className,
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {displayed.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={cn(
                    "group/row",
                    row.original.deleted_at && "text-muted-foreground/60",
                  )}
                >
                  {row.getVisibleCells().map((cell) => {
                    // Show actions only in the last column
                    if (cell.column.id === "actions") {
                      const user = row.original
                      return (
                        <TableCell
                          key={cell.id}
                          className="bg-background group-hover/row:bg-muted"
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={(props) => (
                                <Button
                                  {...props}
                                  variant="ghost"
                                  size="icon-sm"
                                  className="size-8"
                                />
                              )}
                            >
                              <MoreHorizontal className="size-4" />
                              <span className="sr-only">Actions</span>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-44"
                            >
                              <DropdownMenuGroup>
                                <DropdownMenuLabel>
                                  {user.name}
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditUser(user)
                                    setActionOpen(true)
                                  }}
                                >
                                  <Pencil className="mr-2 size-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    alert("Manage roles — coming soon")
                                  }
                                >
                                  <Shield className="mr-2 size-4" />
                                  Roles
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setPasswordDialog(user)}
                                >
                                  <KeyRound className="mr-2 size-4" />
                                  Change Password
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {user.deleted_at ? (
                                  <DropdownMenuItem
                                    onClick={() => handleRestore(user)}
                                  >
                                    <RotateCcw className="mr-2 size-4" />
                                    Restore
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => setDeleteDialog(user)}
                                  >
                                    <Trash2 className="mr-2 size-4" />
                                    Delete
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuGroup>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )
                    }

                    // Render data cells
                    return (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          "bg-background group-hover/row:bg-muted",
                          // Only font-medium on the name column
                          cell.column.id === "name" && "font-medium",
                        )}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-24 bg-background text-center text-muted-foreground"
                >
                  {search
                    ? "No users match your search."
                    : "No users found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <DataTablePagination
        page={page}
        setPage={setPage}
        totalPages={totalPages}
        pageSize={pageSize}
        setPageSize={setPageSize}
      />

      {/* Dialogs */}
      <UsersActionDialog
        open={actionOpen}
        onOpenChange={(open) => {
          if (!open) {
            setActionOpen(false)
            setEditUser(null)
          }
        }}
        currentRow={editUser}
        onSuccess={refresh}
      />
      <ChangePasswordDialog
        open={!!passwordDialog}
        onOpenChange={(open) => {
          if (!open) setPasswordDialog(null)
        }}
        userId={passwordDialog?.id ?? 0}
        userName={passwordDialog?.name ?? ""}
        onSuccess={refresh}
      />
      <Dialog
        open={!!deleteDialog}
        onOpenChange={(open) => {
          if (!open) setDeleteDialog(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete user</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deleteDialog?.name}</strong>? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}