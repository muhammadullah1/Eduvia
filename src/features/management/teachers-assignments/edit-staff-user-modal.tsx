import { useEffect, useState } from "react"

import type { StaffDirectoryRow } from "@/api/staff/map-staff-directory"
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
import { CLS_MODAL_FOOTER } from "@/lib/cls-dialog-footer"
import {
  formatPhonePk,
  phonePkError,
} from "@/lib/pakistan-validation"

export type EditStaffPayload = {
  firstName: string
  lastName: string
  phone: string
  photo: string
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  staff: StaffDirectoryRow | null
  saving?: boolean
  onSubmit: (payload: EditStaffPayload) => Promise<void>
}

export function EditStaffUserModal({
  open,
  onOpenChange,
  staff,
  saving = false,
  onSubmit,
}: Props) {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [photo, setPhoto] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [phoneError, setPhoneError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !staff) return
    setFirstName(staff.firstName)
    setLastName(staff.lastName)
    setPhone(staff.phone === "—" ? "" : formatPhonePk(staff.phone))
    setPhoto(staff.photoUrl ?? "")
    setError(null)
    setPhoneError(null)
  }, [open, staff])

  async function handleSubmit() {
    const fn = firstName.trim()
    const ln = lastName.trim()
    if (!fn || !ln) {
      setError("First and last name are required.")
      return
    }
    const phoneTrimmed = phone.trim()
    if (phoneTrimmed) {
      const pErr = phonePkError(phoneTrimmed, "Phone")
      if (pErr) {
        setPhoneError(pErr)
        return
      }
    }
    setError(null)
    setPhoneError(null)
    await onSubmit({
      firstName: fn,
      lastName: ln,
      phone: phoneTrimmed,
      photo: photo.trim(),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-[var(--cls-border)] px-6 py-4 text-left">
          <DialogTitle className="text-lg font-semibold">Edit staff member</DialogTitle>
          <DialogDescription className="text-sm text-[var(--cls-muted)]">
            Update contact details and profile photo URL.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
          <div>
            <Label className="mb-1.5 block text-sm font-medium">First name *</Label>
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={saving}
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-sm font-medium">Last name *</Label>
            <Input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="mb-1.5 block text-sm font-medium">Email</Label>
            <Input value={staff?.email ?? ""} readOnly disabled className="bg-[var(--page-wash)]" />
          </div>
          <div>
            <Label className="mb-1.5 block text-sm font-medium">Phone</Label>
            <Input
              inputMode="tel"
              value={phone}
              onChange={(e) => {
                const next = formatPhonePk(e.target.value)
                setPhone(next)
                if (phoneError) setPhoneError(phonePkError(next, "Phone"))
              }}
              disabled={saving}
              aria-invalid={Boolean(phoneError)}
            />
            {phoneError ? (
              <p className="mt-1 text-xs text-destructive">{phoneError}</p>
            ) : null}
          </div>
          <div>
            <Label className="mb-1.5 block text-sm font-medium">Profile photo URL</Label>
            <Input
              value={photo}
              onChange={(e) => setPhoto(e.target.value)}
              placeholder="https://…"
              disabled={saving}
            />
          </div>
          {error ? (
            <p className="sm:col-span-2 text-sm text-destructive">{error}</p>
          ) : null}
        </div>
        <DialogFooter className={CLS_MODAL_FOOTER}>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"
            disabled={saving}
            onClick={() => void handleSubmit()}
          >
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
