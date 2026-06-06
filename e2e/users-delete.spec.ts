import { test, expect } from "@playwright/test"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081"

test.describe("Users page — soft delete with filter=all", () => {
  test("deleted user stays visible when filter is all", async ({ page }) => {
    // Login
    await page.goto("/login")
    await page.getByLabel(/email/i).fill("nobuenhombre@yandex.ru")
    await page.getByLabel(/password/i).fill("123")
    await page.getByRole("button", { name: /sign in/i }).click()
    await expect(page).toHaveURL("/")

    // ── Create a unique test user via API ──
    const testEmail = `delete-e2e-${Date.now()}@test.com`
    const testName = "E2E Delete Test"

    const token = await page.evaluate(() => localStorage.getItem("goxus_token"))
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }

    const createRes = await page.request.post(`${API_BASE}/api/v1/entity/user/`, {
      headers,
      data: { name: testName, email: testEmail, password: "test123" },
    })
    expect(createRes.ok()).toBeTruthy()

    // Navigate to Users
    await page.getByRole("link", { name: /users/i }).first().click()
    await expect(page).toHaveURL("/users")
    await expect(page.getByRole("table")).toBeVisible()

    // Filter should default to "All"
    await expect(page.locator('[data-slot="tabs-trigger"]').first()).toBeVisible()

    // Search for the newly created user (it's on the last page, so search to find it fast)
    const searchInput = page.locator('input[placeholder="Filter users..."]')
    await searchInput.fill(testEmail)

    // Find the test user row
    const userRow = page.getByRole("row").filter({ hasText: testEmail })
    await expect(userRow).toBeVisible({ timeout: 10000 })

    // Click the actions menu (MoreHorizontal button inside this row)
    const actionsButton = userRow.getByRole("button").last()
    await actionsButton.click()

    // Wait for dropdown menu to fully render and stabilize (prevents "element detached from DOM" flakiness)
    await page.waitForTimeout(150)

    // Click Delete in the dropdown
    const deleteButton = page.getByRole("menuitem", { name: /delete/i })
    await expect(deleteButton).toBeVisible()
    await deleteButton.click()

    // Confirm delete dialog
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText(/are you sure/i)
    await dialog.getByRole("button", { name: /delete/i }).click()

    // Wait for the dialog to close and data to reload
    await expect(dialog).not.toBeVisible({ timeout: 10000 })

    // VERIFY: the user row is STILL visible (soft delete, filter is "all")
    await expect(userRow).toBeVisible({ timeout: 10000 })

    // VERIFY: the actions now show "Restore" instead of "Delete"
    await actionsButton.click()
    await expect(page.getByRole("menuitem", { name: /restore/i })).toBeVisible()
    await expect(page.getByRole("menuitem", { name: /delete/i })).not.toBeVisible()
  })
})