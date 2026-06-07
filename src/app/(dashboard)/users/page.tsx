"use client"

import { useEffect, useState, useMemo, useCallback, useRef, Suspense } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
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
  ShieldCheck,
  BarChart3,
  Database,
  ChevronsUpDown,
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

import { clearToken, getUserEmail } from "@/lib/auth"
import { fetchUsers, deleteUser, restoreUser, getAvatarUrl, type User } from "@/lib/users"
import { formatDate } from "@/lib/date"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { fetchAllRoles, type RbacRole } from "@/lib/role"
import { UsersActionDialog } from "./users-action-dialog"
import { ChangePasswordDialog } from "./change-password-dialog"
import { RolesDialog } from "./roles-dialog"
import { DataTablePagination } from "@/components/data-table"

/* ------------------------------------------------------------------ */
/* Columns                                                            */
/* ------------------------------------------------------------------ */

const roleConfig: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>
    className: string
    colorClass: string
  }
> = {
  Admin: {
    icon: ShieldCheck,
    className:
      "bg-neutral-950/10 text-neutral-950 dark:bg-neutral-50/10 dark:text-neutral-50",
    colorClass: "text-neutral-950 dark:text-neutral-50",
  },
  "Data Analytics": {
    icon: BarChart3,
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    colorClass: "text-blue-700 dark:text-blue-300",
  },
  "Data Operator": {
    icon: Database,
    className:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    colorClass: "text-green-700 dark:text-green-300",
  },
}

