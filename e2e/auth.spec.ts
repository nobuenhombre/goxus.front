import { test, expect } from "@playwright/test"

test.describe("Login page", () => {
  test("shows sign-in form", async ({ page }) => {
    await page.goto("/login")
    await expect(page.locator('[data-slot="card-title"]')).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible()
  })

  test("validates empty fields", async ({ page }) => {
    await page.goto("/login")
    await page.getByRole("button", { name: /sign in/i }).click()
    await expect(page.getByText(/please enter a valid email/i)).toBeVisible()
  })
})

test.describe("Login → Dashboard → Logout flow", () => {
  test("logs in, sees dashboard, logs out", async ({ page }) => {
    // Navigate to login
    await page.goto("/login")

    // Fill credentials
    await page.getByLabel(/email/i).fill("nobuenhombre@yandex.ru")
    await page.getByLabel(/password/i).fill("123")
    await page.getByRole("button", { name: /sign in/i }).click()

    // Should redirect to dashboard
    await expect(page).toHaveURL("/")

    // Navigate to Users page
    await page.getByRole("link", { name: /users/i }).first().click()
    await expect(page).toHaveURL("/users")

    // User table should render
    await expect(page.getByRole("table")).toBeVisible()

    // Logout via sidebar user dropdown
    await page.getByRole("button", { name: /open user menu/i }).click()
    await page.getByRole("menuitem", { name: /sign out/i }).click()

    // Should be back on login page
    await expect(page).toHaveURL("/login")
    await expect(page.locator('[data-slot="card-title"]')).toBeVisible()
  })
})