import { describe, it, expect, beforeEach } from "vitest"
import {
  getToken,
  setToken,
  clearToken,
  isAuthenticated,
  login,
  logout,
  setUserInfo,
  getUserName,
  getUserEmail,
  clearUserInfo,
} from "../auth"

beforeEach(() => {
  localStorage.clear()
})

describe("auth token helpers", () => {
  it("getToken returns null when no token stored", () => {
    expect(getToken()).toBeNull()
  })

  it("setToken/getToken roundtrip", () => {
    setToken("my-token")
    expect(getToken()).toBe("my-token")
  })

  it("clearToken removes the token", () => {
    setToken("my-token")
    clearToken()
    expect(getToken()).toBeNull()
  })

  it("isAuthenticated returns true only when token exists", () => {
    expect(isAuthenticated()).toBe(false)
    setToken("x")
    expect(isAuthenticated()).toBe(true)
  })
})

describe("auth user info helpers", () => {
  it("getUserName returns null when not set", () => {
    expect(getUserName()).toBeNull()
  })

  it("setUserInfo/getUserName/getUserEmail roundtrip", () => {
    setUserInfo("Alice", "alice@example.com")
    expect(getUserName()).toBe("Alice")
    expect(getUserEmail()).toBe("alice@example.com")
  })

  it("clearUserInfo removes name and email", () => {
    setUserInfo("Bob", "bob@example.com")
    clearUserInfo()
    expect(getUserName()).toBeNull()
    expect(getUserEmail()).toBeNull()
  })

  it("logout clears token and user info", async () => {
    setToken("test-token")
    setUserInfo("Ivan", "ivan@example.com")
    await logout()
    expect(getToken()).toBeNull()
    expect(getUserName()).toBeNull()
    expect(getUserEmail()).toBeNull()
  })
})

describe("login", () => {
  it("returns LoginResponse on success", async () => {
    const data = await login({ email: "test@test.com", password: "123" })
    expect(data.token).toBe("test-token-123")
    expect(data.user_id).toBe(1)
    expect(data.name).toBe("Ivan")
  })
})

describe("logout", () => {
  it("clears token from localStorage", async () => {
    setToken("test-token-123")
    await logout()
    expect(getToken()).toBeNull()
  })
})
