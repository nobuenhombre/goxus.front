// Auth helpers — no React hooks, can be imported by Server and Client Components.
// Safe guards on typeof window prevent SSR crashes.

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  user_id: number
  name: string
  email: string
}

export interface ApiEnvelope<T> {
  status: boolean
  data: T
  error?: string
}

const TOKEN_KEY = "goxus_token"
const USER_NAME_KEY = "goxus_user_name"
const USER_EMAIL_KEY = "goxus_user_email"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

/* ------------------------------------------------------------------ */
/* Token helpers                                                       */
/* ------------------------------------------------------------------ */

export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(TOKEN_KEY)
}

export function isAuthenticated(): boolean {
  return !!getToken()
}

/* ------------------------------------------------------------------ */
/* User info helpers                                                   */
/* ------------------------------------------------------------------ */

export function setUserInfo(name: string, email: string, id?: number): void {
  if (typeof window === "undefined") return
  localStorage.setItem(USER_NAME_KEY, name)
  localStorage.setItem(USER_EMAIL_KEY, email)
  if (id !== undefined) {
    localStorage.setItem("goxus_user_id", String(id))
  }
}

export function getUserName(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(USER_NAME_KEY)
}

export function getUserEmail(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(USER_EMAIL_KEY)
}

export function getUserId(): number | null {
  if (typeof window === "undefined") return null
  const v = localStorage.getItem("goxus_user_id")
  return v ? Number(v) : null
}

export function clearUserInfo(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(USER_NAME_KEY)
  localStorage.removeItem(USER_EMAIL_KEY)
  localStorage.removeItem("goxus_user_id")
}

/* ------------------------------------------------------------------ */
/* HTTP calls                                                          */
/* ------------------------------------------------------------------ */

export async function login(req: LoginRequest): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  })

  const body = (await res.json()) as ApiEnvelope<LoginResponse>

  if (!res.ok || !body.status) {
    throw new Error(body.error || "Login failed")
  }

  return body.data
}

export async function logout(): Promise<void> {
  const token = getToken()
  if (!token) return

  try {
    await fetch(`${API_BASE}/api/v1/user/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch {
    // Ignore network errors — still clear local state.
  } finally {
    clearToken()
    clearUserInfo()
  }
}
