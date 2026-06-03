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
}

/* ------------------------------------------------------------------ */
/* Fetch                                                              */
/* ------------------------------------------------------------------ */

export async function fetchUsers(signal?: AbortSignal): Promise<User[]> {
  const token = getToken()
  if (!token) throw new Error("Not authenticated")

  const body = await apiFetchJSON<UsersResponse>("/api/v1/entity/user/", {
    signal,
  })
  return body.data
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
