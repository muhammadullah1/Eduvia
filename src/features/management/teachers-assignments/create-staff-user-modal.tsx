import { useEffect, useMemo, useState } from "react"

import type { SubjectRow } from "@/api/subjects/map-subject"
import {
  creatableStaffRoles,
  staffRoleLabel,
} from "@/api/staff/map-staff-directory"
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
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Role } from "@/lib/auth"
import { CLS_MODAL_FOOTER } from "@/lib/cls-dialog-footer"
import { StaffPhotoField } from "@/features/management/teachers-assignments/staff-photo-field"
import {
  formatPhonePk,
  phonePkError,
} from "@/lib/pakistan-validation"

export type CreateStaffPayload = {
  firstName: string
  lastName: string
  email: string
  phone: string
  role: Role
  subjectId?: number
  employeeCode?: string
  photo?: string
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  actorRole: Role
  subjects: SubjectRow[]
  saving?: boolean
  defaultRole?: Role
  onSubmit: (payload: CreateStaffPayload) => Promise<void>
}

function pickDefaultRole(roleOptions: Role[], preferred?: Role) {
  if (preferred && roleOptions.includes(preferred)) return preferred
  return roleOptions[0] ?? "teacher"
}

export function CreateStaffUserModal({
  open,
  onOpenChange,
  actorRole,
  subjects,
  saving = false,
  defaultRole,
  onSubmit,
}: Props) {
  const roleOptions = useMemo(
    () => creatableStaffRoles(actorRole),
    [actorRole]
  )

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [role, setRole] = useState<Role>(roleOptions[0] ?? "teacher")
  const [subjectId, setSubjectId] = useState("")
  const [employeeCode, setEmployeeCode] = useState("")
  const [photo, setPhoto] = useState("")
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setFirstName("")
    setLastName("")
    setEmail("")
    setPhone("")
    setRole(pickDefaultRole(roleOptions, defaultRole))
    setSubjectId("")
    setEmployeeCode("")
    setPhoto("")
    setPhoneError(null)
    setError(null)
  }, [open, roleOptions, defaultRole])

  const activeSubjects = subjects.filter((s) => s.status === "Active")

  async function handleSubmit() {
    const fn = firstName.trim()
    const ln = lastName.trim()
    const mail = email.trim().toLowerCase()
    if (!fn) {
      setError("First name is required.")
      return
    }
    if (!ln) {
      setError("Last name is required.")
      return
    }
    if (!mail) {
      setError("Email is required.")
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
    setPhoneError(null)
    if (role === "teacher") {
      const sid = Number(subjectId)
      if (!Number.isFinite(sid)) {
        setError("Choose a subject for this teacher.")
        return
      }
    }
    setError(null)
    const payload: CreateStaffPayload = {
      firstName: fn,
      lastName: ln,
      email: mail,
      phone: phoneTrimmed ? formatPhonePk(phoneTrimmed) : "",
      role,
      employeeCode: employeeCode.trim() || undefined,
      photo: photo.trim() || undefined,
    }
    if (role === "teacher") {
      payload.subjectId = Number(subjectId)
    }
    await onSubmit(payload)
  }

  let subjectField = null
  if (role === "teacher") {
    subjectField = (
      <div>
        <Label className="mb-1.5 block text-sm font-medium text-[var(--cls-ink)]">
          Subject <span className="text-destructive">*</span>
        </Label>
        <Select value={subjectId} onValueChange={setSubjectId} disabled={saving}>
          <SelectTrigger>
            <SelectValue placeholder="Select subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {activeSubjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name} ({subject.code})
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <p className="mt-1.5 text-xs text-[var(--cls-muted)]">
          Each teacher has one active subject. Class assignments come from the
          timetable.
        </p>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-[var(--cls-border)] px-6 py-4 text-left">
          <DialogTitle className="text-lg font-semibold text-[var(--cls-ink)]">
            Add staff member
          </DialogTitle>
          <DialogDescription className="text-sm text-[var(--cls-muted)]">
            Creates a portal account and emails a secure link to set a password.
            Teachers must have a subject. Employee code is optional.
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
            <Label className="mb-1.5 block text-sm font-medium">Email *</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@school.edu.pk"
              disabled={saving}
            />
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
            <Label className="mb-1.5 block text-sm font-medium">Role *</Label>
            <Select
              value={role}
              onValueChange={(value) => setRole(value as Role)}
              disabled={saving}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {roleOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {staffRoleLabel(option)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">{subjectField}</div>
          <StaffPhotoField
            value={photo}
            onChange={setPhoto}
            disabled={saving}
            onError={setError}
          />
          <div>
            <Label className="mb-1.5 block text-sm font-medium">
              Employee code <span className="text-[var(--cls-muted)]">(optional)</span>
            </Label>
            <Input
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              disabled={saving}
            />
          </div>
          {error ? (
            <p className="sm:col-span-2 text-sm text-destructive">{error}</p>
          ) : null}
        </div>
        <DialogFooter className={CLS_MODAL_FOOTER}>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"
            disabled={saving}
            onClick={() => void handleSubmit()}
          >
            {saving ? "Creating…" : "Create user"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
