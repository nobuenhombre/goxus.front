/**
 * Settings API client — setting definitions and user-specific setting values.
 *
 * Endpoints:
 *   GET  /api/v1/entity/settings              → settings definitions
 *   GET  /api/v1/entity/user/:id/settings      → user settings (enriched with definition)
 *   PUT  /api/v1/entity/user/:id/settings/:settings_id  → upsert a user setting value
 *
 * JSON nesting (goxus.JSON Go type serializes as {"Data": <inner>}):
 *   Backend stores:   {"value": <actual>}
 *   API response:     {"Data": {"value": <actual>}}
 *   Upsert body:      {"value": {"value": <actual>}}
 */

import { apiFetchJSON } from "./api"
import { getToken } from "./auth"

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface SettingsDefinition {
  id: number
  type: string
  group: string
  name: string
  description: string
  available_values: unknown
  default_value: unknown
}

export interface UserSetting {
  user_settings_id: number
  settings_id: number
  type: string
  group: string
  name: string
  description: string
  available_values: unknown
  value: unknown
}

/* ------------------------------------------------------------------ */
/* Value helpers                                                       */
/* ------------------------------------------------------------------ */

/**
 * Unwrap goxus.JSON wrapper: {"Data": <inner>} → inner.
 * If there's no "Data" key, returns raw as-is.
 */
export function extractGoxusData(raw: unknown): unknown {
  if (raw && typeof raw === "object" && "Data" in (raw as Record<string, unknown>)) {
    return (raw as Record<string, unknown>).Data
  }
  return raw
}

/**
 * Extract the inner `value` from {"value": <actual>}.
 * Also handles the goxus.JSON {"Data": {"value": <actual>}} wrapper.
 */
export function extractSettingValue(raw: unknown): unknown {
  const unwrapped = extractGoxusData(raw)
  if (unwrapped && typeof unwrapped === "object" && "value" in (unwrapped as Record<string, unknown>)) {
    return (unwrapped as Record<string, unknown>).value
  }
  return unwrapped
}

/**
 * Parse available_values JSON into a record: { key: label }.
 * Expected shapes (after goxus unwrap):
 *   {"value": {"1": "Light", "2": "Dark"}}  (listChecks / listRadios / selectSimple)
 */
export function extractSettingOptions(raw: unknown): Record<string, string> {
  const inner = extractSettingValue(raw)
  if (inner && typeof inner === "object") {
    return inner as Record<string, string>
  }
  return {}
}

/* ------------------------------------------------------------------ */
/* Responses                                                           */
/* ------------------------------------------------------------------ */

interface SettingsDefinitionsResponse {
  version: string
  data: SettingsDefinition[]
}

interface UserSettingsResponse {
  version: string
  data: UserSetting[]
}

interface UpsertSettingResponse {
  version: string
  message: string
}

/* ------------------------------------------------------------------ */
/* Get all setting definitions                                         */
/* ------------------------------------------------------------------ */

export async function fetchSettingsDefinitions(
  signal?: AbortSignal,
): Promise<SettingsDefinition[]> {
  const token = getToken()
  if (!token) throw new Error("Not authenticated")

  const body = await apiFetchJSON<SettingsDefinitionsResponse>(
    "/api/v1/entity/settings",
    { signal },
  )
  return body.data
}

/* ------------------------------------------------------------------ */
/* Get user settings (enriched with definition data)                   */
/* ------------------------------------------------------------------ */

export async function fetchUserSettings(
  userId: number,
  signal?: AbortSignal,
): Promise<UserSetting[]> {
  const token = getToken()
  if (!token) throw new Error("Not authenticated")

  const body = await apiFetchJSON<UserSettingsResponse>(
    `/api/v1/entity/user/${userId}/settings`,
    { signal },
  )
  return body.data
}

/* ------------------------------------------------------------------ */
/* Upsert a user setting value (create or update)                      */
/* ------------------------------------------------------------------ */

/**
 * Upsert a user setting value.
 * `value` should be in {"value": <actual>} format (the inner JSON shape
 * that the backend stores, excluding the goxus.Data wrapper).
 *
 * The HTTP body becomes:
 *   {"value": {"value": <actual>}}
 *
 * On the Go side, gin binds `Value` from the outer {"value": ...} key,
 * which gives goxus.JSON{Data: {"value": <actual>}}.
 */
export async function upsertUserSetting(
  userId: number,
  settingsId: number,
  value: unknown,
): Promise<void> {
  const token = getToken()
  if (!token) throw new Error("Not authenticated")

  await apiFetchJSON<UpsertSettingResponse>(
    `/api/v1/entity/user/${userId}/settings/${settingsId}`,
    {
      method: "PUT",
      body: JSON.stringify({ value }),
    },
  )
}