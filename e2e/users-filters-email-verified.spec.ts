import { test, expect } from "@playwright/test"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081"

const SEED_EMAIL = "nobuenhombre@yandex.ru"

test.describe("Users page — email_verified_at filter (all|verified|unverified)", () => {
  test("filter tabs correctly show/hide unverified/verified users", async ({ page }) => {
    // Login
    await page.goto("/login")
    await page.getByLabel(/email/i).fill(SEED_EMAIL)
    await page.getByLabel(/password/i).fill("123")
    await page.getByRole("button", { name: /sign in/i }).click()
    await expect(page).toHaveURL("/")

    // ── Create an unverified test user via API ──
    const testEmail = `email-filter-${Date.now()}@test.com`
    const testName = "EmailFilterTest"

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
    await expect(page.getByRole("table")).toBeVisible({ timeout: 10000 })

    // Scope to the second tabs-list (email filter group)
    const emailTabsList = page.locator('[data-slot="tabs-list"]').nth(1)
    const allTab = emailTabsList.locator('[data-slot="tabs-trigger"]').nth(0)
    const verifiedTab = emailTabsList.locator('[data-slot="tabs-trigger"]').nth(1)
    const unverifiedTab = emailTabsList.locator('[data-slot="tabs-trigger"]').nth(2)

    await expect(verifiedTab).toBeVisible()
    await expect(unverifiedTab).toBeVisible()

    // Helper: search input to narrow the table
    const searchInput = page.locator('input[placeholder="Filter users..."]')

    // ── Filter: Verified ──
    await verifiedTab.click()
    await page.waitForTimeout(300)

    // Search for seed user (verified) — should be visible
    await searchInput.fill(SEED_EMAIL)
    await expect(
      page.getByRole("cell", { name: SEED_EMAIL, exact: true }),
    ).toBeVisible()

    // Search for test user (unverified) — should NOT be visible
    await searchInput.fill(testEmail)
    await expect(
      page.getByRole("cell", { name: testEmail, exact: true }),
    ).not.toBeVisible({ timeout: 5000 })

    // ── Filter: Unverified ──
    await unverifiedTab.click()
    await page.waitForTimeout(300)

    // Search for test user (unverified) — should be visible
    await searchInput.fill(testEmail)
    await expect(
      page.getByRole("cell", { name: testEmail, exact: true }),
    ).toBeVisible()

    // Search for seed user (verified) — should NOT be visible
    await searchInput.fill(SEED_EMAIL)
    await expect(
      page.getByRole("cell", { name: SEED_EMAIL, exact: true }),
    ).not.toBeVisible({ timeout: 5000 })

    // ── Filter: All ──
    await allTab.click()
    await page.waitForTimeout(300)

    // Search for seed user — should be visible
    await searchInput.fill(SEED_EMAIL)
    await expect(
      page.getByRole("cell", { name: SEED_EMAIL, exact: true }),
    ).toBeVisible()

    // Search for test user — should be visible
    await searchInput.fill(testEmail)
    await expect(
      page.getByRole("cell", { name: testEmail, exact: true }),
    ).toBeVisible()
  })
})