const columns: ColumnDef<User>[] = [
  {
    id: "avatar",
    header: "",
    enableGlobalFilter: false,
    enableSorting: false,
    size: 40,
    cell: ({ row }) => {
      const user = row.original
      const avatarSrc = getAvatarUrl(user.id)
      return (
        <Avatar className="size-8">
          <AvatarImage src={avatarSrc} alt={user.name} />
          <AvatarFallback className="text-xs">
            {user.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )
    },
  },
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
    accessorKey: "roles",
    header: "Roles",
    cell: ({ row }) => {
      const rolesStr = row.getValue<string>("roles")
      if (!rolesStr) return <span className="text-muted-foreground">—</span>
      const roleNames = rolesStr.split(", ").filter(Boolean)
      return (
        <div className="flex flex-wrap gap-1">
          {roleNames.map((name) => {
            const cfg = roleConfig[name]
            const Icon = cfg?.icon ?? Shield
            return (
              <Badge
                key={name}
                variant="secondary"
                className={cn(
                  "h-6 gap-1.5 px-2.5 text-sm font-medium",
                  cfg?.className ?? "",
                )}
              >
                <Icon className="size-4" />
                {name}
              </Badge>
            )
          })}
        </div>
      )
    },
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
/* Users page content (needs Suspense for useSearchParams)            */
/* ------------------------------------------------------------------ */

function UsersPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  // --- URL-backed filter state ---
  const search = searchParams.get("q") ?? ""
  const statusFilter = (searchParams.get("status") as "all" | "active" | "deleted") ?? "all"
  const emailFilter = (searchParams.get("email") as "all" | "verified" | "unverified") ?? "all"
  const roleFilter = useMemo(
    () => (searchParams.get("roles") ? searchParams.get("roles")!.split(",") : []),
    [searchParams],
  )
  const page = Number(searchParams.get("page")) || 0
  const pageSize = Number(searchParams.get("pageSize")) || 10

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value === null) params.delete(key)
      else params.set(key, value)
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [searchParams, router, pathname],
  )

  const setSearch = (v: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (v) params.set("q", v)
    else params.delete("q")
    // Reset to page 0 when search changes
    params.delete("page")
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const setStatusFilter = (v: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (v === "all") params.delete("status")
    else params.set("status", v)
    params.delete("page")
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const setEmailFilter = (v: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (v === "all") params.delete("email")
    else params.set("email", v)
    params.delete("page")
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const setRoleFilter = (v: string[] | ((prev: string[]) => string[])) => {
    const next = typeof v === "function" ? v(roleFilter) : v
    const params = new URLSearchParams(searchParams.toString())
    if (next.length > 0) params.set("roles", next.join(","))
    else params.delete("roles")
    params.delete("page")
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const setPage = (n: number) => {
    const params = new URLSearchParams(searchParams.toString())
    if (n > 0) params.set("page", String(n))
    else params.delete("page")
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const setPageSize = (n: number) => {
    const params = new URLSearchParams(searchParams.toString())
    if (n !== 10) params.set("pageSize", String(n))
    else params.delete("pageSize")
    params.delete("page")
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  // --- localStorage persistence ---
  const LS_KEY = "goxus_users_query"

  function saveToLS(value: string) {
    localStorage.setItem(LS_KEY, value)
    // Dispatch synthetic StorageEvent so same-tab subscribers (sidebar, header) update
    window.dispatchEvent(
      new StorageEvent("storage", { key: LS_KEY, newValue: value }),
    )
  }

  // Restore from localStorage on first mount if URL has no filter params
  const restored = useRef(false)

  useEffect(() => {
    if (restored.current) return
    restored.current = true

    const hasFilters =
      searchParams.has("q") ||
      searchParams.has("status") ||
      searchParams.has("email") ||
      searchParams.has("roles")
    if (hasFilters) {
      // URL has filters — sync to localStorage
      saveToLS(searchParams.toString())
      return
    }

    const saved = localStorage.getItem(LS_KEY)
    if (saved) {
      router.replace(`${pathname}?${saved}`, { scroll: false })
    }
  }, [])

  // Persist to localStorage on every filter change (skip first render)
  const [skipLSSync, setSkipLSSync] = useState(true)

  useEffect(() => {
    if (skipLSSync) {
      setSkipLSSync(false)
      return
    }
    saveToLS(searchParams.toString())
  }, [searchParams])

  // --- Data ---
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // --- Role filter sorted by allRoles order (not selection order) ---
  const [allRoles, setAllRoles] = useState<RbacRole[]>([])

  const sortedRoleFilter = useMemo(
    () =>
      allRoles
        .filter((r) => roleFilter.includes(r.name))
        .map((r) => r.name),
    [allRoles, roleFilter],
  )

  // --- Dialogs ---
  const [deleteDialog, setDeleteDialog] = useState<User | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [actionOpen, setActionOpen] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [passwordDialog, setPasswordDialog] = useState<User | null>(null)
  const [rolesDialog, setRolesDialog] = useState<User | null>(null)

  // --- Current user ---
  const currentUserEmail = useMemo(() => getUserEmail(), [])

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
  /* Fetch all roles                                                   */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    const controller = new AbortController()
    fetchAllRoles(controller.signal).then(setAllRoles).catch(() => {})
    return () => controller.abort()
  }, [])

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
    if (roleFilter.length > 0) {
      result = result.filter((u) => {
        if (!u.roles) return false
        const userRoles = u.roles.split(", ").filter(Boolean)
        return userRoles.some((r) => roleFilter.includes(r))
      })
    }
    return result
  }, [allUsers, statusFilter, emailFilter, roleFilter])

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

  // Clamp page if it exceeds totalPages (e.g. filters reduce results)
  useEffect(() => {
    if (page >= totalPages && page !== 0) {
      const params = new URLSearchParams(searchParams.toString())
      params.delete("page")
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    }
  }, [page, totalPages, searchParams, router, pathname])

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
                <TableHead>Roles</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
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
        <Popover>
          <PopoverTrigger
            render={(props) => (
              <Button
                {...props}
                variant="outline"
                size="sm"
                className="h-8 gap-1 data-[state=open]:bg-muted"
              >
                <Shield className="size-4" />
                Roles
                {roleFilter.length > 0 && (
                  <div className="flex items-center gap-0.5">
                    {sortedRoleFilter.map((name) => {
                      const cfg = roleConfig[name]
                      const Icon = cfg?.icon ?? Shield
                      return (
                        <span
                          key={name}
                          className="flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium"
                        >
                          <Icon className={cn("size-3", cfg?.colorClass)} />
                          <span className="hidden sm:inline">{name}</span>
                        </span>
                      )
                    })}
                  </div>
                )}
                <ChevronsUpDown className="size-3.5 text-muted-foreground" />
              </Button>
            )}
          />
          <PopoverContent className="w-56 p-2" align="start">
            <div className="flex flex-col gap-0.5">
              {allRoles.length > 0 ? (
                allRoles.map((role) => {
                  const cfg = roleConfig[role.name]
                  const Icon = cfg?.icon ?? Shield
                  const selected = roleFilter.includes(role.name)
                  return (
                    <div
                      key={role.id}
                      className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                      onClick={() => {
                        setRoleFilter((prev) =>
                          selected
                            ? prev.filter((r) => r !== role.name)
                            : [...new Set([...prev, role.name])],
                        )
                      }}
                    >
                      <Checkbox checked={selected} />
                      <Icon
                        className={cn(
                          "size-4",
                          cfg?.colorClass ?? "text-muted-foreground",
                        )}
                      />
                      {role.name}
                    </div>
                  )
                })
              ) : (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  No roles available
                </p>
              )}
            </div>
            {roleFilter.length > 0 && (
              <>
                <hr className="mx-1 my-1.5 border-t border-border" />
                <button
                  onClick={() => setRoleFilter([])}
                  className="w-full cursor-pointer rounded-md px-2 py-1.5 text-center text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  Clear filter
                </button>
              </>
            )}
          </PopoverContent>
        </Popover>
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
                                  onClick={() => setRolesDialog(user)}
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
                                {user.deleted_at ? (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handleRestore(user)}
                                    >
                                      <RotateCcw className="mr-2 size-4" />
                                      Restore
                                    </DropdownMenuItem>
                                  </>
                                ) : user.email !== currentUserEmail ? (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={() => setDeleteDialog(user)}
                                    >
                                      <Trash2 className="mr-2 size-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </>
                                ) : null}
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
                  colSpan={6}
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
      <RolesDialog
        open={!!rolesDialog}
        onOpenChange={(open) => {
          if (!open) setRolesDialog(null)
        }}
        userId={rolesDialog?.id ?? 0}
        userName={rolesDialog?.name ?? ""}
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

/* ------------------------------------------------------------------ */
/* Page export (Suspense wrapper for useSearchParams)                 */
/* ------------------------------------------------------------------ */

export default function UsersPage() {
  return (
    <Suspense
      fallback={
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
                  <TableHead>Roles</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
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
      }
    >
      <UsersPageContent />
    </Suspense>
  )
}