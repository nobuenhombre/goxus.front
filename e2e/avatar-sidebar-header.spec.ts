import { test, expect } from "@playwright/test"

test.describe("Sidebar and Header — user avatar", () => {
  test("shows loaded avatar images in sidebar footer and app header after login", async ({ page }) => {
    // ── Login ──
    await page.goto("/login")
    await page.getByLabel(/email/i).fill("nobuenhombre@yandex.ru")
    await page.getByLabel(/password/i).fill("123")
    await page.getByRole("button", { name: /sign in/i }).click()
    await expect(page).toHaveURL("/")

    // ── Wait for the page to fully hydrate and the avatar useEffect to fire ──
    // The avatar URL is set via useEffect after hydration, so we need to wait
    // for the img elements to appear in the DOM.
    await page.waitForSelector('img[alt="Ivan"]', { timeout: 10000 })

    // ── Verify two avatar images exist (sidebar + header) ──
    const avatarImages = page.locator('img[alt="Ivan"]')
    await expect(avatarImages).toHaveCount(2)

    // ── Verify each image has loaded (naturalWidth > 0) ──
    const imageCount = await avatarImages.count()
    for (let i = 0; i < imageCount; i++) {
      const img = avatarImages.nth(i)

      // Check src points to the avatar endpoint
      const src = await img.getAttribute("src")
      expect(src).toContain("/api/v1/entity/user/")
      expect(src).toContain("/avatar")
      expect(src).toContain("t=") // cache-busting timestamp

      // Check the image actually loaded (naturalWidth > 0 means the browser
      // successfully decoded the image data from the backend response)
      const naturalWidth = await img.evaluate(
        (el: HTMLImageElement) => el.naturalWidth,
      )
      expect(naturalWidth).toBeGreaterThan(0)
    }

    // ── Verify one image is in the sidebar and one is in the header ──
    // Sidebar: the footer button with aria-label "Open user menu" wraps the avatar
    const sidebarAvatar = page
      .locator('button[aria-label="Open user menu"]')
      .locator('img[alt="Ivan"]')
    await expect(sidebarAvatar).toBeVisible()

    // Header: the DropdownMenuTrigger in the header section
    // The header is inside <header> element, the nav links are before it
    const headerAvatar = page
      .locator("header")
      .locator('img[alt="Ivan"]')
    await expect(headerAvatar).toBeVisible()
  })
})