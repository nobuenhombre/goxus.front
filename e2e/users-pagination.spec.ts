import { test, expect } from "@playwright/test"
import type { Page } from "@playwright/test"

/**
 * Read total user count from the page header (e.g. "62 users total").
 */
async function getTotalUsers(page: Page): Promise<number> {
  const text = await page.getByText(/users? total/i).textContent()
  if (!text) throw new Error("Could not find users total text")
  const m = text.match(/(\d+)/)
  if (!m) throw new Error(`Could not parse total from "${text}"`)
  return parseInt(m[1], 10)
}

test.describe("Users page — pagination", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto("/login")
    await page.getByLabel(/email/i).fill("nobuenhombre@yandex.ru")
    await page.getByLabel(/password/i).fill("123")
    await page.getByRole("button", { name: /sign in/i }).click()
    await expect(page).toHaveURL("/")

    // Navigate to Users
    await page.getByRole("link", { name: /users/i }).first().click()
    await expect(page).toHaveURL("/users")
    await expect(page.getByRole("table")).toBeVisible()
  })

  /* ------------------------------------------------------------------ */
  /* Basic pagination                                                    */
  /* ------------------------------------------------------------------ */

  test("shows correct total page count at default pageSize", async ({ page }) => {
    await expect(page.getByRole("row")).toHaveCount(11, { timeout: 15000 }) // 10 data + 1 header
    const total = await getTotalUsers(page)
    const expectedPages = Math.ceil(total / 10)
    const indicator = page.getByText(/page \d+ of/i).first()
    await expect(indicator).toBeVisible()
    await expect(indicator).toHaveText(new RegExp(`page 1 of ${expectedPages}`, "i"))
  })

  test("renders page number buttons for all pages", async ({ page }) => {
    await expect(page.getByRole("row")).toHaveCount(11, { timeout: 15000 })
    const total = await getTotalUsers(page)
    const expectedPages = Math.ceil(total / 10)

    // Check first 3 and last page buttons exist
    const page1Btn = page.getByRole("button", { name: /go to page 1/i })
    const page2Btn = page.getByRole("button", { name: /go to page 2/i })
    const page3Btn = page.getByRole("button", { name: /go to page 3/i })
    const lastBtn = page.getByRole("button", { name: new RegExp(`go to page ${expectedPages}`, "i") })

    await expect(page1Btn).toBeVisible()
    await expect(page2Btn).toBeVisible()
    await expect(page3Btn).toBeVisible()
    await expect(lastBtn).toBeVisible()
  })

  test("next button navigates to page 2", async ({ page }) => {
    await expect(page.getByRole("row")).toHaveCount(11, { timeout: 15000 })
    const total = await getTotalUsers(page)
    const expectedPages = Math.ceil(total / 10)

    const nextBtn = page.getByRole("button", { name: /go to next page/i })
    await expect(nextBtn).toBeEnabled()
    await nextBtn.click()

    const indicator = page.getByText(/page \d+ of/i).first()
    await expect(indicator).toHaveText(new RegExp(`page 2 of ${expectedPages}`, "i"))
  })

  test("prev button navigates back to page 1", async ({ page }) => {
    await expect(page.getByRole("row")).toHaveCount(11, { timeout: 15000 })
    const total = await getTotalUsers(page)
    const expectedPages = Math.ceil(total / 10)

    const nextBtn = page.getByRole("button", { name: /go to next page/i })
    await nextBtn.click()

    const prevBtn = page.getByRole("button", { name: /go to previous page/i })
    await expect(prevBtn).toBeEnabled()
    await prevBtn.click()

    const indicator = page.getByText(/page \d+ of/i).first()
    await expect(indicator).toHaveText(new RegExp(`page 1 of ${expectedPages}`, "i"))
  })

  test("last button navigates to last page", async ({ page }) => {
    await expect(page.getByRole("row")).toHaveCount(11, { timeout: 15000 })
    const total = await getTotalUsers(page)
    const expectedPages = Math.ceil(total / 10)

    const lastBtn = page.getByRole("button", { name: /go to last page/i })
    await expect(lastBtn).toBeEnabled()
    await lastBtn.click()

    const indicator = page.getByText(/page \d+ of/i).first()
    await expect(indicator).toHaveText(new RegExp(`page ${expectedPages} of ${expectedPages}`, "i"))
  })

  test("first button navigates to page 1 from last page", async ({ page }) => {
    await expect(page.getByRole("row")).toHaveCount(11, { timeout: 15000 })
    const total = await getTotalUsers(page)
    const expectedPages = Math.ceil(total / 10)

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
    await expect(page.getByRole("row")).toHaveCount(11, { timeout: 15000 })
    const total = await getTotalUsers(page)
    const expectedPages = Math.ceil(total / 10)

    // Click page 3 (if it exists) or the last available middle page
    const targetPage = Math.min(3, expectedPages)
    const pageBtn = page.getByRole("button", { name: new RegExp(`go to page ${targetPage}`, "i") })
    await pageBtn.click()

    const indicator = page.getByText(/page \d+ of/i).first()
    await expect(indicator).toHaveText(new RegExp(`page ${targetPage} of ${expectedPages}`, "i"))
  })

  test("changing page size shows correct number of rows and updates page count", async ({ page }) => {
    await expect(page.getByRole("row")).toHaveCount(11, { timeout: 15000 })
    const total = await getTotalUsers(page)

    // Change page size to 20
    const selectTrigger = page.locator('[data-slot="select-trigger"]')
    await expect(selectTrigger).toBeVisible()
    await selectTrigger.click()

    const option20 = page.getByRole("option", { name: /^20$/ })
    await expect(option20).toBeVisible()
    await option20.click()

    const expectedPages = Math.ceil(total / 20)
    const expectedRows = Math.min(total, 20) + 1 // data rows + header

    await expect(page.getByRole("row")).toHaveCount(expectedRows, { timeout: 10000 })

    const indicator = page.getByText(/page \d+ of/i).first()
    await expect(indicator).toHaveText(new RegExp(`page 1 of ${expectedPages}`, "i"))
  })

  test("prev button is disabled on first page", async ({ page }) => {
    await expect(page.getByRole("row")).toHaveCount(11, { timeout: 15000 })

    const prevBtn = page.getByRole("button", { name: /go to previous page/i })
    await expect(prevBtn).toBeDisabled()

    const firstBtn = page.getByRole("button", { name: /go to first page/i })
    await expect(firstBtn).toBeDisabled()
  })

  test("next button is disabled on last page", async ({ page }) => {
    await expect(page.getByRole("row")).toHaveCount(11, { timeout: 15000 })

    // Go to last page
    const lastBtn = page.getByRole("button", { name: /go to last page/i })
    await lastBtn.click()

    const nextBtn = page.getByRole("button", { name: /go to next page/i })
    await expect(nextBtn).toBeDisabled()

    const lastBtnCheck = page.getByRole("button", { name: /go to last page/i })
    await expect(lastBtnCheck).toBeDisabled()
  })

  test("pagination resets to page 1 when changing page size from another page", async ({ page }) => {
    await expect(page.getByRole("row")).toHaveCount(11, { timeout: 15000 })
    const total = await getTotalUsers(page)
    const expectedPages = Math.ceil(total / 50)

    // Go to page 3 (or last available if fewer than 3 pages)
    const page3Btn = page.getByRole("button", { name: /go to page 3/i })
    if (await page3Btn.isEnabled()) {
      await page3Btn.click()
    }

    // Change page size to 50
    const selectTrigger = page.locator('[data-slot="select-trigger"]')
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
    await expect(page.getByRole("row")).toHaveCount(11, { timeout: 15000 })
    const total = await getTotalUsers(page)
    const expectedFullPages = Math.ceil(total / 10)

    // Verify initial page count
    const indicator = page.getByText(/page \d+ of/i).first()
    await expect(indicator).toHaveText(new RegExp(`page 1 of ${expectedFullPages}`, "i"))

    // Search for a specific user that appears only once
    const searchInput = page.locator('input[placeholder="Filter users..."]')
    await searchInput.fill("mia.5@aol.com")

    // Should show 1 result + header, page count = 1
    await expect(page.getByRole("row")).toHaveCount(2, { timeout: 5000 })
    await expect(indicator).toHaveText(/page 1 of 1/i)

    // Nav buttons should be disabled (only 1 page)
    const nextBtn = page.getByRole("button", { name: /go to next page/i })
    await expect(nextBtn).toBeDisabled()
    const prevBtn = page.getByRole("button", { name: /go to previous page/i })
    await expect(prevBtn).toBeDisabled()
  })

  test("search then clear restores original page count", async ({ page }) => {
    await expect(page.getByRole("row")).toHaveCount(11, { timeout: 15000 })
    const total = await getTotalUsers(page)
    const expectedFullPages = Math.ceil(total / 10)

    // Search
    const searchInput = page.locator('input[placeholder="Filter users..."]')
    await searchInput.fill("mia.5@aol.com")
    await expect(page.getByRole("row")).toHaveCount(2, { timeout: 5000 })

    // Clear search
    await searchInput.clear()
    await expect(page.getByRole("row")).toHaveCount(11, { timeout: 5000 })

    // Page count should be back to original
    const indicator = page.getByText(/page \d+ of/i).first()
    await expect(indicator).toHaveText(new RegExp(`page 1 of ${expectedFullPages}`, "i"))
  })

  test("status filter + pagination: deleted filter shows fewer pages", async ({ page }) => {
    await expect(page.getByRole("row")).toHaveCount(11, { timeout: 15000 })

    // Click "Deleted" tab
    const softDeletedTabsList = page.locator('[data-slot="tabs-list"]').nth(0)
    const deletedTab = softDeletedTabsList.locator('[data-slot="tabs-trigger"]').nth(2)
    await deletedTab.click()
    await page.waitForTimeout(300)

    // Should have at most 1 page (few deleted users)
    const indicator = page.getByText(/page \d+ of/i).first()
    await expect(indicator).toHaveText(/page 1 of 1/i)

    // Nav buttons disabled
    const nextBtn = page.getByRole("button", { name: /go to next page/i })
    await expect(nextBtn).toBeDisabled()
  })

  test("pagination persists page when switching status filter", async ({ page }) => {
    await expect(page.getByRole("row")).toHaveCount(11, { timeout: 15000 })
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