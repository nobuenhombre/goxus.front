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
  deleted_at: string | null
  roles: string
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

/* ------------------------------------------------------------------ */
/* Create                                                             */
/* ------------------------------------------------------------------ */

export async function createUser(data: {
  name: string
  email: string
  password: string
}): Promise<User> {
  const token = getToken()
  if (!token) throw new Error("Not authenticated")

  const res = await apiFetchJSON<{ version: string; data: User }>(
    "/api/v1/entity/user/",
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  )
  return res.data
}

export async function updateUser(
  id: number,
  data: { name: string; email: string },
): Promise<User> {
  const token = getToken()
  if (!token) throw new Error("Not authenticated")

  const res = await apiFetchJSON<{ version: string; data: User }>(
    `/api/v1/entity/user/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
  )
  return res.data
}

/* ------------------------------------------------------------------ */
/* Change password                                                    */
/* ------------------------------------------------------------------ */

export async function changeUserPassword(
  id: number,
  password: string,
): Promise<void> {
  const token = getToken()
  if (!token) throw new Error("Not authenticated")

  const res = await apiFetch(`/api/v1/entity/user/${id}/password`, {
    method: "PUT",
    body: JSON.stringify({ password }),
  })

  if (!res.ok) {
    let errMsg = res.statusText || "Change password failed"
    try {
      const errBody = await res.json()
      if (errBody?.error) errMsg = errBody.error
    } catch {
      // ignore parse errors
    }
    throw new Error(errMsg)
  }
}

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

export async function restoreUser(id: number, signal?: AbortSignal): Promise<User> {
  const token = getToken()
  if (!token) throw new Error("Not authenticated")

  const res = await apiFetchJSON<{ version: string; data: User }>(
    `/api/v1/entity/user/${id}/restore`,
    { method: "POST", signal },
  )
  return res.data
}

/* ------------------------------------------------------------------ */
/* Avatar helpers                                                      */
/* ------------------------------------------------------------------ */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

export function getAvatarUrl(userId: number): string {
  const url = `${API_BASE}/api/v1/entity/user/${userId}/avatar`
  return `${url}?t=${Date.now()}`
}

export async function uploadAvatar(
  userId: number,
  file: File,
  signal?: AbortSignal,
): Promise<void> {
  const token = getToken()
  if (!token) throw new Error("Not authenticated")

  const formData = new FormData()
  formData.append("avatar", file)

  const res = await fetch(`${API_BASE}/api/v1/entity/user/${userId}/avatar`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
    signal,
  })

  if (!res.ok) {
    let errMsg = "Upload failed"
    try {
      const body = await res.json()
      if (body?.error) errMsg = body.error
    } catch {
      // ignore
    }
    throw new Error(errMsg)
  }
}

export async function deleteAvatar(
  userId: number,
  signal?: AbortSignal,
): Promise<void> {
  const token = getToken()
  if (!token) throw new Error("Not authenticated")

  const res = await fetch(`${API_BASE}/api/v1/entity/user/${userId}/avatar`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
    signal,
  })

  if (!res.ok) {
    let errMsg = "Delete failed"
    try {
      const body = await res.json()
      if (body?.error) errMsg = body.error
    } catch {
      // ignore
    }
    throw new Error(errMsg)
  }
}
