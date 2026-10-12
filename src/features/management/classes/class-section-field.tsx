import { useEffect, useId, useMemo, useRef, useState } from "react"

import { buildClassLabel } from "@/api/classes/map-class"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

const SECTION_PRESETS = ["A", "B", "C"] as const
const CUSTOM_PRESET = "custom"

export type SectionLayout = "main" | "named"

type Props = {
  grade: string
  section: string
  onSectionChange: (section: string) => void
  disabled?: boolean
}

function isMainSection(section: string) {
  const s = section.trim()
  return s === "Main" || s === "General"
}

function layoutFromSection(section: string): SectionLayout {
  if (isMainSection(section)) return "main"
  return "named"
}

function presetFromSection(section: string) {
  if (isMainSection(section)) return SECTION_PRESETS[0]
  if ((SECTION_PRESETS as readonly string[]).includes(section)) return section
  if (!section.trim()) return CUSTOM_PRESET
  return CUSTOM_PRESET
}

export function ClassSectionField({
  grade,
  section,
  onSectionChange,
  disabled,
}: Props) {
  const customInputId = useId()
  const customInputRef = useRef<HTMLInputElement>(null)
  const [layout, setLayout] = useState<SectionLayout>(() =>
    layoutFromSection(section)
  )
  const [preset, setPreset] = useState(() => presetFromSection(section))
  const [customSection, setCustomSection] = useState(() => {
    const p = presetFromSection(section)
    return p === CUSTOM_PRESET && !isMainSection(section) ? section : ""
  })

  // Sync from parent when section changes externally (edit modal load, Standard selected).
  // Skip empty string — that means "custom selected, user still typing".
  useEffect(() => {
    if (section === "") return

    setLayout(layoutFromSection(section))
    const nextPreset = presetFromSection(section)
    setPreset(nextPreset)
    if (nextPreset === CUSTOM_PRESET) {
      setCustomSection(section.trim())
    } else {
      setCustomSection("")
    }
  }, [section])

  const previewSection =
    preset === CUSTOM_PRESET ? customSection.trim() || section : section

  const previewLabel = useMemo(
    () => buildClassLabel(grade, previewSection),
    [grade, previewSection]
  )

  function selectLayout(next: SectionLayout) {
    setLayout(next)
    if (next === "main") {
      setPreset(SECTION_PRESETS[0])
      setCustomSection("")
      onSectionChange("Main")
      return
    }
    if (preset === CUSTOM_PRESET) {
      onSectionChange(customSection.trim())
      return
    }
    const nextPreset = preset || SECTION_PRESETS[0]
    setPreset(nextPreset)
    onSectionChange(nextPreset)
  }

  function selectPreset(value: string) {
    if (value === CUSTOM_PRESET) {
      setPreset(CUSTOM_PRESET)
      setCustomSection("")
      onSectionChange("")
      requestAnimationFrame(() => customInputRef.current?.focus())
      return
    }
    setPreset(value)
    setCustomSection("")
    onSectionChange(value)
  }

  const showCustomInput = layout === "named" && preset === CUSTOM_PRESET

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-[var(--cls-ink)]">Section</Label>
      <ToggleGroup
        type="single"
        value={layout}
        onValueChange={(value) => {
          if (!value) return
          selectLayout(value as SectionLayout)
        }}
        className="grid w-full grid-cols-2 gap-2"
        disabled={disabled}
      >
        <ToggleGroupItem
          value="main"
          className={cn(
            "h-auto min-h-11 flex-col items-start gap-0.5 rounded-lg border px-3 py-2.5 text-left data-[state=on]:border-[var(--cls-brand)] data-[state=on]:bg-[var(--cls-brand)]/5"
          )}
        >
          <span className="text-sm font-medium">Standard</span>
          <span className="text-xs font-normal text-[var(--cls-muted)]">
            One class, no sections
          </span>
        </ToggleGroupItem>
        <ToggleGroupItem
          value="named"
          className={cn(
            "h-auto min-h-11 flex-col items-start gap-0.5 rounded-lg border px-3 py-2.5 text-left data-[state=on]:border-[var(--cls-brand)] data-[state=on]:bg-[var(--cls-brand)]/5"
          )}
        >
          <span className="text-sm font-medium">With sections</span>
          <span className="text-xs font-normal text-[var(--cls-muted)]">
            A, B, C, or a custom name
          </span>
        </ToggleGroupItem>
      </ToggleGroup>

      {layout === "named" ? (
        <div className="space-y-3 rounded-lg border border-[var(--cls-border)] bg-[var(--page-wash)]/60 p-3">
          <p className="text-xs font-medium text-[var(--cls-muted)]">
            Section label
          </p>
          <ToggleGroup
            type="single"
            value={preset}
            onValueChange={(value) => {
              if (!value) return
              selectPreset(value)
            }}
            className="flex flex-wrap justify-start gap-1.5"
            disabled={disabled}
          >
            {SECTION_PRESETS.map((name) => (
              <ToggleGroupItem
                key={name}
                value={name}
                size="sm"
                className="min-w-10 rounded-full px-3 data-[state=on]:bg-[var(--cls-brand)] data-[state=on]:text-white"
              >
                {name}
              </ToggleGroupItem>
            ))}
            <ToggleGroupItem
              value={CUSTOM_PRESET}
              size="sm"
              className="rounded-full px-3 data-[state=on]:bg-[var(--cls-brand)] data-[state=on]:text-white"
            >
              Custom
            </ToggleGroupItem>
          </ToggleGroup>

          {showCustomInput ? (
            <div className="rounded-md border border-[var(--cls-border)] bg-white p-3">
              <Label
                htmlFor={customInputId}
                className="mb-1.5 block text-sm font-medium text-[var(--cls-ink)]"
              >
                Your section name
              </Label>
              <Input
                ref={customInputRef}
                id={customInputId}
                value={customSection}
                onChange={(e) => {
                  const value = e.target.value
                  setCustomSection(value)
                  onSectionChange(value.trim())
                }}
                placeholder="e.g. Morning, Gold, North"
                disabled={disabled}
                maxLength={32}
                autoComplete="off"
              />
              <p className="mt-1.5 text-xs text-[var(--cls-muted)]">
                Enter any label your school uses for this section.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-lg border border-dashed border-[var(--cls-border)] bg-white px-3 py-2.5">
        <p className="text-xs text-[var(--cls-muted)]">Will appear as</p>
        <p className="text-sm font-semibold text-[var(--cls-ink)]">
          {previewLabel || "—"}
        </p>
      </div>
    </div>
  )
}
