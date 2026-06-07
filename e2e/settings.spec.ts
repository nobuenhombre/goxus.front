import { test, expect } from "@playwright/test"

/**
 * Settings page E2E tests.
 *
 * The settings page was redesigned with a sidebar nav (group tabs on desktop →
 * select on mobile) showing ONE group at a time, each setting as its own Card,
 * auto-save with 1-second debounce (no save button), and toast on success.
 *
 * Groups (from seed migrations):
 *   1. Appearance       — Theme (listRadios)
 *   2. Notifications    — Email Notifications (listRadios), Push Notifications (switch),
 *                         Sound Alerts (switch), Mute Period (listRadios)
 *   3. Privacy          — Show Online Status (switch), Profile Visibility (listRadios),
 *                         Data Retention Period (listChecks), Activity Logging (switch),
 *                         Two-Factor Authentication (listRadios)
 *   4. Language & Region — Language (selectWithSearch), Timezone (selectWithSearch),
 *                         Auto-detect Language (switch)
 *   5. Advanced         — Developer Mode (switch), Results Per Page (inputIntNumberField),
 *                         Log Level (selectSimple), Auto-save (switch),
 *                         Session Timeout (inputIntSlider), Experimental Features (switch)
 *   6. Accessibility    — Screen Reader Announcements (inputTextField),
 *                         Voice Access Passphrase (inputPasswordField),
 *                         Font Size Scale (inputFloatNumberField),
 *                         Custom CSS Overrides (textareaField),
 *                         Reading Speed Range (inputIntSliderRange)
 *
 * Types tested across all groups:
 *   inputTextField, inputPasswordField, inputIntNumberField,
 *   inputFloatNumberField, textareaField, inputIntSlider,
 *   inputIntSliderRange, switch, listChecks, listRadios,
 *   selectSimple, selectWithSearch
 */

/** Sidebar group names (matching seed data) */
const GROUP_NAMES = [
  "Appearance",
  "Notifications",
  "Privacy",
  "Language & Region",
  "Advanced",
  "Accessibility",
] as const

/** Click a sidebar group button by name and wait for cards */
async function selectGroup(page: import("@playwright/test").Page, name: string) {
  // Desktop nav buttons are inside a <nav> in the sidebar
  const btn = page.getByRole("button", { name }).first()
  await btn.click()
  // Allow render
  await expect(page.locator('[data-slot="card"]').first()).toBeVisible({ timeout: 10000 })
}

type SettingExpectation = { name: string; type: string }

/** Verify that a group renders the expected cards with correct field components */
async function verifyGroup(
  page: import("@playwright/test").Page,
  name: string,
  expected: SettingExpectation[],
) {
  await selectGroup(page, name)
  const cards = page.locator('[data-slot="card"]')
  await expect(cards).toHaveCount(expected.length)

  for (const { name: sName, type } of expected) {
    const card = cards.filter({ hasText: sName }).first()
    await expect(card).toBeVisible()

    switch (type) {
      case "listRadios":
        await expect(card.locator('[data-slot="radio-group"]').first()).toBeVisible()
        break
      case "switch":
        await expect(card.locator('[data-slot="switch"]').first()).toBeVisible()
        break
      case "listChecks":
        await expect(card.locator('[data-slot="checkbox"]').first()).toBeVisible()
        break
      case "selectWithSearch":
        await expect(card.getByPlaceholder("Search...").first()).toBeVisible()
        break
      case "selectSimple":
        await expect(card.locator('[data-slot="select-trigger"]').first()).toBeVisible()
        break
      case "inputIntNumberField":
        await expect(card.locator('input[type="number"]').first()).toBeVisible()
        break
      case "inputIntSlider":
        await expect(card.locator('[data-slot="slider"]').first()).toBeVisible()
        await expect(card.locator('[data-slot="slider-thumb"]')).toHaveCount(1)
        break
      case "inputTextField":
        await expect(card.locator('[data-slot="input"]').first()).toBeVisible()
        break
      case "inputPasswordField":
        await expect(card.locator('input[type="password"]').first()).toBeVisible()
        break
      case "inputFloatNumberField":
        await expect(
          card.locator('input[type="number"][step="any"]').first(),
        ).toBeVisible()
        break
      case "textareaField":
        await expect(card.locator("textarea").first()).toBeVisible()
        break
      case "inputIntSliderRange":
        await expect(card.locator('[data-slot="slider"]').first()).toBeVisible()
        await expect(card.locator('[data-slot="slider-thumb"]')).toHaveCount(2)
        break
    }
  }
}

