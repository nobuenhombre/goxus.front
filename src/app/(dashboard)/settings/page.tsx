"use client"

import { useEffect, useState, useMemo, useCallback, useRef, Suspense } from "react"
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
import { SettingsSidebarNav } from "@/components/settings-sidebar-nav"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem, SelectGroup,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
} from "@/components/ui/combobox"
import { Check, Palette, Bell, UserGear, Monitor, GearSix } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
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
// Value format: {"value": {"1": true, "2": false}} (multi-select map)
// Available values: {"value": {"1": "Light", "2": "Dark"}}
// Always renders Checkboxes (multi-select), never RadioGroup.

function ListChecksField({ definition, value, onChange }: FieldProps) {
  const options = extractSettingOptions(definition.available_values)
  const rawCurrent = extractSettingValue(value)

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
      onValueChange={(v) => onChange({ value: isNaN(Number(v)) ? v : Number(v) })}
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
      onValueChange={(v) => onChange({ value: isNaN(Number(v)) ? v : Number(v) })}
    >
      <SelectTrigger className="w-50">
        <SelectValue placeholder="Select..." />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
        {Object.entries(options).map(([key, label]) => (
          <SelectItem key={key} value={key}>
            {label}
          </SelectItem>
        ))}
        </SelectGroup>
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

// ── inputIntSlider ───────────────────────────────────────────────────
// Value format: {"value": 30}
// Available values: {"value": {"min": 15, "max": 120, "step": 15}}
// Renders single-thumb Radix Slider + numeric label.

function InputIntSliderField({ definition, value, onChange }: FieldProps) {
  const rawAvailable = extractSettingValue(definition.available_values)
  const rangeConfig =
    rawAvailable && typeof rawAvailable === "object"
      ? (rawAvailable as Record<string, number>)
      : {}
  const min = rangeConfig.min ?? 0
  const max = rangeConfig.max ?? 100
  const step = rangeConfig.step ?? 1
  const currentValue = Number(extractSettingValue(value) ?? min)

  return (
    <div className="flex items-center gap-4 max-w-sm">
      <Slider
        value={[currentValue]}
        onValueChange={([v]) => onChange({ value: v })}
        min={min}
        max={max}
        step={step}
        className="flex-1"
      />
      <span className="min-w-12 text-right text-sm tabular-nums text-muted-foreground">
        {currentValue}
      </span>
    </div>
  )
}

// ── inputIntSliderRange ──────────────────────────────────────────────
// Value format: {"value": {"start": 150, "end": 300}}
// Available values: {"value": {"min": 100, "max": 400, "step": 10}}
// Renders dual-thumb Radix Slider + range label.

function InputIntSliderRangeField({ definition, value, onChange }: FieldProps) {
  const rawAvailable = extractSettingValue(definition.available_values)
  const rangeConfig =
    rawAvailable && typeof rawAvailable === "object"
      ? (rawAvailable as Record<string, number>)
      : {}
  const min = rangeConfig.min ?? 0
  const max = rangeConfig.max ?? 100
  const step = rangeConfig.step ?? 1

  const rawValue = extractSettingValue(value)
  const rangeValue =
    rawValue && typeof rawValue === "object"
      ? (rawValue as Record<string, number>)
      : {}
  const startValue = rangeValue.start ?? min
  const endValue = rangeValue.end ?? max

  return (
    <div className="flex items-center gap-4 max-w-sm">
      <Slider
        value={[startValue, endValue]}
        onValueChange={([s, e]) => onChange({ value: { start: s, end: e } })}
        min={min}
        max={max}
        step={step}
        className="flex-1"
      />
      <span className="min-w-20 text-right text-sm tabular-nums text-muted-foreground whitespace-nowrap">
        {startValue} – {endValue}
      </span>
    </div>
  )
}

// ── selectWithSearch ─────────────────────────────────────────────────
// Value format: {"value": "en"}
// Available values: {"value": {"en": "English", "ru": "Русский"}}
// Renders Base UI Combobox with search input.

function SelectWithSearchField({ definition, value, onChange }: FieldProps) {
  const options = extractSettingOptions(definition.available_values)
  const currentKey = String(extractSettingValue(value) ?? "")
  const itemKeys = Object.keys(options)

  return (
    <Combobox
      value={currentKey}
      onValueChange={(v) => {
        if (v == null) return
        onChange({ value: isNaN(Number(v)) ? v : Number(v) })
      }}
      items={itemKeys}
      itemToStringLabel={(key) => options[key as string]}
    >
      <ComboboxInput
        placeholder="Search..."
        showClear
        className="w-60"
      />
      <ComboboxContent>
        <ComboboxList>
          {(key: string) => (
            <ComboboxItem key={key} value={key}>
              <span
                className={cn(
                  "absolute right-2 flex size-4 items-center justify-center",
                  currentKey === key ? "opacity-100" : "opacity-0",
                )}
              >
                <Check className="size-4" />
              </span>
              {options[key]}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
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
  inputIntSlider: InputIntSliderField,
  inputIntSliderRange: InputIntSliderRangeField,
  switch: SwitchField,
  listChecks: ListChecksField,
  listRadios: ListRadiosField,
  selectSimple: SelectSimpleField,
  selectWithSearch: SelectWithSearchField,
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

  // Per-setting debounce timers (1 s after last change)
  const saveTimersRef = useRef<Record<number, ReturnType<typeof setTimeout> | null>>({})

  // --- Selected settings group ---
  const [selectedGroup, setSelectedGroup] = useState<string>("")

  // Map group names to icons
  const groupIcon = useCallback((name: string) => {
    const lower = name.toLowerCase()
    if (lower.includes("profile") || lower.includes("user")) return <UserGear size={18} />
    if (lower.includes("appearance") || lower.includes("theme")) return <Palette size={18} />
    if (lower.includes("notif")) return <Bell size={18} />
    if (lower.includes("display") || lower.includes("monitor")) return <Monitor size={18} />
    if (lower.includes("account")) return <UserGear size={18} />
    return <GearSix size={18} />
  }, [])

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

  // --- Auto-save: debounce timer (1 s after last change) ---
  const doSave = useCallback(
    async (def: SettingsDefinition, value: unknown) => {
      if (!userId) return
      if (value === undefined) return

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
      }
    },
    [userId],
  )

  const handleChange = useCallback(
    (def: SettingsDefinition, newValue: unknown) => {
      // Update dirty values immediately so UI reflects the new value
      setDirtyValues((prev) => ({
        ...prev,
        [def.id]: newValue,
      }))

      // Clear existing timer for this setting
      if (saveTimersRef.current[def.id]) {
        clearTimeout(saveTimersRef.current[def.id]!)
      }

      // Set new 1-second timer
      saveTimersRef.current[def.id] = setTimeout(() => {
        doSave(def, newValue)
      }, 1000)
    },
    [doSave],
  )

  // Cleanup all timers on unmount
  useEffect(() => {
    const timers = saveTimersRef.current
    return () => {
      for (const id of Object.keys(timers)) {
        const t = timers[Number(id)]
        if (t) clearTimeout(t)
      }
    }
  }, [])

  // --- Build sidebar nav items from group keys ---
  const groupKeys = useMemo(() => Object.keys(grouped), [grouped])

  const sidebarNavItems = useMemo(
    () =>
      groupKeys.map((key) => ({
        id: key,
        title: key,
        icon: groupIcon(key),
      })),
    [groupKeys, groupIcon],
  )

  // Set first group as default when data loads
  useEffect(() => {
    if (!selectedGroup && groupKeys.length > 0) {
      setSelectedGroup(groupKeys[0])
    }
  }, [groupKeys, selectedGroup])

  // --- Render content for the currently selected group ---
  const renderSelectedGroupContent = () => {
    if (!selectedGroup || !grouped[selectedGroup]) return null
    const settings = grouped[selectedGroup]
    return (
      <div className="flex flex-1 flex-col">
        <div className="flex-none">
          <h3 className="text-lg font-medium">{selectedGroup}</h3>
          <p className="text-sm text-muted-foreground">
            Customize your {selectedGroup.toLowerCase()} settings.
          </p>
        </div>
        <Separator className="my-4 flex-none" />
        <div className="faded-bottom h-full w-full overflow-y-auto scroll-smooth pt-1 pe-4 pb-12">
          <div className="-mx-1 space-y-4 px-1.5 lg:max-w-xl">
            {settings.map((def) => {
              const FieldComponent =
                fieldRegistry[def.type] || UnknownField
              const currentValue = getValue(def)

              return (
                <Card key={def.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">
                      {def.name}
                    </CardTitle>
                    {def.description && (
                      <CardDescription className="text-xs">
                        {def.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <FieldComponent
                      definition={def}
                      value={currentValue}
                      onChange={(newValue) =>
                        handleChange(def, newValue)
                      }
                    />
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    )
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

      <Separator className="my-4 lg:my-6" />

      {/* Two-column layout: sidebar nav + selected group content */}
      <div className="flex flex-1 flex-col space-y-2 overflow-hidden md:space-y-2 lg:flex-row lg:space-y-0 lg:space-x-12">
        <aside className="top-0 lg:sticky lg:w-1/5">
          <SettingsSidebarNav
            items={sidebarNavItems}
            selectedId={selectedGroup}
            onSelect={setSelectedGroup}
          />
        </aside>
        <div className="flex w-full overflow-y-hidden p-1">
          {renderSelectedGroupContent()}
        </div>
      </div>
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
