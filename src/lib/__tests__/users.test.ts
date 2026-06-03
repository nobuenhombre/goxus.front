import { describe, it, expect, beforeEach } from "vitest"
import { fetchUsers, deleteUser } from "../users"
import { setToken } from "../auth"
import { http, HttpResponse } from "msw"
import { server } from "./mocks/server"

beforeEach(() => {
  localStorage.clear()
})

describe("fetchUsers", () => {
  it("throws when no token in storage", async () => {
    await expect(fetchUsers()).rejects.toThrow("Not authenticated")
  })

  it("returns users on success", async () => {
    setToken("valid-token")
    const users = await fetchUsers()
    expect(users).toHaveLength(1)
    expect(users[0].name).toBe("Ivan")
  })

  it("redirects on 401 — throws user token not found", async () => {
    // Override handler for this test
    server.use(
      http.get("http://localhost:8080/api/v1/entity/user/", () => {
        return HttpResponse.json({ error: "user token not found" }, { status: 404 })
      }),
    )

    setToken("stale-token")
    await expect(fetchUsers()).rejects.toThrow("user token not found")
  })
})

describe("deleteUser", () => {
  it("throws when no token", async () => {
    await expect(deleteUser(1)).rejects.toThrow("Not authenticated")
  })

  it("succeeds with valid token", async () => {
    setToken("valid-token")
    await expect(deleteUser(1)).resolves.toBeUndefined()
  })
})