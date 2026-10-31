import { ImageUp, Trash2 } from "lucide-react"
import { useEffect, useId, useMemo, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { fileRuleError,type FileRules } from "@/lib/file-rules"
import { cn } from "@/lib/utils"

type Props = {
  label: string
  /** Shown as initials when there is no picture. */
  name?: string
  rules: FileRules
  /** Picked but not yet saved. */
  file: File | null
  onFileChange: (file: File | null) => void
  /** The saved picture's display URL. */
  currentUrl?: string | null
  onRemoveCurrent?: () => void
  disabled?: boolean
  /** Round for people, rounded square for logos. */
  shape?: "circle" | "square"
  hint?: string
  className?: string
}

const MB = 1024 * 1024

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
}

/** A picture with Upload / Change / Remove beside it, previewed and checked before anything is uploaded. */
export function AvatarUploadField({
  label,
  name = "",
  rules,
  file,
  onFileChange,
  currentUrl,
  onRemoveCurrent,
  disabled,
  shape = "circle",
  hint,
  className,
}: Props) {
  const inputId = useId()
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const previewUrl = useMemo(() => {
    if (!file) return null
    return URL.createObjectURL(file)
  }, [file])

  useEffect(() => {
    if (!previewUrl) return
    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  const shown = previewUrl ?? currentUrl ?? null
  const hasPicture = Boolean(shown)
  const radius = shape === "circle" ? "rounded-full" : "rounded-2xl"

  function pick(picked: File | undefined) {
    if (input.current) input.current.value = ""
    if (!picked) return
    const problem = fileRuleError(picked, rules)
    setError(problem)
    if (!problem) onFileChange(picked)
  }

  function remove() {
    setError(null)
    if (file) {
      onFileChange(null)
      return
    }
    onRemoveCurrent?.()
  }

  const canRemove = Boolean(file) || Boolean(currentUrl && onRemoveCurrent)

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "flex size-20 shrink-0 items-center justify-center overflow-hidden border border-[var(--cls-border)] bg-[#F3F6F6] text-lg font-semibold text-[var(--cls-brand)]",
            radius
          )}
          data-testid="avatar-preview"
        >
          {shown && <img src={shown} alt={`${label} preview`} className="size-full object-cover" />}
          {!shown && <span aria-hidden>{initialsOf(name) || <ImageUp className="size-6" />}</span>}
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={disabled} onClick={() => input.current?.click()}>
              <ImageUp data-icon="inline-start" />
              {hasPicture && "Change"}
              {!hasPicture && "Upload"}
            </Button>
            {canRemove && (
              <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={remove}>
                <Trash2 data-icon="inline-start" />
                Remove
              </Button>
            )}
          </div>
          <p className="text-xs text-[var(--cls-muted)]">
            {hint ?? `${rules.label}, up to ${rules.maxBytes / MB} MB.`}
          </p>
        </div>
      </div>
      <input
        ref={input}
        id={inputId}
        type="file"
        className="sr-only"
        aria-label={`Choose ${label.toLowerCase()}`}
        accept={rules.types.join(",")}
        disabled={disabled}
        onChange={(event) => pick(Array.from(event.target.files ?? []).at(0))}
      />
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
