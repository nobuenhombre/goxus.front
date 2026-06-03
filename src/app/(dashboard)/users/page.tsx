"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Search, MoreHorizontal, Plus, ChevronLeft, ChevronRight, Trash2, Shield } from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
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
import { fetchUsers, deleteUser, type User } from "@/lib/users"
import { formatDate } from "@/lib/date"

const PAGE_SIZE = 10

export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearchState] = useState("")
  const [page, setPage] = useState(0)

  const handleSearchChange = useCallback((value: string) => {
    setSearchState(value)
    setPage(0)
  }, [])
  const [deleteDialog, setDeleteDialog] = useState<User | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Fetch users on mount — classic async data-loading pattern with cleanup.
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)

    fetchUsers(controller.signal)
      .then((data) => {
        setUsers(data)
        setPage(0)
      })
      .catch((err) => {
        if (err.name === "AbortError") return
        const msg = err instanceof Error ? err.message : "Failed to load users"
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
      })
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [router])

  const filtered = useMemo(() => {
    if (!search.trim()) return users
    const q = search.toLowerCase()
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    )
  }, [users, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))

  const paged = useMemo(() => {
    return filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  }, [filtered, page])

  const handleDelete = async () => {
    if (!deleteDialog) return
    setDeleting(true)
    try {
      await deleteUser(deleteDialog.id)
      setUsers((prev) => prev.filter((u) => u.id !== deleteDialog.id))
      setDeleteDialog(null)
    } catch (err) {
      console.error("Delete failed", err)
    } finally {
      setDeleting(false)
    }
  }

  // --- Loading state ---
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
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
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

  // --- Error state ---
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

  // --- Main render ---
  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">
            {users.length} user{users.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <Button>
          <Plus className="mr-2 size-4" />
          Add User
        </Button>
      </div>

      {/* Search */}
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Filter users..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="ps-9"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="group/row">
              <TableHead className="bg-background group-hover/row:bg-muted">
                Name
              </TableHead>
              <TableHead className="bg-background group-hover/row:bg-muted">
                Email
              </TableHead>
              <TableHead className="bg-background group-hover/row:bg-muted">
                Status
              </TableHead>
              <TableHead className="bg-background group-hover/row:bg-muted">
                Created
              </TableHead>
              <TableHead className="w-12 bg-background group-hover/row:bg-muted" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length > 0 ? (
              paged.map((user) => (
                <TableRow
                  key={user.id}
                  className="group/row"
                >
                  <TableCell className="bg-background group-hover/row:bg-muted font-medium">
                    {user.name}
                  </TableCell>
                  <TableCell className="bg-background group-hover/row:bg-muted">
                    {user.email}
                  </TableCell>
                  <TableCell className="bg-background group-hover/row:bg-muted">
                    {user.email_verified_at ? (
                      <Badge
                        variant="outline"
                        className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                      >
                        Verified
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-amber-500/30 text-amber-600 dark:text-amber-400"
                      >
                        Pending
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="bg-background group-hover/row:bg-muted text-muted-foreground">
                    {formatDate(user.created_at)}
                  </TableCell>
                  <TableCell className="bg-background group-hover/row:bg-muted">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={(props) => <Button {...props} variant="ghost" size="icon-sm" className="size-8" />}>
                        <MoreHorizontal className="size-4" />
                        <span className="sr-only">Actions</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuGroup>
                          <DropdownMenuLabel>
                            {user.name}
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => alert("Edit user — coming soon")}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => alert("Manage roles — coming soon")}>
                            <Shield className="mr-2 size-4" />
                            Roles
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteDialog(user)}
                          >
                            <Trash2 className="mr-2 size-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 bg-background text-center text-muted-foreground"
                >
                  {search ? "No users match your search." : "No users found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page {page + 1} of {totalPages}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            <ChevronLeft className="size-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* Delete confirmation dialog */}
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
