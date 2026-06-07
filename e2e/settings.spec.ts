import { test, expect } from "@playwright/test"

/**
 * Settings page E2E tests.
 * Covers ALL 12 settings types for correct component rendering + save flow.
 *
 * Types tested:
 *   inputTextField, inputPasswordField, inputIntNumberField,
 *   inputFloatNumberField, textareaField, inputIntSlider,
 *   inputIntSliderRange, switch, listChecks, listRadios,
 *   selectSimple, selectWithSearch
 */

test.describe("Settings page", () => {
  test.beforeEach(async ({ page }) => {
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

  // ── All 12 types render correct components ──────────────────────

  test("renders all setting types with correct components", async ({ page }) => {
    await page.goto("/settings")

    // Wait for cards to load
    const allCards = page.locator('[data-slot="card"]')
    await expect(allCards.first()).toBeVisible({ timeout: 15000 })
    await expect(allCards).toHaveCount(6)

    // Helper: find a setting row by name within a card
    const settingRow = (card: ReturnType<typeof page.locator>, name: string) =>
      card.locator("div").filter({ hasText: name }).first()

    // ── 1. Appearance → listRadios (RadioGroup) ────────────────────
    const appearanceCard = allCards.nth(0)
    await expect(appearanceCard.getByRole("radio")).toHaveCount(2)
    const checkedRadio = await appearanceCard.locator(
      '[role="radio"][aria-checked="true"]',
    ).count()
    expect(checkedRadio).toBeGreaterThanOrEqual(1)

    // ── 2. Notifications → listRadios + switch ────────────────────
    const notificationsCard = allCards.nth(1)
    await expect(notificationsCard.getByRole("radio").first()).toBeVisible()
    await expect(notificationsCard.locator('[data-slot="switch"]').first()).toBeVisible()

    // ── 3. Privacy → switch + listRadios ─────────────────────────
    const privacyCard = allCards.nth(2)
    await expect(privacyCard.locator('[data-slot="switch"]').first()).toBeVisible()
    await expect(privacyCard.getByRole("radio").first()).toBeVisible()

    // ── 4. Language & Region → selectWithSearch (Combobox) + switch ──
    const langCard = allCards.nth(3)
    await expect(langCard.getByRole("combobox").first()).toBeVisible()
    await expect(langCard.locator('[data-slot="switch"]').first()).toBeVisible()

    // ── 5. Advanced → switch + inputIntNumberField + selectSimple + slider ──
    const advancedCard = allCards.nth(4)
    // Results Per Page - inputIntNumberField
    await expect(advancedCard.locator('[data-slot="input"]').first()).toBeVisible()
    // Log Level - selectSimple (BaseUI uses role="combobox" for Select too)
    await expect(advancedCard.getByRole("combobox").first()).toBeVisible()
    // Session Timeout - inputIntSlider
    const slider = advancedCard.locator('[data-slot="slider"]')
    await expect(slider).toBeVisible()
    await expect(slider.locator('[data-slot="slider-thumb"]')).toHaveCount(1)

    // ── 6. Accessibility → inputTextField + inputPasswordField + inputFloatNumberField + textarea + slider range ──
    const accessibilityCard = allCards.nth(5)
    // Screen Reader - inputTextField
    await expect(accessibilityCard.locator('[data-slot="input"]').first()).toBeVisible()
    // Voice Access - inputPasswordField
    await expect(accessibilityCard.locator('input[type="password"]')).toBeVisible()
    // Font Size Scale - inputFloatNumberField
    await expect(accessibilityCard.locator('input[type="number"][step="any"]')).toBeVisible()
    // Custom CSS Overrides - textareaField
    await expect(accessibilityCard.locator("textarea")).toBeVisible()
    // Reading Speed Range - inputIntSliderRange
    const rangeSlider = accessibilityCard.locator('[data-slot="slider"]')
    await expect(rangeSlider).toBeVisible()
    await expect(rangeSlider.locator('[data-slot="slider-thumb"]')).toHaveCount(2)
  })

  // ── Data Retention Period (listChecks multi-select checkboxes) ─────

  test("toggles data retention checkboxes and saves", async ({ page }) => {
    await page.goto("/settings")

    await expect(page.locator('[data-slot="card"]').first()).toBeVisible({ timeout: 15000 })

    const privacyCard = page.locator('[data-slot="card"]').nth(2)

    // Data Retention Period should render checkboxes, not radios
    const checkboxes = privacyCard.getByRole("checkbox")
    await expect(checkboxes.first()).toBeVisible()
    const count = await checkboxes.count()
    expect(count).toBeGreaterThanOrEqual(2)

    // Toggle the first unselected checkbox
    const firstUnchecked = privacyCard.locator('[role="checkbox"]:not([data-state="checked"])')
    const hasUnchecked = await firstUnchecked.count()
    if (hasUnchecked > 0) {
      await firstUnchecked.first().click()
    }

    const saveButton = page.getByRole("button", { name: /save/i })
    await expect(async () => {
      await expect(saveButton).toBeVisible({ timeout: 2000 })
    }).toPass({ timeout: 5000 })
    await saveButton.click()

    await expect(page.getByText(/saved/i)).toBeVisible()
    await expect(saveButton).not.toBeVisible({ timeout: 10000 })
  })

  // ── Theme save (listRadios single-select) ────────────────────────

  test("changes theme and saves", async ({ page }) => {
    await page.goto("/settings")

    await expect(page.locator('[data-slot="card"]').first()).toBeVisible({ timeout: 15000 })

    const appearanceCard = page.locator('[data-slot="card"]').nth(0)
    const uncheckedRadio = appearanceCard.locator('[role="radio"][aria-checked="false"]')
    await expect(uncheckedRadio.first()).toBeVisible()
    await uncheckedRadio.first().click()

    const saveButton = page.getByRole("button", { name: /save/i })
    await expect(saveButton).toBeVisible()
    await saveButton.click()

    await expect(page.getByText(/saved/i)).toBeVisible()
    await expect(saveButton).not.toBeVisible({ timeout: 10000 })
  })

  // ── Switch save ──────────────────────────────────────────────────

  test("toggles a switch and saves", async ({ page }) => {
    await page.goto("/settings")

    await expect(page.locator('[data-slot="card"]').first()).toBeVisible({ timeout: 15000 })

    // Click the first switch regardless of initial state
    const firstSwitch = page.locator('[data-slot="switch"]').first()
    await expect(firstSwitch).toBeVisible()
    await firstSwitch.click()

    const saveButton = page.getByRole("button", { name: /save/i })
    await expect(async () => {
      await expect(saveButton).toBeVisible({ timeout: 2000 })
    }).toPass({ timeout: 5000 })
    await saveButton.click()

    await expect(page.getByText(/saved/i)).toBeVisible()
    await expect(saveButton).not.toBeVisible({ timeout: 10000 })
  })

  // ── SelectSimple save (Log Level) ────────────────────────────────

  test("changes select simple and saves", async ({ page }) => {
    await page.goto("/settings")

    await expect(page.locator('[data-slot="card"]').first()).toBeVisible({ timeout: 15000 })

    const advancedCard = page.locator('[data-slot="card"]').nth(4)
    const trigger = advancedCard.getByRole("combobox").first()
    await expect(trigger).toBeVisible()
    await trigger.click()

    const content = page.locator('[data-slot="select-content"]')
    await expect(content).toBeVisible({ timeout: 5000 })
    const options = content.getByRole("option")
    const count = await options.count()
    expect(count).toBeGreaterThanOrEqual(2)
    await options.nth(1).click()

    const saveButton = page.getByRole("button", { name: /save/i })
    await expect(saveButton).toBeVisible()
    await saveButton.click()

    await expect(page.getByText(/saved/i)).toBeVisible()
    await expect(saveButton).not.toBeVisible({ timeout: 10000 })
  })

  // ── InputIntSlider changes via keyboard ──────────────────────────

  test("changes slider and saves", async ({ page }) => {
    await page.goto("/settings")

    await expect(page.locator('[data-slot="card"]').first()).toBeVisible({ timeout: 15000 })

    // Session Timeout in Advanced card
    const advancedCard = page.locator('[data-slot="card"]').nth(4)
    const sliderThumb = advancedCard.locator('[data-slot="slider-thumb"]').first()
    await expect(sliderThumb).toBeVisible()

    // Use keyboard to change value (ArrowRight increases by step=15)
    await sliderThumb.focus()
    await page.keyboard.press("ArrowRight")

    const saveButton = page.getByRole("button", { name: /save/i })
    await expect(saveButton).toBeVisible()
    await saveButton.click()

    await expect(page.getByText(/saved/i)).toBeVisible()
    await expect(saveButton).not.toBeVisible({ timeout: 10000 })
  })

  // ── Combobox (selectWithSearch) save ─────────────────────────────

  // ── Combobox (selectWithSearch) save ─────────────────────────────

  test("changes combobox selection and saves", async ({ page }) => {
    await page.goto("/settings")

    await expect(page.locator('[data-slot="card"]').first()).toBeVisible({ timeout: 15000 })

    // Language & Region card
    const langCard = page.locator('[data-slot="card"]').nth(3)

    // Focus the second combobox (Timezone), use keyboard to open
    const comboboxInputs = langCard.getByRole("combobox")
    await expect(comboboxInputs.first()).toBeVisible()
    const count = await comboboxInputs.count()
    expect(count).toBeGreaterThanOrEqual(2)

    // Click last combobox input to focus, then ArrowDown to open popup
    await comboboxInputs.nth(count - 1).click()
    await page.keyboard.press("ArrowDown")

    // Wait for popup content
    await expect(page.locator('[data-slot="combobox-content"]')).toBeVisible({ timeout: 5000 })

    // Select a different option (use keyboard)
    await page.keyboard.press("ArrowDown")
    await page.keyboard.press("Enter")

    const saveButton = page.getByRole("button", { name: /save/i })
    await expect(async () => {
      await expect(saveButton).toBeVisible({ timeout: 2000 })
    }).toPass({ timeout: 5000 })
    await saveButton.click()

    await expect(page.getByText(/saved/i)).toBeVisible()
    await expect(saveButton).not.toBeVisible({ timeout: 10000 })
  })

  test("changes integer input and saves", async ({ page }) => {
    await page.goto("/settings")

    await expect(page.locator('[data-slot="card"]').first()).toBeVisible({ timeout: 15000 })

    // Results Per Page in Advanced card
    const advancedCard = page.locator('[data-slot="card"]').nth(4)
    const numberInput = advancedCard.locator('[type="number"]').first()
    await expect(numberInput).toBeVisible()

    // Base UI InputPrimitive doesn't respond to fill() — use triple click + type
    await numberInput.click({ clickCount: 3 })
    await page.keyboard.type("50")
    await page.keyboard.press("Tab")

    // Wait for Save button
    const saveButton = page.getByRole("button", { name: /save/i })
    await expect(async () => {
      await expect(saveButton).toBeVisible({ timeout: 2000 })
    }).toPass({ timeout: 5000 })
    await saveButton.click()

    await expect(page.getByText(/saved/i)).toBeVisible()
    await expect(saveButton).not.toBeVisible({ timeout: 10000 })
  })

  // ── InputFloatNumberField save ───────────────────────────────────

  test("changes float input and saves", async ({ page }) => {
    await page.goto("/settings")

    await expect(page.locator('[data-slot="card"]').first()).toBeVisible({ timeout: 15000 })

    // Font Size Scale in Accessibility card
    const accessibilityCard = page.locator('[data-slot="card"]').nth(5)

    const floatInput = accessibilityCard.locator('[type="number"][step="any"]').first()
    await expect(floatInput).toBeVisible()
    await floatInput.click({ clickCount: 3 })
    await page.keyboard.type("1.5")
    await page.keyboard.press("Tab")

    const saveButton = page.getByRole("button", { name: /save/i })
    await expect(async () => {
      await expect(saveButton).toBeVisible({ timeout: 2000 })
    }).toPass({ timeout: 5000 })
    await saveButton.click()

    await expect(page.getByText(/saved/i)).toBeVisible()
    await expect(saveButton).not.toBeVisible({ timeout: 10000 })
  })

  // ── InputTextField save ──────────────────────────────────────────

  test("changes text input and saves", async ({ page }) => {
    await page.goto("/settings")

    await expect(page.locator('[data-slot="card"]').first()).toBeVisible({ timeout: 15000 })

    // Screen Reader Announcements in Accessibility card
    const accessibilityCard = page.locator('[data-slot="card"]').nth(5)

    const textInput = accessibilityCard.locator('[data-slot="input"]').first()
    await expect(textInput).toBeVisible()
    await textInput.click({ clickCount: 3 })
    await page.keyboard.type("Hello world")
    await page.keyboard.press("Tab")

    const saveButton = page.getByRole("button", { name: /save/i })
    await expect(async () => {
      await expect(saveButton).toBeVisible({ timeout: 2000 })
    }).toPass({ timeout: 5000 })
    await saveButton.click()

    await expect(page.getByText(/saved/i)).toBeVisible()
    await expect(saveButton).not.toBeVisible({ timeout: 10000 })
  })

  // ── InputPasswordField save ──────────────────────────────────────

  test("changes password input and saves", async ({ page }) => {
    await page.goto("/settings")

    await expect(page.locator('[data-slot="card"]').first()).toBeVisible({ timeout: 15000 })

    const accessibilityCard = page.locator('[data-slot="card"]').nth(5)
    const passwordInput = accessibilityCard.locator('input[type="password"]')
    await expect(passwordInput).toBeVisible()
    await passwordInput.click({ clickCount: 3 })
    await page.keyboard.type("secret")
    await page.keyboard.press("Tab")

    const saveButton = page.getByRole("button", { name: /save/i })
    await expect(async () => {
      await expect(saveButton).toBeVisible({ timeout: 2000 })
    }).toPass({ timeout: 5000 })
    await saveButton.click()

    await expect(page.getByText(/saved/i)).toBeVisible()
    await expect(saveButton).not.toBeVisible({ timeout: 10000 })
  })

  // ── TextareaField save ───────────────────────────────────────────

  test("changes textarea and saves", async ({ page }) => {
    await page.goto("/settings")

    await expect(page.locator('[data-slot="card"]').first()).toBeVisible({ timeout: 15000 })

    const accessibilityCard = page.locator('[data-slot="card"]').nth(5)
    const textarea = accessibilityCard.locator("textarea")
    await expect(textarea).toBeVisible()
    await textarea.click({ clickCount: 3 })
    await page.keyboard.type("body { background: red; }")
    await page.keyboard.press("Tab")

    const saveButton = page.getByRole("button", { name: /save/i })
    await expect(async () => {
      await expect(saveButton).toBeVisible({ timeout: 2000 })
    }).toPass({ timeout: 5000 })
    await saveButton.click()

    await expect(page.getByText(/saved/i)).toBeVisible()
    await expect(saveButton).not.toBeVisible({ timeout: 10000 })
  })
})