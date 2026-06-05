import { test, expect } from "@playwright/test"

test.describe("Users page — email_verified_at filter (all|verified|unverified)", () => {
  test("filter tabs correctly show/hide unverified/verified users", async ({ page }) => {
    // Login
    await page.goto("/login")
    await page.getByLabel(/email/i).fill("nobuenhombre@yandex.ru")
    await page.getByLabel(/password/i).fill("123")
    await page.getByRole("button", { name: /sign in/i }).click()
    await expect(page).toHaveURL("/")

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

    // ── Filter: Verified ──
    await verifiedTab.click()
    await page.waitForTimeout(300)

    // Verified user (Павел) should be visible
    await expect(
      page.getByRole("row").filter({ hasText: "павел.8@yandex.ru" }),
    ).toBeVisible()

    // Unverified user (Mia) should NOT be visible
    await expect(
      page.getByRole("row").filter({ hasText: "mia.5@aol.com" }),
    ).not.toBeVisible({ timeout: 5000 })

    // ── Filter: Unverified ──
    await unverifiedTab.click()
    await page.waitForTimeout(300)

    // Unverified user (Mia) should be visible
    await expect(
      page.getByRole("row").filter({ hasText: "mia.5@aol.com" }),
    ).toBeVisible()

    // Verified user (Павел) should NOT be visible
    await expect(
      page.getByRole("row").filter({ hasText: "павел.8@yandex.ru" }),
    ).not.toBeVisible({ timeout: 5000 })

    // ── Filter: All ──
    await allTab.click()
    await page.waitForTimeout(300)

    // Both should be visible
    await expect(
      page.getByRole("row").filter({ hasText: "mia.5@aol.com" }),
    ).toBeVisible()
    await expect(
      page.getByRole("row").filter({ hasText: "павел.8@yandex.ru" }),
    ).toBeVisible()
  })
})