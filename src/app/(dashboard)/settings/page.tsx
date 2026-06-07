"use client"

import { useEffect, useState, useMemo, useCallback, Suspense } from "react"
import { useRouter } from "next/navigation"

import { getUserId, clearToken } from "@/lib/auth"
import {
  fetchSettingsDefinitions,
  fetchUserSettings,
  upsertUserSetting,
  extractGoxusData,
  extractSettingValue,
  extractSettingOptions,
  type SettingsDefinition,
  type UserSetting,
} from "@/lib/settings"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"

/* -------------------------------------------------------------------- */
/* Setting field renderers                                               */
/*                                                                      */
/* Each field receives:                                                 */
/*   value     — the inner value after extractGoxusData (e.g.           */
/*               {"value": 1} for a single selection, or raw primitive) */
/*   onChange  — called with the value to store, in {"value": <actual>} */
/*               format                                                  */
/* -------------------------------------------------------------------- */

interface FieldProps {
  definition: SettingsDefinition
  value: unknown
  onChange: (value: unknown) => void
}

// ── listChecks ───────────────────────────────────────────────────────
// Value format: {"value": 1} (single select key) or
//               {"value": {"1": true, "2": false}} (multi-select map)
// Available values: {"value": {"1": "Light", "2": "Dark"}}

function ListChecksField({ definition, value, onChange }: FieldProps) {
  const options = extractSettingOptions(definition.available_values)
  const rawCurrent = extractSettingValue(value)

  // Detect mode: single key (number/string) vs map of booleans
  const isSingleSelect =
    rawCurrent != null && typeof rawCurrent !== "object"

  if (isSingleSelect) {
    // ── Single-select mode (like Theme: {"value": 1}) ──
    const selectedKey = String(rawCurrent ?? "")

    return (
      <RadioGroup
        value={selectedKey}
        onValueChange={(v) => onChange({ value: v ? Number(v) : null })}
      >
        {Object.entries(options).map(([key, label]) => (
          <label
            key={key}
            className="flex cursor-pointer items-center gap-2 text-sm"
          >
            <RadioGroupItem value={key} />
            {label}
          </label>
        ))}
      </RadioGroup>
    )
  }

  // ── Multi-select mode: {"value": {"1": true, "2": false}} ──
  const checkedMap =
    rawCurrent && typeof rawCurrent === "object"
      ? (rawCurrent as Record<string, boolean>)
      : {}

  const toggle = (key: string) => {
    const next = { ...checkedMap }
    next[key] = !next[key]
    onChange({ value: next })
  }

  return (
    <div className="flex flex-col gap-2">
      {Object.entries(options).map(([key, label]) => (
        <label
          key={key}
          className="flex cursor-pointer items-center gap-2 text-sm"
        >
          <Checkbox
            checked={checkedMap[key] ?? false}
            onCheckedChange={() => toggle(key)}
          />
          {label}
        </label>
      ))}
    </div>
  )
}

// ── listRadios ───────────────────────────────────────────────────────
// Value format: {"value": 1}
// Available values: {"value": {"1": "Label A", "2": "Label B"}}

function ListRadiosField({ definition, value, onChange }: FieldProps) {
  const options = extractSettingOptions(definition.available_values)
  const currentKey = String(extractSettingValue(value) ?? "")

  return (
    <RadioGroup
      value={currentKey}
      onValueChange={(v) => onChange({ value: v ? Number(v) : null })}
    >
      {Object.entries(options).map(([key, label]) => (
        <label
          key={key}
          className="flex cursor-pointer items-center gap-2 text-sm"
        >
          <RadioGroupItem value={key} />
          {label}
        </label>
      ))}
    </RadioGroup>
  )
}

// ── selectSimple ─────────────────────────────────────────────────────
// Value format: {"value": 3}
// Available values: {"value": {"1": "A", "2": "B", "3": "C"}}

