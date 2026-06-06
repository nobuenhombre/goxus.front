/**
 * Role slugs (match values in the database).
 *
 * Suggested Lucide icons:
 *   Admin         → ShieldCheck
 *   DataAnalytics → BarChart3
 *   DataOperator  → Database
 */
export const Role = {
  /** ShieldCheck */
  Admin: "admin",
  /** BarChart3 */
  DataAnalytics: "data_analytics",
  /** DataOperator */
  DataOperator: "data_operator",
} as const

export type RoleSlug = (typeof Role)[keyof typeof Role]

export interface RbacRole {
  id: number
  name: string
  slug: string
  created_at: string
  updated_at: string
}

export interface RolesResponse {
  version: string
  data: RbacRole[]
}

/* ------------------------------------------------------------------ */
/* API calls                                                          */
/* ------------------------------------------------------------------ */

import { apiFetchJSON } from "./api"
import { getToken } from "./auth"

export async function fetchAllRoles(signal?: AbortSignal): Promise<RbacRole[]> {
  const token = getToken()
  if (!token) throw new Error("Not authenticated")

  const body = await apiFetchJSON<RolesResponse>("/api/v1/roles", { signal })
  return body.data
}

export async function fetchUserRoles(
  userId: number,
  signal?: AbortSignal,
): Promise<RbacRole[]> {
  const token = getToken()
  if (!token) throw new Error("Not authenticated")

  const body = await apiFetchJSON<RolesResponse>(
    `/api/v1/entity/user/${userId}/roles`,
    { signal },
  )
  return body.data
}

export async function assignUserRole(userId: number, roleSlug: string): Promise<void> {
  const token = getToken()
  if (!token) throw new Error("Not authenticated")

  await apiFetchJSON(`/api/v1/entity/user/${userId}/roles`, {
    method: "POST",
    body: JSON.stringify({ role_slug: roleSlug }),
  })
}

export async function revokeUserRole(userId: number, roleSlug: string): Promise<void> {
  const token = getToken()
  if (!token) throw new Error("Not authenticated")

  await apiFetchJSON(`/api/v1/entity/user/${userId}/roles/${roleSlug}`, {
    method: "DELETE",
  })
}