test.describe("Settings page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
    await page.getByLabel(/email/i).fill("nobuenhombre@yandex.ru")
    await page.getByLabel(/password/i).fill("123")
    await page.getByRole("button", { name: /sign in/i }).click()
    await expect(page).toHaveURL("/")
  })

  // ── Navigation ────────────────────────────────────────────────────

  test("navigates to settings page from sidebar", async ({ page }) => {
    await page.getByRole("link", { name: /settings/i }).first().click()
    await expect(page).toHaveURL("/settings")
    await expect(page.getByText(/settings/i).first()).toBeVisible()
  })

  // ── All 12 types render correct components ────────────────────────

  test("renders all setting types with correct components", async ({ page }) => {
    await page.goto("/settings")

    // Wait for sidebar nav to appear (desktop: <nav> with group buttons)
    const sidebar = page.locator("nav").filter({ hasText: "Appearance" })
    await expect(sidebar).toBeVisible({ timeout: 15000 })

    // Verify all 6 group buttons exist
    const groupBtns = sidebar.locator("button")
    await expect(groupBtns).toHaveCount(6)
    for (const name of GROUP_NAMES) {
      await expect(groupBtns.filter({ hasText: name })).toBeVisible()
    }

    // ── 1. Appearance → listRadios ──────────────────────────────
    await verifyGroup(page, "Appearance", [{ name: "Theme", type: "listRadios" }])

    // ── 2. Notifications → listRadios + switch ──────────────────
    await verifyGroup(page, "Notifications", [
      { name: "Email Notifications", type: "listRadios" },
      { name: "Push Notifications", type: "switch" },
      { name: "Sound Alerts", type: "switch" },
      { name: "Mute Period", type: "listRadios" },
    ])

    // ── 3. Privacy → switch + listRadios + listChecks ───────────
    await verifyGroup(page, "Privacy", [
      { name: "Show Online Status", type: "switch" },
      { name: "Profile Visibility", type: "listRadios" },
      { name: "Data Retention Period", type: "listChecks" },
      { name: "Activity Logging", type: "switch" },
      { name: "Two-Factor Authentication", type: "listRadios" },
    ])

    // ── 4. Language & Region → selectWithSearch + switch ────────
    await verifyGroup(page, "Language & Region", [
      { name: "Language", type: "selectWithSearch" },
      { name: "Timezone", type: "selectWithSearch" },
      { name: "Auto-detect Language", type: "switch" },
    ])

    // ── 5. Advanced → switch + inputIntNumberField + selectSimple + slider ──
    await verifyGroup(page, "Advanced", [
      { name: "Developer Mode", type: "switch" },
      { name: "Results Per Page", type: "inputIntNumberField" },
      { name: "Log Level", type: "selectSimple" },
      { name: "Auto-save", type: "switch" },
      { name: "Session Timeout", type: "inputIntSlider" },
      { name: "Experimental Features", type: "switch" },
    ])

    // ── 6. Accessibility → inputTextField + inputPasswordField + inputFloatNumberField + textarea + slider range ──
    await verifyGroup(page, "Accessibility", [
      { name: "Screen Reader Announcements", type: "inputTextField" },
      { name: "Voice Access Passphrase", type: "inputPasswordField" },
      { name: "Font Size Scale", type: "inputFloatNumberField" },
      { name: "Custom CSS Overrides", type: "textareaField" },
      { name: "Reading Speed Range", type: "inputIntSliderRange" },
    ])
  })

  // ── Data Retention Period (listChecks multi-select checkboxes) ──

  test("toggles data retention checkboxes and saves", async ({ page }) => {
    await page.goto("/settings")
    await selectGroup(page, "Privacy")

    const card = page
      .locator('[data-slot="card"]')
      .filter({ hasText: "Data Retention Period" })
      .first()
    await expect(card).toBeVisible()

    // Should render checkboxes, not radios
    const checkboxes = card.locator('[data-slot="checkbox"]')
    await expect(checkboxes.first()).toBeVisible()
    const count = await checkboxes.count()
    expect(count).toBeGreaterThanOrEqual(2)

    // Toggle checkboxes: uncheck the first one if all checked, else check the first unchecked
    const checkedBoxes = card.locator('[data-slot="checkbox"][data-checked]')
    const allChecked = (await checkedBoxes.count()) === (await checkboxes.count())
    if (allChecked) {
      // All checked — uncheck the first one to trigger a change
      await checkedBoxes.first().click()
    } else {
      // Some are unchecked — toggle the first unchecked
      const firstUnchecked = card.locator('[data-slot="checkbox"]:not([data-checked])')
      await firstUnchecked.first().click()
    }

    // Wait for auto-save toast
    await expect(page.getByText(/saved/i)).toBeVisible({ timeout: 10000 })
  })

  // ── Theme save (listRadios) ─────────────────────────────────────

  test("changes theme and saves", async ({ page }) => {
    await page.goto("/settings")
    await selectGroup(page, "Appearance")

    const card = page
      .locator('[data-slot="card"]')
      .filter({ hasText: "Theme" })
      .first()
    await expect(card).toBeVisible()

    const radios = card.locator('[data-slot="radio-group-item"]')
    await expect(radios.first()).toBeVisible()

    // Find an unselected radio and click it (previous test runs may have
    // saved a different value, so clicking nth(count-1) might be no-op)
    const uncheckedRadio = card.locator(
      '[data-slot="radio-group-item"]:not([data-checked])',
    )
    const hasUnchecked = await uncheckedRadio.count()
    if (hasUnchecked > 0) {
      await uncheckedRadio.first().click()
    } else {
      // All selected — unselectable; toggle the last one to trigger save
      await radios.last().click()
    }

    // Wait for auto-save toast
    await expect(page.getByText(/saved/i)).toBeVisible({ timeout: 10000 })
  })

  // ── Switch save ─────────────────────────────────────────────────

  test("toggles a switch and saves", async ({ page }) => {
    await page.goto("/settings")
    await selectGroup(page, "Advanced")

    const card = page
      .locator('[data-slot="card"]')
      .filter({ hasText: "Developer Mode" })
      .first()
    await expect(card).toBeVisible()

    const switchEl = card.locator('[data-slot="switch"]').first()
    await expect(switchEl).toBeVisible()
    await switchEl.click()

    // Wait for auto-save toast
    await expect(page.getByText(/saved/i)).toBeVisible({ timeout: 10000 })
  })

  // ── SelectSimple save (Log Level) ──────────────────────────────

  test("changes select simple and saves", async ({ page }) => {
    await page.goto("/settings")
    await selectGroup(page, "Advanced")

    const card = page
      .locator('[data-slot="card"]')
      .filter({ hasText: "Log Level" })
      .first()
    await expect(card).toBeVisible()

    const trigger = card.locator('[data-slot="select-trigger"]').first()
    await expect(trigger).toBeVisible()
    await trigger.click()

    // Select popup renders in a portal; filter for the open one
    // (the sidebar nav also has a Select on mobile which is closed)
    const content = page.locator('[data-slot="select-content"][data-open]')
    await expect(content).toBeVisible({ timeout: 5000 })
    const options = content.locator('[data-slot="select-item"]')
    const optCount = await options.count()
    expect(optCount).toBeGreaterThanOrEqual(2)
    // Select last option (guaranteed different from whatever is currently selected)
    await options.nth(optCount - 1).click()

    // Wait for auto-save toast
    await expect(page.getByText(/saved/i)).toBeVisible({ timeout: 10000 })
  })

  // ── InputIntSlider changes via keyboard ────────────────────────

  test("changes slider and saves", async ({ page }) => {
    await page.goto("/settings")
    await selectGroup(page, "Advanced")

    const card = page
      .locator('[data-slot="card"]')
      .filter({ hasText: "Session Timeout" })
      .first()
    await expect(card).toBeVisible()

    const sliderThumb = card.locator('[data-slot="slider-thumb"]').first()
    await expect(sliderThumb).toBeVisible()

    // Use locator.press() which focuses + dispatches key on the specific element
    await sliderThumb.press("ArrowRight")

    // Wait for auto-save toast
    await expect(page.getByText(/saved/i)).toBeVisible({ timeout: 10000 })
  })

  // ── Combobox (selectWithSearch) save ───────────────────────────

  test("changes combobox selection and saves", async ({ page }) => {
    await page.goto("/settings")
    await selectGroup(page, "Language & Region")

    const card = page
      .locator('[data-slot="card"]')
      .filter({ hasText: "Language" })
      .first()
    await expect(card).toBeVisible()

    // ComboboxInput with placeholder="Search..."
    const searchInput = card.getByPlaceholder("Search...").first()
    await expect(searchInput).toBeVisible()
    await searchInput.click()

    // Use keyboard: ArrowDown opens the popup, then navigate to a different option
    await page.keyboard.press("ArrowDown")
    const popupContent = page.locator('[data-slot="combobox-content"]')
    await expect(popupContent).toBeVisible({ timeout: 5000 })

    // Click the second item in the popup (guaranteed different from current)
    const comboItems = page.locator('[data-slot="combobox-item"]')
    await expect(comboItems.first()).toBeVisible({ timeout: 3000 })
    const itemCount = await comboItems.count()
    await comboItems.nth(itemCount > 2 ? 1 : 0).click()

    // Wait for auto-save toast
    await expect(page.getByText(/saved/i)).toBeVisible({ timeout: 10000 })
  })

  // ── InputIntNumberField save ────────────────────────────────────

  test("changes integer input and saves", async ({ page }) => {
    await page.goto("/settings")
    await selectGroup(page, "Advanced")

    const card = page
      .locator('[data-slot="card"]')
      .filter({ hasText: "Results Per Page" })
      .first()
    await expect(card).toBeVisible()

    const numberInput = card.locator('input[type="number"]').first()
    await expect(numberInput).toBeVisible()

    // Base UI InputPrimitive doesn't respond to fill() — use triple click + type
    await numberInput.click({ clickCount: 3 })
    await page.keyboard.type("50")
    await page.keyboard.press("Tab")

    // Wait for auto-save toast (1s debounce + API call)
    await expect(page.getByText(/saved/i)).toBeVisible({ timeout: 10000 })
  })

  // ── InputFloatNumberField save ──────────────────────────────────

  test("changes float input and saves", async ({ page }) => {
    await page.goto("/settings")
    await selectGroup(page, "Accessibility")

    const card = page
      .locator('[data-slot="card"]')
      .filter({ hasText: "Font Size Scale" })
      .first()
    await expect(card).toBeVisible()

    const floatInput = card
      .locator('input[type="number"][step="any"]')
      .first()
    await expect(floatInput).toBeVisible()
    await floatInput.click({ clickCount: 3 })
    await page.keyboard.type("1.5")
    await page.keyboard.press("Tab")

    // Wait for auto-save toast
    await expect(page.getByText(/saved/i)).toBeVisible({ timeout: 10000 })
  })

  // ── InputTextField save ─────────────────────────────────────────

  test("changes text input and saves", async ({ page }) => {
    await page.goto("/settings")
    await selectGroup(page, "Accessibility")

    const card = page
      .locator('[data-slot="card"]')
      .filter({ hasText: "Screen Reader Announcements" })
      .first()
    await expect(card).toBeVisible()

    const textInput = card.locator('[data-slot="input"]').first()
    await expect(textInput).toBeVisible()
    await textInput.click({ clickCount: 3 })
    await page.keyboard.type("Hello world")
    await page.keyboard.press("Tab")

    // Wait for auto-save toast
    await expect(page.getByText(/saved/i)).toBeVisible({ timeout: 10000 })
  })

  // ── InputPasswordField save ─────────────────────────────────────

  test("changes password input and saves", async ({ page }) => {
    await page.goto("/settings")
    await selectGroup(page, "Accessibility")

    const card = page
      .locator('[data-slot="card"]')
      .filter({ hasText: "Voice Access Passphrase" })
      .first()
    await expect(card).toBeVisible()

    const passwordInput = card.locator('input[type="password"]').first()
    await expect(passwordInput).toBeVisible()
    await passwordInput.click({ clickCount: 3 })
    await page.keyboard.type("secret")
    await page.keyboard.press("Tab")

    // Wait for auto-save toast
    await expect(page.getByText(/saved/i)).toBeVisible({ timeout: 10000 })
  })

  // ── TextareaField save ──────────────────────────────────────────

  test("changes textarea and saves", async ({ page }) => {
    await page.goto("/settings")
    await selectGroup(page, "Accessibility")

    const card = page
      .locator('[data-slot="card"]')
      .filter({ hasText: "Custom CSS Overrides" })
      .first()
    await expect(card).toBeVisible()

    const textarea = card.locator("textarea").first()
    await expect(textarea).toBeVisible()
    await textarea.click({ clickCount: 3 })
    await page.keyboard.type("body { background: red; }")
    await page.keyboard.press("Tab")

    // Wait for auto-save toast
    await expect(page.getByText(/saved/i)).toBeVisible({ timeout: 10000 })
  })
})