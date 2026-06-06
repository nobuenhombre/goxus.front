import { test, expect } from "@playwright/test"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081"

const SEED_EMAIL = "nobuenhombre@yandex.ru"

test.describe("Users page — edit dialog form fields", () => {
  test("edit dialog shows correct user data on first and subsequent opens", async ({ page }) => {
    // Login
    await page.goto("/login")
    await page.getByLabel(/email/i).fill(SEED_EMAIL)
    await page.getByLabel(/password/i).fill("123")
    await page.getByRole("button", { name: /sign in/i }).click()
    await expect(page).toHaveURL("/")

    // ── Create two test users via API ──
    const prefix = `edit-e2e-${Date.now()}`
    const email1 = `${prefix}-1@test.com`
    const email2 = `${prefix}-2@test.com`
    const name1 = "EditTestAlice"
    const name2 = "EditTestBob"

    const token = await page.evaluate(() => localStorage.getItem("goxus_token"))
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }

    const res1 = await page.request.post(`${API_BASE}/api/v1/entity/user/`, {
      headers,
      data: { name: name1, email: email1, password: "test123" },
    })
    expect(res1.ok()).toBeTruthy()

    const res2 = await page.request.post(`${API_BASE}/api/v1/entity/user/`, {
      headers,
      data: { name: name2, email: email2, password: "test123" },
    })
    expect(res2.ok()).toBeTruthy()

    // Navigate to Users
    await page.getByRole("link", { name: /users/i }).first().click()
    await expect(page).toHaveURL("/users")
    await expect(page.getByRole("table")).toBeVisible()

    // Search for the first user to narrow the table (avoids pagination issues)
    await page.locator('input[placeholder="Filter users..."]').fill(email1)

    // ── Open edit for first user ──
    const user1Row = page.getByRole("row").filter({ hasText: email1 })
    await expect(user1Row).toBeVisible({ timeout: 10000 })

    // Open actions menu
    const user1Actions = user1Row.getByRole("button").last()
    await user1Actions.click()
    // Wait for dropdown menu to fully render and stabilize (prevents "element detached from DOM" flakiness)
    await page.waitForTimeout(150)
    await page.getByRole("menuitem", { name: /edit/i }).click()

    // Dialog should appear with user1's data
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText("Edit User")
    await expect(dialog.getByLabel(/name/i)).toHaveValue(name1)
    await expect(dialog.getByLabel(/email/i)).toHaveValue(email1)

    // Close dialog with Escape
    await page.keyboard.press("Escape")
    await expect(dialog).not.toBeVisible()

    // Search for the second user
    await page.locator('input[placeholder="Filter users..."]').fill(email2)

    // ── Open edit for second user ──
    const user2Row = page.getByRole("row").filter({ hasText: email2 })
    await expect(user2Row).toBeVisible({ timeout: 10000 })

    const user2Actions = user2Row.getByRole("button").last()
    await user2Actions.click()
    // Wait for dropdown menu to fully render and stabilize
    await page.waitForTimeout(150)
    await page.getByRole("menuitem", { name: /edit/i }).click()

    // Dialog should appear with user2's data — NOT user1's
    const dialog2 = page.getByRole("dialog")
    await expect(dialog2).toBeVisible()
    await expect(dialog2).toContainText("Edit User")
    await expect(dialog2.getByLabel(/name/i)).toHaveValue(name2)
    await expect(dialog2.getByLabel(/email/i)).toHaveValue(email2)
  })
})