import { useMutation } from "@tanstack/react-query"
import { useEffect, useState } from "react"

import schoolCatalogService, {
  type BlockDateRow,
} from "@/api/settings/school-catalog.service"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { toast } from "@/lib/toast"

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback
}

type DateMode = "single" | "multiple"

export function BlockDateDialog({
  open,
  onOpenChange,
  dateToEdit,
  initialStartDate,
  initialEndDate,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  dateToEdit: BlockDateRow | null
  initialStartDate?: string
  initialEndDate?: string
  onSuccess: () => void
}) {
  const [name, setName] = useState("")
  const [dateMode, setDateMode] = useState<DateMode>("single")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [description, setDescription] = useState("")
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (dateToEdit) {
      setName(dateToEdit.name)
      setStartDate(dateToEdit.startDate)
      setEndDate(dateToEdit.endDate)
      setDescription(dateToEdit.description ?? "")
      setDateMode(
        dateToEdit.endDate && dateToEdit.endDate !== dateToEdit.startDate
          ? "multiple"
          : "single"
      )
    } else {
      const start = initialStartDate ?? ""
      const end = initialEndDate ?? initialStartDate ?? ""
      setName("")
      setStartDate(start)
      setEndDate(end)
      setDescription("")
      setDateMode(end && start && end !== start ? "multiple" : "single")
    }
    setFormError(null)
  }, [dateToEdit, initialEndDate, initialStartDate, open])

  const mutation = useMutation({
    mutationFn: () => {
      if (!name.trim()) throw new Error("Event name is required.")
      if (!startDate) throw new Error("Date is required.")
      const resolvedEnd =
        dateMode === "single" ? startDate : endDate || startDate
      if (resolvedEnd < startDate) {
        throw new Error("End date cannot be earlier than start date.")
      }
      const body = {
        name: name.trim(),
        startDate,
        endDate: resolvedEnd,
        description: description.trim() || undefined,
      }
      if (dateToEdit) {
        return schoolCatalogService.updateBlockDate(dateToEdit.id, body)
      }
      return schoolCatalogService.createBlockDate(body)
    },
    onSuccess: () => {
      toast.success(dateToEdit ? "Block date updated" : "Block date saved")
      onOpenChange(false)
      onSuccess()
    },
    onError: (err) => {
      const msg = errorMessage(err, "Could not save block date.")
      setFormError(msg)
      toast.error(msg)
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="gap-0 overflow-hidden rounded-[14px] p-0 sm:max-w-[560px]"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            mutation.mutate()
          }}
          className="flex flex-col"
        >
          <DialogHeader className="gap-5 border-b border-[var(--cls-border)] px-6 py-7 text-left sm:text-left">
            <DialogTitle className="text-[22px] font-semibold tracking-tight text-[var(--heading)]">
              {dateToEdit ? "Edit Block Date" : "Add Block Date"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 px-6 py-5">
            {formError ? (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                {formError}
              </div>
            ) : null}

            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium text-[var(--heading)]">
                Event Name
              </Label>
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (formError) setFormError(null)
                }}
                placeholder="Enter event name"
                required
              />
            </div>

            <div className="flex flex-col gap-2.5">
              <Label className="text-sm font-medium text-[var(--heading)]">
                Date Type
              </Label>
              <div className="flex flex-wrap gap-4">
                {(
                  [
                    { id: "single", label: "Single Date" },
                    { id: "multiple", label: "Multiple Dates" },
                  ] as const
                ).map((option) => {
                  const selected = dateMode === option.id
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        setDateMode(option.id)
                        if (option.id === "single" && startDate) {
                          setEndDate(startDate)
                        }
                      }}
                      className="inline-flex items-center gap-1.5 text-[15px] font-medium"
                    >
                      <span
                        className={cn(
                          "inline-flex size-[22px] items-center justify-center rounded-full border-2",
                          selected
                            ? "border-[var(--primary-color)]"
                            : "border-[#C5C5C5]"
                        )}
                        aria-hidden
                      >
                        <span
                          className={cn(
                            "size-2.5 rounded-full transition-colors",
                            selected
                              ? "bg-[var(--primary-color)]"
                              : "bg-transparent"
                          )}
                        />
                      </span>
                      <span
                        className={
                          selected
                            ? "text-[var(--heading)]"
                            : "text-[var(--cls-muted)]"
                        }
                      >
                        {option.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {dateMode === "single" ? (
              <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium text-[var(--heading)]">
                  Date
                </Label>
                <DatePicker
                  value={startDate}
                  onChange={(val) => {
                    setStartDate(val)
                    setEndDate(val)
                    if (formError) setFormError(null)
                  }}
                  placeholder="--/--/----"
                  defaultMonthKind="today"
                />
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-medium text-[var(--heading)]">
                    Start Date
                  </Label>
                  <DatePicker
                    value={startDate}
                    onChange={(val) => {
                      setStartDate(val)
                      if (!endDate || endDate < val) setEndDate(val)
                      if (formError) setFormError(null)
                    }}
                    placeholder="--/--/----"
                    defaultMonthKind="today"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-medium text-[var(--heading)]">
                    End Date
                  </Label>
                  <DatePicker
                    value={endDate}
                    onChange={(val) => {
                      setEndDate(val)
                      if (formError) setFormError(null)
                    }}
                    placeholder="--/--/----"
                    defaultMonthKind="today"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium text-[var(--heading)]">
                Description
              </Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Type description here"
                className="min-h-24 resize-y"
              />
            </div>
          </div>

          <DialogFooter className="mx-0 mb-0 flex flex-row items-center justify-end gap-3 rounded-none border-0 bg-transparent p-0 px-6 pb-7">
            <Button
              type="button"
              variant="outline"
              disabled={mutation.isPending}
              onClick={() => onOpenChange(false)}
              className="h-10 rounded-xl border border-[#DEDEDE] bg-white px-4 text-sm font-semibold text-[var(--heading)] hover:bg-[var(--page-wash)]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending || !name.trim() || !startDate}
              className="h-10 rounded-[10px] px-3.5 text-sm font-semibold"
            >
              {mutation.isPending
                ? "Saving…"
                : dateToEdit
                  ? "Save changes"
                  : "Add Block Date"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
