// Shared API fetch helpers — can be imported from both Server and Client Components.
// Note: getToken() is guarded with typeof window checks, so SSR calls must pass the token explicitly.

import { getToken } from "./auth"

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

export type ApiError = {
  status: number
  message: string
  body?: unknown
}

export class ApiResponseError extends Error {
  status: number
  body?: unknown

  constructor(status: number, message: string, body?: unknown) {
    super(message)
    this.name = "ApiResponseError"
    this.status = status
    this.body = body
  }
}

export async function apiFetch(
  path: string,
  opts?: RequestInit,
): Promise<Response> {
  const url = `${API_BASE}${path}`
  const token = getToken()

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts?.headers as Record<string, string>),
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  return fetch(url, {
    ...opts,
    headers,
  })
}

export async function apiFetchJSON<T>(
  path: string,
  opts?: RequestInit,
): Promise<T> {
  const res = await apiFetch(path, opts)

  if (!res.ok) {
    let errMsg = res.statusText || `${res.status}`
    let errBody: unknown
    try {
      errBody = await res.json()
      if (errBody && typeof errBody === "object" && "error" in errBody) {
        errMsg = (errBody as { error: string }).error
      }
    } catch {
      // ignore parse errors, use statusText
    }
    throw new ApiResponseError(res.status, errMsg, errBody)
  }

  return (await res.json()) as T
}
