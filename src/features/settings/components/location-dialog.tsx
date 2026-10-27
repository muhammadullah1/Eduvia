import { useMutation } from "@tanstack/react-query"
import { useEffect, useState } from "react"

import schoolCatalogService, {
  type LocationRow,
} from "@/api/settings/school-catalog.service"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/lib/toast"

const LOCATION_TYPES = [
  "classroom",
  "lab",
  "auditorium",
  "gym",
  "library",
  "playground",
  "online",
  "other",
] as const

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback
}

export function LocationDialog({
  open,
  onOpenChange,
  locationToEdit,
  sessions,
  activeSessionId,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  locationToEdit: LocationRow | null
  sessions: { id: string; name: string; current: boolean }[]
  activeSessionId: string
  onSuccess: () => void
}) {
  const [sessionId, setSessionId] = useState(activeSessionId)
  const [name, setName] = useState("")
  const [locationCode, setLocationCode] = useState("")
  const [locationType, setLocationType] = useState<string>("classroom")
  const [capacity, setCapacity] = useState("30")
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (locationToEdit) {
      setSessionId(String(locationToEdit.fkSessionId))
      setName(locationToEdit.name)
      setLocationCode(locationToEdit.locationCode ?? "")
      setLocationType(locationToEdit.locationType ?? "classroom")
      setCapacity(String(locationToEdit.capacity ?? 30))
    } else {
      setSessionId(activeSessionId)
      setName("")
      setLocationCode("")
      setLocationType("classroom")
      setCapacity("30")
    }
    setFormError(null)
  }, [locationToEdit, activeSessionId, open])

  const mutation = useMutation({
    mutationFn: () => {
      if (!name.trim()) throw new Error("Location name is required.")
      if (!sessionId) throw new Error("Session is required.")
      const body = {
        name: name.trim(),
        fkSessionId: Number(sessionId),
        locationCode: locationCode.trim() || null,
        locationType,
        capacity: Number(capacity) || 30,
      }
      if (locationToEdit) {
        return schoolCatalogService.updateLocation(locationToEdit.id, body)
      }
      return schoolCatalogService.createLocation(body)
    },
    onSuccess: () => {
      toast.success(locationToEdit ? "Location updated" : "Location saved")
      onOpenChange(false)
      onSuccess()
    },
    onError: (err) => {
      const msg = errorMessage(err, "Could not save location.")
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
              {locationToEdit ? "Edit Room" : "Add New Room"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Classroom, laboratory, auditorium, or facility for class timetables.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-5 px-6 py-5">
            {formError ? (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                {formError}
              </div>
            ) : null}

            <div className="flex flex-col gap-3">
              <Label className="text-sm font-medium text-[var(--heading)]">
                Session
              </Label>
              <Select value={sessionId} onValueChange={setSessionId}>
                <SelectTrigger className="h-12 rounded-[10px] bg-white px-4">
                  <SelectValue placeholder="Choose a session" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((session) => (
                    <SelectItem key={session.id} value={session.id}>
                      {session.name}
                      {session.current ? " · Current" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-3">
              <Label className="text-sm font-medium text-[var(--heading)]">
                Room Name
              </Label>
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (formError) setFormError(null)
                }}
                placeholder="e.g. Room 101, Science Lab A"
                className="h-12 rounded-[10px] px-4"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-3">
                <Label className="text-sm font-medium text-[var(--heading)]">
                  Location Code
                </Label>
                <Input
                  value={locationCode}
                  onChange={(e) => setLocationCode(e.target.value)}
                  placeholder="e.g. R-101"
                  className="h-12 rounded-[10px] px-4"
                />
              </div>
              <div className="flex flex-col gap-3">
                <Label className="text-sm font-medium text-[var(--heading)]">
                  Capacity
                </Label>
                <Input
                  inputMode="numeric"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value.replace(/\D/g, ""))}
                  placeholder="30"
                  className="h-12 rounded-[10px] px-4"
                  required
                />
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Label className="text-sm font-medium text-[var(--heading)]">
                Location Type
              </Label>
              <Select value={locationType} onValueChange={setLocationType}>
                <SelectTrigger className="h-12 rounded-[10px] px-4">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOCATION_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replaceAll("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              disabled={mutation.isPending || !name.trim() || !sessionId}
              className="h-10 rounded-[10px] px-3.5 text-sm font-semibold"
            >
              {mutation.isPending
                ? "Saving…"
                : locationToEdit
                  ? "Save changes"
                  : "Add New Room"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
