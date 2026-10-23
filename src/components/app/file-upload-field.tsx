import { FileText, Paperclip, X } from "lucide-react"
import { useEffect, useId, useMemo, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { fileRuleError, type FileRules } from "@/lib/file-rules"
import { cn } from "@/lib/utils"

type Props = {
  rules: FileRules
  /** File picked but not uploaded yet (uploaded by the form on save). */
  file: File | null
  onFileChange: (file: File | null) => void
  /** Name of the already-stored file, if any. */
  storedName?: string | null
  /** Display URL of the stored file (image preview only). */
  storedPreviewUrl?: string | null
  /** Clears the stored file; the form saves the change. */
  onRemoveStored?: () => void
  disabled?: boolean
  /** Show a round image preview (profile photos). */
  imagePreview?: boolean
  placeholder?: string
  id?: string
  "aria-label"?: string
}

/**
 * Input-styled file picker shared by the staff form and the admission
 * wizard. It validates type and size and shows a local preview; the form
 * uploads the file (presigned R2 PUT) only when it is saved.
 */
export function FileUploadField({
  rules,
  file,
  onFileChange,
  storedName,
  storedPreviewUrl,
  onRemoveStored,
  disabled,
  imagePreview = false,
  placeholder = "No file chosen",
  id,
  "aria-label": ariaLabel,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const fallbackId = useId()
  const inputId = id ?? fallbackId
  const [error, setError] = useState<string | null>(null)

  const localPreview = useMemo(
    () => (file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null),
    [file]
  )
  useEffect(() => {
    if (!localPreview) return undefined
    return () => URL.revokeObjectURL(localPreview)
  }, [localPreview])

  const preview = localPreview ?? storedPreviewUrl ?? null
  const shownName = file?.name ?? storedName ?? ""
  const hasValue = Boolean(file || storedName)

  function pick(next: File | undefined) {
    if (!next) return
    const problem = fileRuleError(next, rules)
    setError(problem)
    if (!problem) onFileChange(next)
  }

  function clear() {
    setError(null)
    if (file) onFileChange(null)
    else onRemoveStored?.()
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-3">
        {imagePreview ? (
          <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full border border-[var(--cls-border)] bg-[var(--page-wash)]">
            {preview ? (
              <img src={preview} alt="Preview" className="size-full object-cover" data-testid="file-upload-preview" />
            ) : (
              <span className="text-[10px] text-[var(--cls-muted)]">None</span>
            )}
          </div>
        ) : null}
        <div
          className={cn(
            "flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border border-input bg-transparent pr-1 pl-3 text-sm shadow-xs",
            error && "border-destructive",
            disabled && "opacity-60"
          )}
        >
          {imagePreview ? (
            <Paperclip className="size-4 shrink-0 text-[var(--cls-muted)]" aria-hidden />
          ) : (
            <FileText className="size-4 shrink-0 text-[var(--cls-muted)]" aria-hidden />
          )}
          <label
            htmlFor={inputId}
            className={cn("min-w-0 flex-1 cursor-pointer truncate", shownName ? "text-[var(--cls-ink)]" : "text-muted-foreground")}
          >
            {shownName || placeholder}
          </label>
          {hasValue && (file || onRemoveStored) ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-7 text-[var(--cls-muted)]"
              aria-label="Remove file"
              disabled={disabled}
              onClick={clear}
            >
              <X className="size-3.5" />
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 border-[var(--cls-border)] px-2.5 text-xs"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            {hasValue ? "Replace" : "Choose file"}
          </Button>
        </div>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={rules.types.join(",")}
          aria-label={ariaLabel}
          className="sr-only"
          disabled={disabled}
          onChange={(event) => {
            const next = event.target.files?.[0]
            event.target.value = ""
            pick(next)
          }}
        />
      </div>
      <p className={cn("text-xs", error ? "text-destructive" : "text-[var(--cls-muted)]")}>
        {error ?? (file ? "Uploads when you save." : `${rules.label}. ${rules.maxBytes / (1024 * 1024)} MB maximum.`)}
      </p>
    </div>
  )
}
