import { test, expect } from "@playwright/test"

const SEED_EMAIL = "nobuenhombre@yandex.ru"
const IVAN_EMAIL = "data.worker.nobuenhombre@yandex.ru"

/**
 * Locate the table row containing a specific email in the email cell.
 * Avoids substring collisions (SEED_EMAIL is a substring of IVAN_EMAIL).
 */
function rowByEmail(email: string) {
  // Find the email cell with exact text match, then return its parent row
  return { email, locator: (page: import("@playwright/test").Page) => page.getByRole("row").filter({ has: page.getByRole("cell", { name: email, exact: true }) }) }
}

test.describe("Users page — role filter Popover", () => {
  test("role badges display and basic filtering", async ({ page }) => {
    // ── Login ──
    await page.goto("/login")
    await page.getByLabel(/email/i).fill(SEED_EMAIL)
    await page.getByLabel(/password/i).fill("123")
    await page.getByRole("button", { name: /sign in/i }).click()
    await expect(page).toHaveURL("/")

    // Navigate to Users
    await page.getByRole("link", { name: /users/i }).first().click()
    await expect(page).toHaveURL("/users")
    await expect(page.getByRole("table")).toBeVisible()
    await expect(page.getByText(/[1-9]\d* users? total/i)).toBeVisible({ timeout: 15000 })

    const trigger = page.locator('[data-slot="popover-trigger"]')
    const popover = page.locator('[data-slot="popover-content"]')

    // Confirm both users are shown (no filter)
    await expect(page.getByRole("cell", { name: SEED_EMAIL, exact: true })).toBeVisible()
    await expect(page.getByRole("cell", { name: IVAN_EMAIL, exact: true })).toBeVisible()

    // ── Open popover ──
    await trigger.click()
    await expect(popover).toBeVisible()

    // Click the div wrapping the "Data Analytics" text
    const daDiv = popover.locator("div").filter({ hasText: "Data Analytics" }).first()
    await daDiv.click()

    // Close popover after selecting
    await page.keyboard.press("Escape")
    await expect(popover).not.toBeVisible()

    // ── Check badge ──
    await expect(trigger).toContainText("Data Analytics")

    // ── Check filter ──
    await page.waitForTimeout(500)

    // After filtering by Data Analytics, only Ivan should be visible
    await expect(page.getByRole("cell", { name: IVAN_EMAIL, exact: true })).toBeVisible()
    await expect(page.getByRole("cell", { name: SEED_EMAIL, exact: true })).not.toBeVisible()
  })
})