import { test, expect } from "@playwright/test"

const SEED_EMAIL = "nobuenhombre@yandex.ru"

test.describe("Sidebar & header nav Users links — embed filter params in href", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
    await page.getByLabel(/email/i).fill(SEED_EMAIL)
    await page.getByLabel(/password/i).fill("123")
    await page.getByRole("button", { name: /sign in/i }).click()
    await expect(page).toHaveURL("/")
  })

  test("sidebar Users href includes search param after applying filter", async ({ page }) => {
    const sidebarMenu = page.locator('[data-slot="sidebar-menu"]')
    const sidebarUsersLink = sidebarMenu.getByRole("link", { name: /users/i })
    const headerNav = page.locator("header nav")
    const headerUsersLink = headerNav.getByRole("link", { name: /users/i })

    // ── Go to Users ──
    await sidebarUsersLink.click()
    await expect(page).toHaveURL("/users")
    await expect(page.getByRole("table")).toBeVisible()
    await expect(page.getByText(/[1-9][0-9]* users? total/i)).toBeVisible({ timeout: 15000 })

    // ── Apply search filter ──
    const searchInput = page.getByPlaceholder("Filter users...")
    await searchInput.fill(SEED_EMAIL)
    await expect(page).toHaveURL(/.*\?q=.*nobuenhombre.*/)

    // ── Both links must embed search param ──
    await expect(sidebarUsersLink).toHaveAttribute("href", /\/users\?q=.*nobuenhombre/)
    await expect(headerUsersLink).toHaveAttribute("href", /\/users\?q=.*nobuenhombre/)

    // ── Navigate to Dashboard ──
    await sidebarMenu.getByRole("link", { name: /dashboard/i }).click()
    await expect(page).toHaveURL("/")

    // ── Links on Dashboard still carry the param ──
    await expect(sidebarUsersLink).toHaveAttribute("href", /\/users\?q=.*nobuenhombre/)
    await expect(headerUsersLink).toHaveAttribute("href", /\/users\?q=.*nobuenhombre/)

    // ── Click sidebar link → lands on filtered page ──
    await sidebarUsersLink.click()
    await expect(page).toHaveURL(/.*\?q=.*nobuenhombre.*/)
    await expect(searchInput).toHaveValue(SEED_EMAIL)

    // ── Now test header nav link from Dashboard ──
    await sidebarMenu.getByRole("link", { name: /dashboard/i }).click()
    await expect(page).toHaveURL("/")
    await headerUsersLink.click()
    await expect(page).toHaveURL(/.*\?q=.*nobuenhombre.*/)
    await expect(searchInput).toHaveValue(SEED_EMAIL)
  })

  test("sidebar Users href includes status param after applying filter", async ({ page }) => {
    const sidebarMenu = page.locator('[data-slot="sidebar-menu"]')
    const sidebarUsersLink = sidebarMenu.getByRole("link", { name: /users/i })
    const headerNav = page.locator("header nav")
    const headerUsersLink = headerNav.getByRole("link", { name: /users/i })

    // ── Go to Users ──
    await sidebarUsersLink.click()
    await expect(page).toHaveURL("/users")
    await expect(page.getByRole("table")).toBeVisible()
    await expect(page.getByText(/[1-9][0-9]* users? total/i)).toBeVisible({ timeout: 15000 })

    // ── Apply status filter ──
    await page.getByRole("tab", { name: /active/i }).click()
    await page.waitForTimeout(300)
    await expect(page).toHaveURL(/.*status=active.*/)

    // ── Both links must embed status param ──
    await expect(sidebarUsersLink).toHaveAttribute("href", /\/users\?status=active/)
    await expect(headerUsersLink).toHaveAttribute("href", /\/users\?status=active/)

    // ── Navigate to Dashboard ──
    await sidebarMenu.getByRole("link", { name: /dashboard/i }).click()
    await expect(page).toHaveURL("/")

    // ── Links on Dashboard still carry the param ──
    await expect(sidebarUsersLink).toHaveAttribute("href", /\/users\?status=active/)
    await expect(headerUsersLink).toHaveAttribute("href", /\/users\?status=active/)

    // ── Click sidebar link → lands on filtered page ──
    await sidebarUsersLink.click()
    await expect(page).toHaveURL(/.*status=active.*/)
  })

  test("sidebar Users href preserves combined filters (search + status + roles)", async ({ page }) => {
    const sidebarMenu = page.locator('[data-slot="sidebar-menu"]')
    const sidebarUsersLink = sidebarMenu.getByRole("link", { name: /users/i })
    const headerNav = page.locator("header nav")
    const headerUsersLink = headerNav.getByRole("link", { name: /users/i })

    // ── Go to Users ──
    await sidebarUsersLink.click()
    await expect(page).toHaveURL("/users")
    await expect(page.getByRole("table")).toBeVisible()
    await expect(page.getByText(/[1-9][0-9]* users? total/i)).toBeVisible({ timeout: 15000 })

    // ── Apply search ──
    const searchInput = page.getByPlaceholder("Filter users...")
    await searchInput.fill(SEED_EMAIL)
    await expect(page).toHaveURL(/.*\?q=.*nobuenhombre.*/)

    // ── Apply status filter ──
    await page.getByRole("tab", { name: /active/i }).click()
    await page.waitForTimeout(300)
    await expect(page).toHaveURL(/.*status=active.*/)

    // ── Apply role filter ──
    const trigger = page.locator('[data-slot="popover-trigger"]')
    const popover = page.locator('[data-slot="popover-content"]')
    await trigger.click()
    await popover.getByText("Admin", { exact: true }).click()
    await page.keyboard.press("Escape")
    await expect(popover).not.toBeVisible()

    // ── Both links must embed all params ──
    await expect(sidebarUsersLink).toHaveAttribute("href", /q=.*nobuenhombre/)
    await expect(sidebarUsersLink).toHaveAttribute("href", /status=active/)
    await expect(sidebarUsersLink).toHaveAttribute("href", /roles=Admin/)
    await expect(headerUsersLink).toHaveAttribute("href", /q=.*nobuenhombre/)
    await expect(headerUsersLink).toHaveAttribute("href", /status=active/)
    await expect(headerUsersLink).toHaveAttribute("href", /roles=Admin/)

    // ── Navigate to Dashboard → links still preserve all params ──
    await sidebarMenu.getByRole("link", { name: /dashboard/i }).click()
    await expect(page).toHaveURL("/")

    await expect(sidebarUsersLink).toHaveAttribute("href", /q=.*nobuenhombre/)
    await expect(sidebarUsersLink).toHaveAttribute("href", /status=active/)
    await expect(sidebarUsersLink).toHaveAttribute("href", /roles=Admin/)
    await expect(headerUsersLink).toHaveAttribute("href", /q=.*nobuenhombre/)
    await expect(headerUsersLink).toHaveAttribute("href", /status=active/)
    await expect(headerUsersLink).toHaveAttribute("href", /roles=Admin/)

    // ── Click sidebar link → all filters preserved ──
    await sidebarUsersLink.click()
    await expect(page).toHaveURL(/.*\?q=.*nobuenhombre.*/)
    await expect(page).toHaveURL(/.*status=active.*/)
    await expect(page).toHaveURL(/.*roles=Admin.*/)
    await expect(searchInput).toHaveValue(SEED_EMAIL)
  })
})