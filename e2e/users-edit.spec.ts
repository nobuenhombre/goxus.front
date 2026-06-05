import { test, expect } from "@playwright/test"

test.describe("Users page — edit dialog form fields", () => {
  test("edit dialog shows correct user data on first and subsequent opens", async ({ page }) => {
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

    // ── Open edit for first user (Mia) ──
    const miaRow = page.getByRole("row").filter({ hasText: "mia.5@aol.com" })
    await expect(miaRow).toBeVisible({ timeout: 10000 })

    // Open actions menu
    const miaActions = miaRow.getByRole("button").last()
    await miaActions.click()
    await page.getByRole("menuitem", { name: /edit/i }).click()

    // Dialog should appear with Mia's data
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText("Edit User")
    await expect(dialog.getByLabel(/name/i)).toHaveValue("Mia")
    await expect(dialog.getByLabel(/email/i)).toHaveValue("mia.5@aol.com")

    // Close dialog with Escape
    await page.keyboard.press("Escape")
    await expect(dialog).not.toBeVisible()

    // ── Open edit for second user (Павел) ──
    const pavelRow = page.getByRole("row").filter({ hasText: "павел.8@yandex.ru" })
    await expect(pavelRow).toBeVisible({ timeout: 10000 })

    const pavelActions = pavelRow.getByRole("button").last()
    await pavelActions.click()
    await page.getByRole("menuitem", { name: /edit/i }).click()

    // Dialog should appear with Павел's data — NOT Mia's
    const dialog2 = page.getByRole("dialog")
    await expect(dialog2).toBeVisible()
    await expect(dialog2).toContainText("Edit User")
    await expect(dialog2.getByLabel(/name/i)).toHaveValue("Павел")
    await expect(dialog2.getByLabel(/email/i)).toHaveValue("павел.8@yandex.ru")
  })
})