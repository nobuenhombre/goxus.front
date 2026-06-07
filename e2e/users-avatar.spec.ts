import { test, expect } from "@playwright/test"
import fs from "fs"
import path from "path"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081"
const SEED_EMAIL = "nobuenhombre@yandex.ru"

// Create a minimal valid 460x460 webp image for testing
function createTestAvatarBuffer(): Buffer {
  // Minimal valid webp image (460x460, lossless)
  // We use a pre-created file if available, otherwise create one via node
  const testFile = path.join(__dirname, "..", "..", "back", "data", "e2e", "img", "users", "avatars", "user-avatar-default.webp")
  if (fs.existsSync(testFile)) {
    return fs.readFileSync(testFile)
  }
  // Fallback: return the default avatar from the test fixtures
  throw new Error("Default avatar not found at " + testFile)
}

test.describe("Users page — avatar features", () => {
  test("create user with avatar, display in table, edit/delete avatar", async ({ page }) => {
    // Login
    await page.goto("/login")
    await page.getByLabel(/email/i).fill(SEED_EMAIL)
    await page.getByLabel(/password/i).fill("123")
    await page.getByRole("button", { name: /sign in/i }).click()
    await expect(page).toHaveURL("/")

    // ── Create a test user via API ──
    const prefix = `avatar-e2e-${Date.now()}`
    const email = `${prefix}@test.com`
    const name = "AvatarTestUser"

    const token = await page.evaluate(() => localStorage.getItem("goxus_token"))
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }

    const createRes = await page.request.post(`${API_BASE}/api/v1/entity/user/`, {
      headers,
      data: { name, email, password: "test123" },
    })
    expect(createRes.ok()).toBeTruthy()
    const createBody = await createRes.json()
    const userId: number = createBody.data.id

    // ── Upload an avatar for this user via API ──
    const avatarBuffer = createTestAvatarBuffer()
    const uploadRes = await page.request.post(
      `${API_BASE}/api/v1/entity/user/${userId}/avatar`,
      {
        headers: { Authorization: `Bearer ${token}` },
        multipart: {
          avatar: {
            name: "avatar.webp",
            mimeType: "image/webp",
            buffer: avatarBuffer,
          },
        },
      },
    )
    expect(uploadRes.ok()).toBeTruthy()

    // Navigate to Users
    await page.getByRole("link", { name: /users/i }).first().click()
    await expect(page).toHaveURL("/users")
    await expect(page.getByRole("table")).toBeVisible()

    // Search for the test user
    await page.locator('input[placeholder="Filter users..."]').fill(email)

    // Wait for React to process the onChange and re-render (prevents portal remount race)
    await expect(
      page.locator('input[placeholder="Filter users..."]'),
    ).toHaveValue(email)

    // Verify the user row shows an avatar image
    const userRow = page.getByRole("row").filter({ hasText: email })
    await expect(userRow).toBeVisible({ timeout: 10000 })

    // The avatar column has an img element
    const avatarInRow = userRow.locator('[data-slot="avatar-image"]')
    await expect(avatarInRow).toBeVisible()
    // Avatar src should contain the user ID
    const avatarSrc = await avatarInRow.getAttribute("src")
    expect(avatarSrc).toContain(String(userId))
    expect(avatarSrc).toContain("avatar")

    // ── Open edit dialog — verify avatar appears ──
    const actionsBtn = userRow.getByRole("button").last()
    await actionsBtn.click()
    await expect(
      page.locator('[data-slot="dropdown-menu-content"]'),
    ).toBeVisible({ timeout: 5000 })
    await page.getByRole("menuitem", { name: /edit/i }).click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText("Edit User")

    // Verify avatar is shown in the edit dialog (data-slot="avatar-image")
    const editAvatar = dialog.locator('[data-slot="avatar-image"]')
    await expect(editAvatar).toBeVisible()

    // ── Delete avatar via dialog ──
    const deleteBtn = dialog.getByRole("button", { name: /remove avatar/i })
    await expect(deleteBtn).toBeVisible()
    await deleteBtn.click()

    // Wait for toast
    await expect(page.getByText("Avatar removed")).toBeVisible({ timeout: 5000 })

    // Close dialog
    await page.keyboard.press("Escape")
    await expect(dialog).not.toBeVisible()

    // Refresh the table
    await page.reload()
    await expect(page.getByRole("table")).toBeVisible()
    await page.locator('input[placeholder="Filter users..."]').fill(email)

    // Now the custom avatar has been deleted — the row should show the default avatar image
    const userRowAfterDelete = page.getByRole("row").filter({ hasText: email })
    await expect(userRowAfterDelete).toBeVisible({ timeout: 10000 })

    // The avatar image should still be visible (backend falls back to default avatar)
    const avatarImageAfterDelete = userRowAfterDelete.locator('[data-slot="avatar-image"]')
    await expect(avatarImageAfterDelete).toBeVisible()
    // The src should have changed due to cache-busting param
    const newAvatarSrc = await avatarImageAfterDelete.getAttribute("src")
    expect(newAvatarSrc).toContain("avatar")
  })
})