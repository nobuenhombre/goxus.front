import { test, expect } from "@playwright/test"

test.describe("Settings page", () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto("/login")
    await page.getByLabel(/email/i).fill("nobuenhombre@yandex.ru")
    await page.getByLabel(/password/i).fill("123")
    await page.getByRole("button", { name: /sign in/i }).click()
    await expect(page).toHaveURL("/")
  })

  test("navigates to settings page from sidebar", async ({ page }) => {
    await page.getByRole("link", { name: /settings/i }).first().click()
    await expect(page).toHaveURL("/settings")
    await expect(page.getByText(/settings/i).first()).toBeVisible()
  })

  test("loads theme setting and displays the current value", async ({ page }) => {
    await page.goto("/settings")

    // Wait for the page to load — CardTitle renders as div[data-slot="card-title"]
    await expect(page.locator('[data-slot="card-title"]', { hasText: /appearance/i })).toBeVisible()

    // Should show the Theme setting
    await expect(page.getByText(/theme/i).first()).toBeVisible()
    await expect(page.getByText(/select the theme/i)).toBeVisible()

    // Verify radio group is rendered and one option is checked (order-independent)
    const radios = page.getByRole("radio")
    await expect(radios.first()).toBeVisible()
    await expect(radios).toHaveCount(2)

    // At least one radio should be checked (default or user-saved value)
    const checkedCount = await page.locator('[role="radio"][aria-checked="true"]').count()
    expect(checkedCount).toBeGreaterThanOrEqual(1)
  })

  test("changes theme and saves successfully", async ({ page }) => {
    await page.goto("/settings")

    // Wait for the page to load
    await expect(page.locator('[data-slot="card-title"]', { hasText: /appearance/i })).toBeVisible()

    // Click the first unchecked radio option (order-independent)
    await page.locator('[role="radio"][aria-checked="false"]').first().click()

    // Save button should appear
    const saveButton = page.getByRole("button", { name: /save/i })
    await expect(saveButton).toBeVisible()
    await saveButton.click()

    // Should show success toast
    await expect(page.getByText(/theme.*saved/i)).toBeVisible()

    // Wait for save to finish and toast to disappear
    await expect(saveButton).not.toBeVisible({ timeout: 10000 })
  })
})