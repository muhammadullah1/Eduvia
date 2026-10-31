import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

import schoolCatalogService, {
  type SchoolProfile,
  type SchoolProfileUpdate,
} from "@/api/settings/school-catalog.service"
import { Field } from "@/components/app/kit"
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
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/lib/toast"

const NAME_MIN = 2
const NAME_MAX = 255
const PHONE_MAX = 50
const ADDRESS_MAX = 500
const PHONE_PATTERN = /^[0-9+()\-\s]*$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const WEBSITE_PATTERN = /^https?:\/\/\S+$/i

type Errors = Partial<Record<keyof SchoolProfileUpdate, string>>

/** Same rules as the API's school profile validation. */
function profileErrors(form: SchoolProfileUpdate): Errors {
  const errors: Errors = {}
  const name = form.name.trim()
  if (name.length < NAME_MIN || name.length > NAME_MAX) errors.name = `School name needs ${NAME_MIN} to ${NAME_MAX} characters.`
  if (!form.email.trim()) errors.email = "Email is required."
  else if (!EMAIL_PATTERN.test(form.email.trim())) errors.email = "Enter a valid email address."
  if (form.phone.length > PHONE_MAX || !PHONE_PATTERN.test(form.phone.trim()))
    errors.phone = "Phone may only contain digits, spaces, +, - and brackets."
  if (form.address.length > ADDRESS_MAX) errors.address = `Address must be ${ADDRESS_MAX} characters or fewer.`
  if (form.website.trim() && !WEBSITE_PATTERN.test(form.website.trim()))
    errors.website = "Website must start with http:// or https://"
  return errors
}

function toForm(school: SchoolProfile): SchoolProfileUpdate {
  return {
    name: school.name,
    phone: school.phone ?? "",
    email: school.email ?? "",
    address: school.address ?? "",
    website: school.website ?? "",
  }
}

/** Only the fields that changed, trimmed, so an untouched email never re-triggers the duplicate check. */
function changes(form: SchoolProfileUpdate, school: SchoolProfile) {
  const before = toForm(school)
  const patch: Partial<SchoolProfileUpdate> = {}
  for (const key of Object.keys(form) as (keyof SchoolProfileUpdate)[]) {
    const value = form[key].trim()
    if (value !== before[key]) patch[key] = value
  }
  return patch
}

function errorMessage(err: unknown) {
  if (err instanceof Error) return err.message
  return "Could not save the school profile."
}

export function SchoolProfileDialog({
  school,
  open,
  onOpenChange,
}: {
  school: SchoolProfile
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<SchoolProfileUpdate>(() => toForm(school))
  const [submitted, setSubmitted] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const errors = profileErrors(form)
  const patch = changes(form, school)
  const hasChanges = Object.keys(patch).length > 0

  const mutation = useMutation({
    mutationFn: () => schoolCatalogService.updateCurrentSchool(patch),
    onSuccess: (saved) => {
      queryClient.setQueryData(["schools", "current"], saved)
      void queryClient.invalidateQueries({ queryKey: ["schools", "current"] })
      toast.success("School profile saved")
      onOpenChange(false)
    },
    onError: (err) => setServerError(errorMessage(err)),
  })

  const set = (key: keyof SchoolProfileUpdate, value: string) => {
    setForm({ ...form, [key]: value })
    setServerError(null)
  }
  const shown = (key: keyof SchoolProfileUpdate) => {
    if (submitted) return errors[key]
    return undefined
  }
  function submit() {
    setSubmitted(true)
    if (Object.keys(errors).length || !hasChanges) return
    mutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]" data-testid="school-profile-dialog">
        <form
          className="flex flex-col gap-5"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
        >
          <DialogHeader>
            <DialogTitle>Edit school profile</DialogTitle>
            <DialogDescription>Shown on the letterhead of printed reports and receipts.</DialogDescription>
          </DialogHeader>
          {serverError && (
            <p className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive" role="alert">
              {serverError}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="School name" error={shown("name")}>
                <Input value={form.name} maxLength={NAME_MAX} aria-label="School name" onChange={(e) => set("name", e.target.value)} />
              </Field>
            </div>
            <Field label="Phone" error={shown("phone")}>
              <Input value={form.phone} maxLength={PHONE_MAX} inputMode="tel" aria-label="Phone" onChange={(e) => set("phone", e.target.value)} />
            </Field>
            <Field label="Email" error={shown("email")}>
              <Input value={form.email} type="email" aria-label="Email" onChange={(e) => set("email", e.target.value)} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Website" error={shown("website")} hint="Optional, e.g. https://school.edu.pk">
                <Input value={form.website} inputMode="url" aria-label="Website" onChange={(e) => set("website", e.target.value)} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Address" error={shown("address")}>
                <Textarea value={form.address} maxLength={ADDRESS_MAX} aria-label="Address" onChange={(e) => set("address", e.target.value)} />
              </Field>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending || !hasChanges}>
              {mutation.isPending && "Saving…"}
              {!mutation.isPending && "Save profile"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
