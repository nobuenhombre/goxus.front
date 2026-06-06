import { test, expect } from "@playwright/test"
import type { Page } from "@playwright/test"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081"

const SEED_EMAIL = "nobuenhombre@yandex.ru"
const SEED_PASSWORD = "123"

/**
 * Read total user count from the page header (e.g. "62 users total"). */
async function getTotalUsers(page: Page): Promise<number> {
  const text = await page.getByText(/users? total/i).textContent()
  if (!text) throw new Error("Could not find users total text")
  const m = text.match(/(\d+)/)
  if (!m) throw new Error(`Could not parse total from "${text}"`)
  return parseInt(m[1], 10)
}

/**
 * Create `count` test users via the backend API.
 * Returns the common email prefix so tests can search for them.
 * Requires the page to already be logged in (token in localStorage).
 */
async function createTestUsers(page: Page, count: number): Promise<string> {
  const prefix = `pag-${Date.now()}-`
  const token = await page.evaluate(() => localStorage.getItem("goxus_token"))
  if (!token) throw new Error("No token found — login first")

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  }

  for (let i = 0; i < count; i++) {
    const email = `${prefix}${i}@test.com`
    const res = await page.request.post(`${API_BASE}/api/v1/entity/user/`, {
      headers,
      data: { name: `Test User ${i}`, email, password: "test123" },
    })
    if (!res.ok()) {
      const body = await res.text()
      throw new Error(`Failed to create user ${email}: HTTP ${res.status()} ${body}`)
    }
  }
  return prefix
}

/** Number of test users to create — enough for 2 pages at pageSize=10 */
const TEST_USERS_COUNT = 10 // 10 + 1 seed = 11 total, ceil(11/10) = 2 pages

