import { test, expect } from "@playwright/test"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

test.describe("Users page — soft_deleted filter (all|active|deleted)", () => {
  test("filter tabs correctly show/hide deleted users", async ({ page }) => {
    // Login
    await page.goto("/login")
    await page.getByLabel(/email/i).fill("nobuenhombre@yandex.ru")
    await page.getByLabel(/password/i).fill("123")
    await page.getByRole("button", { name: /sign in/i }).click()
    await expect(page).toHaveURL("/")

    // ── Create two test users via API ──
    const prefix = `filter-e2e-${Date.now()}`
    const activeEmail = `${prefix}-active@test.com`
    const deletedEmail = `${prefix}-deleted@test.com`

    const token = await page.evaluate(() => localStorage.getItem("goxus_token"))
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }

    // Create active user
    const activeRes = await page.request.post(`${API_BASE}/api/v1/entity/user/`, {
      headers,
      data: { name: "Filter Active", email: activeEmail, password: "test123" },
    })
    expect(activeRes.ok()).toBeTruthy()

    // Create user to be deleted
    const deleteRes = await page.request.post(`${API_BASE}/api/v1/entity/user/`, {
      headers,
      data: { name: "Filter Deleted", email: deletedEmail, password: "test123" },
    })
    expect(deleteRes.ok()).toBeTruthy()
    const deleteBody = await deleteRes.json()
    const deleteUserId = deleteBody.data.id

    // Soft-delete the second user via API
    const delResp = await page.request.delete(
      `${API_BASE}/api/v1/entity/user/${deleteUserId}`,
      { headers },
    )
    expect(delResp.ok()).toBeTruthy()

    // Navigate to Users
    await page.getByRole("link", { name: /users/i }).first().click()
    await expect(page).toHaveURL("/users")
    await expect(page.getByRole("table")).toBeVisible({ timeout: 10000 })

    // 6 tabs: All(0), Active(1), Deleted(2), All(3), Verified(4), Unverified(5)
    // Scope to the first tabs-list (soft deleted)
    const softDeletedTabsList = page.locator('[data-slot="tabs-list"]').nth(0)
    const allTab = softDeletedTabsList.locator('[data-slot="tabs-trigger"]').nth(0)
    const activeTab = softDeletedTabsList.locator('[data-slot="tabs-trigger"]').nth(1)
    const deletedTab = softDeletedTabsList.locator('[data-slot="tabs-trigger"]').nth(2)

    await expect(allTab).toBeVisible()
    await expect(activeTab).toBeVisible()
    await expect(deletedTab).toBeVisible()

    // Search by common prefix so only our 2 test users are in the table
    const searchInput = page.locator('input[placeholder="Filter users..."]')
    await searchInput.fill(prefix)

    // Wait for search to settle
    await expect(page.getByRole("row")).toHaveCount(3, { timeout: 5000 }) // header + 2 data rows

    // ── Filter: All ──
    await allTab.click()
    await page.waitForTimeout(300)
    await expect(
      page.getByRole("row").filter({ hasText: activeEmail }),
    ).toBeVisible()
    await expect(
      page.getByRole("row").filter({ hasText: deletedEmail }),
    ).toBeVisible()

    // ── Filter: Deleted ──
    await deletedTab.click()
    await page.waitForTimeout(300)

    // Deleted user should be visible
    await expect(
      page.getByRole("row").filter({ hasText: deletedEmail }),
    ).toBeVisible()

    // Active user should NOT be visible
    await expect(
      page.getByRole("row").filter({ hasText: activeEmail }),
    ).not.toBeVisible()

    // ── Filter: Active ──
    await activeTab.click()
    await page.waitForTimeout(300)

    // Active user should be visible
    await expect(
      page.getByRole("row").filter({ hasText: activeEmail }),
    ).toBeVisible()

    // Deleted user should NOT be visible
    await expect(
      page.getByRole("row").filter({ hasText: deletedEmail }),
    ).not.toBeVisible()

    // ── Filter: All (verify both visible again) ──
    await allTab.click()
    await page.waitForTimeout(300)

    // Both should be visible
    await expect(
      page.getByRole("row").filter({ hasText: activeEmail }),
    ).toBeVisible()
    await expect(
      page.getByRole("row").filter({ hasText: deletedEmail }),
    ).toBeVisible()
  })
})