function SelectSimpleField({ definition, value, onChange }: FieldProps) {
  const options = extractSettingOptions(definition.available_values)
  const currentKey = String(extractSettingValue(value) ?? "")

  return (
    <Select
      value={currentKey}
      onValueChange={(v) => onChange({ value: v ? Number(v) : null })}
    >
      <SelectTrigger className="w-50">
        <SelectValue placeholder="Select..." />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(options).map(([key, label]) => (
          <SelectItem key={key} value={key}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// ── switch ───────────────────────────────────────────────────────────
// Value format: {"value": true}

function SwitchField({ definition, value, onChange }: FieldProps) {
  const currentValue = Boolean(extractSettingValue(value) ?? false)

  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={currentValue}
        onCheckedChange={(v) => onChange({ value: v })}
      />
      <span className="text-sm text-muted-foreground">
        {currentValue ? "On" : "Off"}
      </span>
    </div>
  )
}

// ── inputTextField ───────────────────────────────────────────────────
// Value format: {"value": "hello world"}

function InputTextField({ definition, value, onChange }: FieldProps) {
  const currentValue = String(extractSettingValue(value) ?? "")

  return (
    <Input
      value={currentValue}
      onChange={(e) => onChange({ value: e.target.value })}
      className="max-w-sm"
    />
  )
}

// ── inputPasswordField ───────────────────────────────────────────────

function InputPasswordField({ definition, value, onChange }: FieldProps) {
  const currentValue = String(extractSettingValue(value) ?? "")

  return (
    <Input
      type="password"
      value={currentValue}
      onChange={(e) => onChange({ value: e.target.value })}
      className="max-w-sm"
    />
  )
}

// ── inputIntNumberField ──────────────────────────────────────────────

function InputIntNumberField({ definition, value, onChange }: FieldProps) {
  const currentValue = String(extractSettingValue(value) ?? "")

  return (
    <Input
      type="number"
      value={currentValue}
      onChange={(e) =>
        onChange({ value: e.target.value ? Number(e.target.value) : null })
      }
      className="max-w-xs"
    />
  )
}

// ── inputFloatNumberField ────────────────────────────────────────────

function InputFloatNumberField({ definition, value, onChange }: FieldProps) {
  const currentValue = String(extractSettingValue(value) ?? "")

  return (
    <Input
      type="number"
      step="any"
      value={currentValue}
      onChange={(e) =>
        onChange({ value: e.target.value ? Number(e.target.value) : null })
      }
      className="max-w-xs"
    />
  )
}

// ── textareaField ────────────────────────────────────────────────────

function TextareaField({ definition, value, onChange }: FieldProps) {
  const currentValue = String(extractSettingValue(value) ?? "")

  return (
    <Textarea
      value={currentValue}
      onChange={(e) => onChange({ value: e.target.value })}
      className="max-w-md"
      rows={4}
    />
  )
}

// ── Fallback ─────────────────────────────────────────────────────────

function UnknownField({ definition, value, onChange }: FieldProps) {
  const currentValue = JSON.stringify(extractSettingValue(value) ?? "")

  return (
    <Input
      value={currentValue}
      onChange={(e) => {
        try {
          onChange({ value: JSON.parse(e.target.value) })
        } catch {
          onChange({ value: e.target.value })
        }
      }}
      className="max-w-sm font-mono text-xs"
    />
  )
}

/* -------------------------------------------------------------------- */
/* Setting field registry                                                */
/* -------------------------------------------------------------------- */

const fieldRegistry: Record<string, React.ComponentType<FieldProps>> = {
  inputTextField: InputTextField,
  inputPasswordField: InputPasswordField,
  inputIntNumberField: InputIntNumberField,
  inputFloatNumberField: InputFloatNumberField,
  textareaField: TextareaField,
  inputIntSlider: InputTextField,
  inputIntSliderRange: InputTextField,
  switch: SwitchField,
  listChecks: ListChecksField,
  listRadios: ListRadiosField,
  selectSimple: SelectSimpleField,
  selectWithSearch: SelectSimpleField,
}

/* -------------------------------------------------------------------- */
/* Value resolution                                                      */
/* -------------------------------------------------------------------- */

/**
 * Resolve the display value for a setting.
 *
 * Priority: dirty value > user_setting > default_value.
 * Returns the raw goxus.JSON value (with Data wrapper) from the backend.
 * Field components handle unwrapping via extractGoxusData / extractSettingValue.
 */
function resolveValue(
  definition: SettingsDefinition,
  userSetting: UserSetting | undefined,
): unknown {
  if (userSetting) return userSetting.value
  return definition.default_value
}

/* -------------------------------------------------------------------- */
/* Settings page content                                                 */
/* -------------------------------------------------------------------- */

function SettingsPageContent() {
  const router = useRouter()
  const userId = getUserId()

  // --- Data ---
  const [definitions, setDefinitions] = useState<SettingsDefinition[]>([])
  const [userSettings, setUserSettings] = useState<UserSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // --- Editable state ---
  // Map keyed by definition.id, stores the new value in {"value": <actual>} format
  const [dirtyValues, setDirtyValues] = useState<Record<number, unknown>>({})
  const [savingId, setSavingId] = useState<number | null>(null)

  // Build a lookup of user settings by settings_id
  const userSettingsByDefId = useMemo(() => {
    const map: Record<number, UserSetting> = {}
    for (const us of userSettings) {
      map[us.settings_id] = us
    }
    return map
  }, [userSettings])

  // Get current display value for a definition (dirty > userSetting > default)
  const getValue = useCallback(
    (def: SettingsDefinition): unknown => {
      if (def.id in dirtyValues) return dirtyValues[def.id]
      return resolveValue(def, userSettingsByDefId[def.id])
    },
    [dirtyValues, userSettingsByDefId],
  )

  // --- Group definitions by group name ---
  const grouped = useMemo(() => {
    const groups: Record<string, SettingsDefinition[]> = {}
    for (const def of definitions) {
      const g = def.group || "Other"
      if (!groups[g]) groups[g] = []
      groups[g].push(def)
    }
    return groups
  }, [definitions])

  // --- Load data ---
  const loadData = useCallback(
    async (signal: AbortSignal) => {
      if (!userId) return
      setLoading(true)
      setError(null)
      try {
        const [defs, us] = await Promise.all([
          fetchSettingsDefinitions(signal),
          fetchUserSettings(userId, signal),
        ])
        setDefinitions(defs)
        setUserSettings(us)
      } catch (err) {
        if ((err as Error).name === "AbortError") return
        const msg = err instanceof Error ? err.message : "Failed to load settings"
        if (
          msg.includes("Not Found") ||
          msg.includes("user token not found") ||
          msg.includes("Not Authenticated") ||
          msg.includes("401")
        ) {
          clearToken()
          router.replace("/login")
          return
        }
        setError(msg)
      } finally {
        setLoading(false)
      }
    },
    [userId, router],
  )

  useEffect(() => {
    const controller = new AbortController()
    loadData(controller.signal)
    return () => controller.abort()
  }, [loadData])

  // --- Save single setting ---
  const handleSave = async (def: SettingsDefinition) => {
    if (!userId) return
    const value = dirtyValues[def.id]
    if (value === undefined) return

    setSavingId(def.id)
    try {
      await upsertUserSetting(userId, def.id, value)
      // Update local state so displayed value reflects saved state
      setUserSettings((prev) => {
        const existing = prev.find((us) => us.settings_id === def.id)
        if (existing) {
          return prev.map((us) =>
            us.settings_id === def.id ? { ...us, value } : us,
          )
        }
        return [
          ...prev,
          {
            user_settings_id: 0,
            settings_id: def.id,
            type: def.type,
            group: def.group,
            name: def.name,
            description: def.description,
            available_values: def.available_values,
            value,
          },
        ]
      })
      setDirtyValues((prev) => {
        const next = { ...prev }
        delete next[def.id]
        return next
      })
      toast.success(`"${def.name}" saved`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save"
      toast.error(msg)
    } finally {
      setSavingId(null)
    }
  }

  // --- Loading state ---
  if (loading) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your account settings.
          </p>
        </div>
        <Separator />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full max-w-sm" />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  // --- Error state ---
  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <div className="flex flex-col items-center justify-center rounded-md border py-12 text-muted-foreground">
          <p className="text-sm">Failed to load settings</p>
          <p className="mt-1 text-xs">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => router.refresh()}
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  // --- Empty state ---
  if (definitions.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your account settings.
          </p>
        </div>
        <Separator />
        <div className="flex items-center justify-center rounded-md border py-12 text-sm text-muted-foreground">
          No settings available.
        </div>
      </div>
    )
  }

  // --- Render ---
  return (
    <div className="space-y-4">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account settings and set your preferences.
        </p>
      </div>

      <Separator />

      {/* Settings by group */}
      {Object.entries(grouped).map(([groupName, settings]) => (
        <Card key={groupName}>
          <CardHeader>
            <CardTitle className="text-lg">{groupName}</CardTitle>
            <CardDescription>
              Customize your {groupName.toLowerCase()} settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {settings.map((def) => {
              const FieldComponent =
                fieldRegistry[def.type] || UnknownField
              const isDirty = def.id in dirtyValues
              const isSaving = savingId === def.id
              const currentValue = getValue(def)

              return (
                <div key={def.id} className="space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <Label className="text-sm font-medium">
                        {def.name}
                      </Label>
                      {def.description && (
                        <p className="text-xs text-muted-foreground">
                          {def.description}
                        </p>
                      )}
                    </div>
                    {isDirty && (
                      <Button
                        size="sm"
                        onClick={() => handleSave(def)}
                        disabled={isSaving}
                      >
                        {isSaving ? "Saving..." : "Save"}
                      </Button>
                    )}
                  </div>

                  <FieldComponent
                    definition={def}
                    value={currentValue}
                    onChange={(newValue) =>
                      setDirtyValues((prev) => ({
                        ...prev,
                        [def.id]: newValue,
                      }))
                    }
                  />
                </div>
              )
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------- */
/* Page export                                                           */
/* -------------------------------------------------------------------- */

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
            <p className="text-sm text-muted-foreground">
              Manage your account settings.
            </p>
          </div>
          <Separator />
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full max-w-sm" />
              ))}
            </CardContent>
          </Card>
        </div>
      }
    >
      <SettingsPageContent />
    </Suspense>
  )
}