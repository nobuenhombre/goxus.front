// User CRUD helpers — no React hooks, can be imported by Server and Client Components.

import { getToken } from "./auth"
import { apiFetch, apiFetchJSON } from "./api"

export interface User {
  id: number
  name: string
  email: string
  email_verified_at: string | null
  created_at: string
  updated_at: string
}

export interface UsersResponse {
  version: string
  data: User[]
  total_count: number
}

/* ------------------------------------------------------------------ */
/* Fetch                                                              */
/* ------------------------------------------------------------------ */

export async function fetchUsers(opts?: {
  limit?: number
  offset?: number
  signal?: AbortSignal
}): Promise<{ users: User[]; total: number }> {
  const token = getToken()
  if (!token) throw new Error("Not authenticated")

  const params = new URLSearchParams()
  if (opts?.limit !== undefined) params.set("limit", String(opts.limit))
  if (opts?.offset !== undefined) params.set("offset", String(opts.offset))
  const qs = params.toString()
  const url = qs ? `/api/v1/entity/user/?${qs}` : "/api/v1/entity/user/"

  const body = await apiFetchJSON<UsersResponse>(url, {
    signal: opts?.signal,
  })
  return { users: body.data, total: body.total_count }
}

/* ------------------------------------------------------------------ */
/* Delete                                                             */
/* ------------------------------------------------------------------ */

export async function deleteUser(id: number, signal?: AbortSignal): Promise<void> {
  const token = getToken()
  if (!token) throw new Error("Not authenticated")

  const res = await apiFetch(`/api/v1/entity/user/${id}`, {
    method: "DELETE",
    signal,
  })

  if (!res.ok) {
    let errMsg = res.statusText || "Delete failed"
    try {
      const errBody = await res.json()
      if (errBody?.error) errMsg = errBody.error
    } catch {
      // ignore parse errors
    }
    throw new Error(errMsg)
  }
}