test.describe.serial("Users page — pagination", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto("/login")
    await page.getByLabel(/email/i).fill(SEED_EMAIL)
    await page.getByLabel(/password/i).fill(SEED_PASSWORD)
    await page.getByRole("button", { name: /sign in/i }).click()
    await expect(page).toHaveURL("/")

    // Navigate to Users
    await page.getByRole("link", { name: /users/i }).first().click()
    await expect(page).toHaveURL("/users")
    await expect(page.getByRole("table")).toBeVisible()

    // Create test users via API and store the prefix for scoping
    const prefix = await createTestUsers(page, TEST_USERS_COUNT)
    await page.evaluate((p) => localStorage.setItem("pag_prefix", p), prefix)
    // Reload the page so the newly created users appear in the frontend state
    await page.reload()
    // Wait for real data to load — the initial render shows "0 users total" (allUsers = []),
    // so checking visibility alone is insufficient. Wait for a non-zero total instead.
    await expect(page.getByText(/[1-9]\d* users? total/i)).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole("table")).toBeVisible()
  })

  /* ------------------------------------------------------------------ */
  /* Basic pagination                                                    */
  /* ------------------------------------------------------------------ */

  test("shows correct total page count at default pageSize", async ({ page }) => {
    const total = await getTotalUsers(page)
    const expectedPages = Math.ceil(total / 10)
    const expectedRows = Math.min(total, 10) + 1

    await expect(page.getByRole("row")).toHaveCount(expectedRows, { timeout: 15000 })

    const indicator = page.getByText(/page \d+ of/i).first()
    await expect(indicator).toBeVisible()
    await expect(indicator).toHaveText(new RegExp(`page 1 of ${expectedPages}`, "i"))
  })

  test("renders page number buttons for all pages", async ({ page }) => {
    const total = await getTotalUsers(page)
    const expectedPages = Math.ceil(total / 10)

    // Use first() to handle accessible name collisions (e.g. "Go to page 1" matches both page 1 and 10)
    const page1Btn = page.getByRole("button", { name: /go to page 1/i }).first()
    const page2Btn = page.getByRole("button", { name: /go to page 2/i }).first()
    const lastBtn = page.getByRole("button", { name: new RegExp(`go to page ${expectedPages}`, "i") }).first()

    await expect(page1Btn).toBeVisible()
    await expect(page2Btn).toBeVisible()
    await expect(lastBtn).toBeVisible()
  })

  test("next button navigates to page 2", async ({ page }) => {
    const total = await getTotalUsers(page)
    const expectedPages = Math.ceil(total / 10)
    expect(expectedPages).toBeGreaterThanOrEqual(2)

    const nextBtn = page.getByRole("button", { name: /go to next page/i })
    await expect(nextBtn).toBeEnabled()
    await nextBtn.click()

    const indicator = page.getByText(/page \d+ of/i).first()
    await expect(indicator).toHaveText(new RegExp(`page 2 of ${expectedPages}`, "i"))
  })

  test("prev button navigates back to page 1", async ({ page }) => {
    const total = await getTotalUsers(page)
    const expectedPages = Math.ceil(total / 10)
    expect(expectedPages).toBeGreaterThanOrEqual(2)

    const nextBtn = page.getByRole("button", { name: /go to next page/i })
    await nextBtn.click()

    const prevBtn = page.getByRole("button", { name: /go to previous page/i })
    await expect(prevBtn).toBeEnabled()
    await prevBtn.click()

    const indicator = page.getByText(/page \d+ of/i).first()
    await expect(indicator).toHaveText(new RegExp(`page 1 of ${expectedPages}`, "i"))
  })

  test("last button navigates to last page", async ({ page }) => {
    const total = await getTotalUsers(page)
    const expectedPages = Math.ceil(total / 10)
    expect(expectedPages).toBeGreaterThanOrEqual(2)

    const lastBtn = page.getByRole("button", { name: /go to last page/i })
    await expect(lastBtn).toBeEnabled()
    await lastBtn.click()

    const indicator = page.getByText(/page \d+ of/i).first()
    await expect(indicator).toHaveText(new RegExp(`page ${expectedPages} of ${expectedPages}`, "i"))
  })

  test("first button navigates to page 1 from last page", async ({ page }) => {
    const total = await getTotalUsers(page)
    const expectedPages = Math.ceil(total / 10)
    expect(expectedPages).toBeGreaterThanOrEqual(2)

    // Go to last page first
    const lastBtn = page.getByRole("button", { name: /go to last page/i })
    await lastBtn.click()

    // Then click First
    const firstBtn = page.getByRole("button", { name: /go to first page/i })
    await expect(firstBtn).toBeEnabled()
    await firstBtn.click()

    const indicator = page.getByText(/page \d+ of/i).first()
    await expect(indicator).toHaveText(new RegExp(`page 1 of ${expectedPages}`, "i"))
  })

  test("clicking page number button navigates to correct page", async ({ page }) => {
    const total = await getTotalUsers(page)
    const expectedPages = Math.ceil(total / 10)
    expect(expectedPages).toBeGreaterThanOrEqual(2)

    const targetPage = Math.min(2, expectedPages)
    const pageBtn = page.getByRole("button", { name: new RegExp(`go to page ${targetPage}`, "i") }).first()
    await expect(pageBtn).toBeVisible()
    await pageBtn.click()

    const indicator = page.getByText(/page \d+ of/i).first()
    await expect(indicator).toHaveText(new RegExp(`page ${targetPage} of ${expectedPages}`, "i"))
  })

  test("changing page size shows correct number of rows and updates page count", async ({ page }) => {
    await expect(page.getByRole("row").first()).toBeVisible({ timeout: 15000 })
    const total = await getTotalUsers(page)

    // Change page size to 20
    const selectTrigger = page.locator('[data-slot="combobox-trigger"]')
    await expect(selectTrigger).toBeVisible({ timeout: 10000 })
    await selectTrigger.click()

    const option20 = page.getByRole("option", { name: /^20$/ })
    await expect(option20).toBeVisible()
    await option20.click()

    const expectedPages = Math.ceil(total / 20)
    const expectedRows = Math.min(total, 20) + 1

    await expect(page.getByRole("row")).toHaveCount(expectedRows, { timeout: 10000 })

    const indicator = page.getByText(/page \d+ of/i).first()
    await expect(indicator).toHaveText(new RegExp(`page 1 of ${expectedPages}`, "i"))
  })

  test("prev button is disabled on first page", async ({ page }) => {
    await expect(page.getByRole("row").first()).toBeVisible({ timeout: 15000 })

    const prevBtn = page.getByRole("button", { name: /go to previous page/i })
    await expect(prevBtn).toBeDisabled()

    const firstBtn = page.getByRole("button", { name: /go to first page/i })
    await expect(firstBtn).toBeDisabled()
  })

  test("next button is disabled on last page", async ({ page }) => {
    await expect(page.getByRole("row").first()).toBeVisible({ timeout: 15000 })

    // Go to last page
    const lastBtn = page.getByRole("button", { name: /go to last page/i })
    await lastBtn.click()

    const nextBtn = page.getByRole("button", { name: /go to next page/i })
    await expect(nextBtn).toBeDisabled()

    const lastBtnCheck = page.getByRole("button", { name: /go to last page/i })
    await expect(lastBtnCheck).toBeDisabled()
  })

  test("pagination resets to page 1 when changing page size from another page", async ({ page }) => {
    await expect(page.getByRole("row").first()).toBeVisible({ timeout: 15000 })
    const total = await getTotalUsers(page)
    const expectedPages = Math.ceil(total / 50)

    // Go to page 2
    const page2Btn = page.getByRole("button", { name: /go to page 2/i }).first()
    await expect(page2Btn).toBeVisible()
    await page2Btn.click()

    // Change page size to 50
    const selectTrigger = page.locator('[data-slot="combobox-trigger"]')
    await expect(selectTrigger).toBeVisible({ timeout: 10000 })
    await selectTrigger.click()

    const option50 = page.getByRole("option", { name: /^50$/ })
    await expect(option50).toBeVisible()
    await option50.click()

    // Should reset to page 1
    const indicator = page.getByText(/page \d+ of/i).first()
    await expect(indicator).toHaveText(new RegExp(`page 1 of ${expectedPages}`, "i"))
  })

  /* ------------------------------------------------------------------ */
  /* Filter + pagination interactions                                    */
  /* ------------------------------------------------------------------ */

  test("search filter reduces page count", async ({ page }) => {
    const prefix = await page.evaluate(() => localStorage.getItem("pag_prefix"))
    if (!prefix) throw new Error("No pag_prefix found")

    const total = await getTotalUsers(page)
    const expectedFullPages = Math.ceil(total / 10)

    // Verify initial page count
    const indicator = page.getByText(/page \d+ of/i).first()
    await expect(indicator).toHaveText(new RegExp(`page 1 of ${expectedFullPages}`, "i"))

    // Search for prefix to scope to only our test users
    const searchInput = page.locator('input[placeholder="Filter users..."]')
    await searchInput.fill(prefix)

    // Should show TEST_USERS_COUNT results + header
    await expect(page.getByRole("row")).toHaveCount(TEST_USERS_COUNT + 1, { timeout: 5000 })
    await expect(indicator).toHaveText(/page 1 of 1/i)

    // Nav buttons should be disabled (only 1 page)
    const nextBtn = page.getByRole("button", { name: /go to next page/i })
    await expect(nextBtn).toBeDisabled()
    const prevBtn = page.getByRole("button", { name: /go to previous page/i })
    await expect(prevBtn).toBeDisabled()
  })

  test("search then clear restores original page count", async ({ page }) => {
    const prefix = await page.evaluate(() => localStorage.getItem("pag_prefix"))
    if (!prefix) throw new Error("No pag_prefix found")

    const total = await getTotalUsers(page)
    const expectedFullPages = Math.ceil(total / 10)

    // Search
    const searchInput = page.locator('input[placeholder="Filter users..."]')
    await searchInput.fill(prefix)
    await expect(page.getByRole("row")).toHaveCount(TEST_USERS_COUNT + 1, { timeout: 5000 })

    // Clear search
    await searchInput.clear()
    await expect(page.getByRole("row")).toHaveCount(11, { timeout: 5000 })

    // Page count should be back to original
    const indicator = page.getByText(/page \d+ of/i).first()
    await expect(indicator).toHaveText(new RegExp(`page 1 of ${expectedFullPages}`, "i"))
  })

  test("status filter + pagination: deleted filter shows fewer pages", async ({ page }) => {
    await expect(page.getByRole("row").first()).toBeVisible({ timeout: 15000 })

    // Get total pages on "All" filter
    const indicator = page.getByText(/page \d+ of/i).first()
    const allText = await indicator.textContent()
    const allPages = parseInt((allText ?? "").match(/of (\d+)/i)?.[1] ?? "0", 10)
    expect(allPages).toBeGreaterThanOrEqual(2)

    // Click "Deleted" tab
    const softDeletedTabsList = page.locator('[data-slot="tabs-list"]').nth(0)
    const deletedTab = softDeletedTabsList.locator('[data-slot="tabs-trigger"]').nth(2)
    await deletedTab.click()
    await page.waitForTimeout(300)

    // Deleted page count should be strictly less than "All" page count
    const deletedText = await indicator.textContent()
    const deletedPages = parseInt((deletedText ?? "").match(/of (\d+)/i)?.[1] ?? "99", 10)
    expect(deletedPages).toBeLessThan(allPages)

    // Nav buttons disabled if only 1 page
    const nextBtn = page.getByRole("button", { name: /go to next page/i })
    const prevBtn = page.getByRole("button", { name: /go to previous page/i })
    if (deletedPages === 1) {
      await expect(nextBtn).toBeDisabled()
      await expect(prevBtn).toBeDisabled()
    }
  })

  test("pagination persists page when switching status filter", async ({ page }) => {
    const total = await getTotalUsers(page)
    const expectedFullPages = Math.ceil(total / 10)

    const softDeletedTabsList = page.locator('[data-slot="tabs-list"]').nth(0)

    // Click "Active" tab
    const activeTab = softDeletedTabsList.locator('[data-slot="tabs-trigger"]').nth(1)
    await activeTab.click()
    await page.waitForTimeout(300)

    // Go back to "All"
    const allTab = softDeletedTabsList.locator('[data-slot="tabs-trigger"]').nth(0)
    await allTab.click()
    await page.waitForTimeout(300)

    // Should restore original page count
    const indicator = page.getByText(/page \d+ of/i).first()
    await expect(indicator).toHaveText(new RegExp(`page 1 of ${expectedFullPages}`, "i"))
    await expect(page.getByRole("row")).toHaveCount(11, { timeout: 5000 })
  })
})