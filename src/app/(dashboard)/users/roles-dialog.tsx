"use client"

import { useState, useEffect, useCallback } from "react"
import { Spinner, ShieldCheck, ChartBar, Database, Shield } from "@phosphor-icons/react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"

import {
  fetchAllRoles,
  fetchUserRoles,
  assignUserRole,
  revokeUserRole,
  type RbacRole,
} from "@/lib/role"

/* ------------------------------------------------------------------ */
/* Icon + colour mapping — only the icon gets coloured                */
/* ------------------------------------------------------------------ */

const roleIconMap: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; colorClass: string }
> = {
  admin: {
    icon: ShieldCheck,
    colorClass: "text-neutral-950 dark:text-neutral-50",
  },
  data_analytics: {
    icon: ChartBar,
    colorClass: "text-blue-600 dark:text-blue-400",
  },
  data_operator: {
    icon: Database,
    colorClass: "text-green-600 dark:text-green-400",
  },
}

function RoleIcon({ slug, className }: { slug: string; className?: string }) {
  const cfg = roleIconMap[slug]
  const Icon = cfg?.icon ?? Shield
  const color = cfg?.colorClass ?? "text-muted-foreground"
  return <Icon className={cn(color, className ?? "size-5 shrink-0")} />
}

/* ------------------------------------------------------------------ */
/* Dialog                                                             */
/* ------------------------------------------------------------------ */

type RolesDialogProps = {
  userId: number
  userName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function RolesDialog({
  userId,
  userName,
  open,
  onOpenChange,
  onSuccess,
}: RolesDialogProps) {
  const [allRoles, setAllRoles] = useState<RbacRole[]>([])
  const [userRoleSlugs, setUserRoleSlugs] = useState<Set<string>>(new Set())
  const [dirty, setDirty] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Load all roles + user roles when dialog opens
  useEffect(() => {
    if (!open) return
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const [all, userRoles] = await Promise.all([
          fetchAllRoles(),
          fetchUserRoles(userId),
        ])
        if (cancelled) return
        setAllRoles(all)
        setUserRoleSlugs(new Set(userRoles.map((r) => r.slug)))
        setDirty(new Set())
      } catch (err) {
        if (cancelled) return
        const msg =
          err instanceof Error ? err.message : "Failed to load roles"
        toast.error(msg)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [open, userId])

  const isChecked = useCallback(
    (slug: string) => {
      // User's current roles — dirty overrides
      if (dirty.has(slug)) return !userRoleSlugs.has(slug)
      return userRoleSlugs.has(slug)
    },
    [dirty, userRoleSlugs],
  )

  function toggleRole(slug: string) {
    setDirty((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) {
        next.delete(slug) // revert to original
      } else {
        next.add(slug) // mark as changed
      }
      return next
    })
  }

  async function handleSave() {
    if (dirty.size === 0) {
      onOpenChange(false)
      return
    }

    setSaving(true)
    try {
      for (const slug of dirty) {
        const currentlyHas = userRoleSlugs.has(slug)
        if (currentlyHas) {
          // Was checked → now unchecked → revoke
          await revokeUserRole(userId, slug)
        } else {
          // Was unchecked → now checked → assign
          await assignUserRole(userId, slug)
        }
      }
      toast.success("Roles updated successfully")
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to update roles"
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  function handleClose(open: boolean) {
    if (!open) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-start">
          <DialogTitle>Manage Roles</DialogTitle>
          <DialogDescription>
            Select roles for <strong>{userName}</strong>.{" "}
            Click save when you&apos;re done.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto py-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner className="size-6 animate-spin text-muted-foreground" weight="regular" />
            </div>
          ) : allRoles.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No roles available.
            </p>
          ) : (
            <div className="space-y-1">
              {allRoles.map((role) => {
                const checked = isChecked(role.slug)
                return (
                  <label
                    key={role.slug}
                    className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-muted"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleRole(role.slug)}
                    />
                    <RoleIcon slug={role.slug} />
                    <span className="text-sm font-medium">{role.name}</span>
                  </label>
                )
              })}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            type="button"
            onClick={handleSave}
            disabled={loading || saving || dirty.size === 0}
          >
            {saving && <Spinner className="mr-2 size-4 animate-spin" weight="regular" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}