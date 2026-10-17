import { Check, Plus, X } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useGetApplication } from "@/features/management/admissions/hooks/use-admissions"
import { applicationNumericId } from "@/lib/applications-api"
import { toast } from "@/lib/toast"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Dialog,
  DialogContent,
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
import { Textarea } from "@/components/ui/textarea"
import { useSchool } from "@/data/store"
import type { AdmissionDocument, Application } from "@/data/types"
import {
  AdmissionFieldLabel,
  AdmissionStepper,
  FieldError,
  MandatoryNotice,
  ReadOnlyRefCard,
  WizardStepHeader,
} from "@/features/management/admissions/admission-ui"
import { AdmissionDocumentUpload } from "@/features/management/admissions/admission-document-upload"
import { mapAdmissionSaveError } from "@/features/management/admissions/admission-form-errors"
import {
  enrollmentDateBounds,
  interviewDateBounds,
  isIsoDateInRange,
  studentDobBounds,
} from "@/lib/admission-date-bounds"
import {
  formatInterviewScore,
  interviewMarksError,
  marksDigitsOnly,
  parseInterviewScore,
} from "@/lib/interview-score"
import { useActor } from "@/lib/actor"
import {
  cnicError,
  formatCnic,
  formatPhonePk,
  normalizePhonePk,
  phonePkError,
} from "@/lib/pakistan-validation"
import { cn } from "@/lib/utils"

function classSelectionValid(
  classId: string,
  classes: { id: string }[]
) {
  return Boolean(classId && classes.some((item) => item.id === classId))
}

const DOC_DEFAULTS: AdmissionDocument[] = [
  { id: "birth", label: "Birth Certificate / B-Form", status: "Pending" },
  { id: "slc", label: "Previous School Leaving Certificate", status: "Pending" },
  { id: "cnic", label: "Guardian ID Copy (CNIC)", status: "Pending" },
  { id: "photos", label: "Photographs (2 passport size)", status: "Pending" },
  { id: "medical", label: "Medical / Vaccination Record", status: "Pending" },
]

type GuardianRow = {
  id: string
  type: string
  name: string
  phone: string
  whatsapp: string
  cnic: string
  occupation: string
  address: string
  isPrimary: boolean
  isEmergency: boolean
}

function genRef() {
  const year = new Date().getFullYear()
  return `CLS-${year}-${String(Math.floor(1000 + Math.random() * 9000))}`
}

function emptyGuardian(): GuardianRow {
  return {
    id: `g-${Date.now()}`,
    type: "Father",
    name: "",
    phone: "",
    whatsapp: "",
    cnic: "",
    occupation: "",
    address: "",
    isPrimary: true,
    isEmergency: false,
  }
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCompleted?: (applicationId: string) => void
  /** When set, wizard loads and continues an existing draft from the API. */
  resumeApplicationId?: string | null
}

export function AdmissionWizard({
  open,
  onOpenChange,
  onCompleted,
  resumeApplicationId = null,
}: Props) {
  const {
    state,
    ensureAdmissionWizardData,
    persistApplicationDraft,
    patchApplicationRecord,
    finalizeApplication,
  } = useSchool()
  const actor = useActor()
  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [refNo] = useState(genRef)
  const [done, setDone] = useState(false)
  const [createdId, setCreatedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [student, setStudent] = useState({
    name: "",
    dob: "",
    gender: "Male" as "Female" | "Male",
    phone: "",
    email: "",
    address: "",
    previousSchool: "",
    previousClass: "",
    classId: "",
  })
  const [guardians, setGuardians] = useState<GuardianRow[]>([emptyGuardian()])
  const [documents, setDocuments] = useState(() =>
    DOC_DEFAULTS.map((item) => ({ ...item }))
  )
  const [interview, setInterview] = useState({
    waived: false,
    date: "",
    type: "Interview",
    evaluator: "",
    scoreObtained: "",
    scoreTotal: "",
    remarks: "",
    result: "",
  })
  const [decision, setDecision] = useState({
    choice: "" as Application["decision"],
    remarks: "",
  })
  const [enrollment, setEnrollment] = useState({
    classId: "",
    enrollDate: "",
  })

  const currentSession = useMemo(
    () => state.sessions.find((session) => session.current),
    [state.sessions]
  )

  const dobBounds = useMemo(() => studentDobBounds(), [])
  const interviewBounds = useMemo(() => interviewDateBounds(), [])
  const enrollBounds = useMemo(() => enrollmentDateBounds(), [])

  const resumeNumericId = useMemo(() => {
    if (!resumeApplicationId) return undefined
    return applicationNumericId(resumeApplicationId) ?? undefined
  }, [resumeApplicationId])

  const { data: resumeApplication } = useGetApplication(
    open ? resumeNumericId : undefined
  )
  const hydratedResumeIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!open) return
    void ensureAdmissionWizardData()
  }, [open, ensureAdmissionWizardData])

  useEffect(() => {
    if (!open) {
      hydratedResumeIdRef.current = null
      return
    }
    if (!resumeApplication) return
    if (hydratedResumeIdRef.current === resumeApplication.id) return
    hydratedResumeIdRef.current = resumeApplication.id
    setCreatedId(resumeApplication.id)
    setDone(false)
    setStudent({
      name: resumeApplication.name,
      dob: resumeApplication.dob,
      gender: resumeApplication.gender,
      phone: formatPhonePk(resumeApplication.phone || ""),
      email: resumeApplication.email ?? "",
      address: resumeApplication.address,
      previousSchool: resumeApplication.previousSchool,
      previousClass: resumeApplication.previousClass,
      classId: (resumeApplication.classId || state.classes[0]?.id) ?? "",
    })
    setGuardians([
      {
        id: `g-resume-${resumeApplication.id}`,
        type: resumeApplication.guardianRelation || "Father",
        name: resumeApplication.guardian || "",
        phone: formatPhonePk(resumeApplication.phone || ""),
        whatsapp: "",
        cnic: "",
        occupation: "",
        address: resumeApplication.guardianAddress || resumeApplication.address,
        isPrimary: true,
        isEmergency: false,
      },
    ])
    if (resumeApplication.documents?.length) {
      setDocuments(resumeApplication.documents.map((item) => ({ ...item })))
    }
    const bounds = interviewDateBounds()
    const safeInterviewDate =
      resumeApplication.interviewDate &&
      isIsoDateInRange(
        resumeApplication.interviewDate,
        bounds.fromDate,
        bounds.toDate
      )
        ? resumeApplication.interviewDate
        : ""
    const parsedScore = parseInterviewScore(resumeApplication.interviewScore)
    setInterview({
      waived: resumeApplication.interviewType === "Waived",
      date: safeInterviewDate,
      type: resumeApplication.interviewType || "Interview",
      evaluator: "",
      scoreObtained: parsedScore.obtained,
      scoreTotal: parsedScore.total,
      remarks: resumeApplication.notes,
      result: resumeApplication.interviewResult,
    })
    setDecision({
      choice: resumeApplication.decision ?? "",
      remarks: resumeApplication.notes,
    })
    setEnrollment({
      classId: (resumeApplication.classId || state.classes[0]?.id) ?? "",
      enrollDate: "",
    })
    setStep(0)
    toast.message("Draft loaded — continue where you left off.")
  }, [open, resumeApplication, state.classes])

  useEffect(() => {
    if (!createdId) return
    const app = state.applications.find((item) => item.id === createdId)
    if (!app?.documents?.length) return
    setDocuments(app.documents.map((item) => ({ ...item })))
  }, [createdId, state.applications])

  useEffect(() => {
    if (!open || interview.waived) return
    if (
      interview.date &&
      !isIsoDateInRange(
        interview.date,
        interviewBounds.fromDate,
        interviewBounds.toDate
      )
    ) {
      setInterview((current) => ({ ...current, date: "" }))
    }
  }, [open, interview.waived, interview.date, interviewBounds])

  useEffect(() => {
    if (
      step === 5 &&
      decision.choice === "Admit" &&
      !enrollment.classId &&
      classSelectionValid(student.classId, state.classes)
    ) {
      setEnrollment((current) => ({ ...current, classId: student.classId }))
    }
  }, [step, decision.choice, student.classId, enrollment.classId, state.classes])

  function reset() {
    setStep(0)
    setErrors({})
    setDone(false)
    setCreatedId(null)
    setStudent({
      name: "",
      dob: "",
      gender: "Male",
      phone: "",
      email: "",
      address: "",
      previousSchool: "",
      previousClass: "",
      classId: "",
    })
    setGuardians([emptyGuardian()])
    setDocuments(DOC_DEFAULTS.map((item) => ({ ...item })))
    setInterview({
      waived: false,
      date: "",
      type: "Interview",
      evaluator: "",
      scoreObtained: "",
      scoreTotal: "",
      remarks: "",
      result: "",
    })
    setDecision({ choice: "", remarks: "" })
    setEnrollment({
      classId: "",
      enrollDate: "",
    })
  }

  function close() {
    onOpenChange(false)
    reset()
  }

  function primaryGuardian() {
    return guardians.find((g) => g.isPrimary) ?? guardians[0]
  }

  function showSaveError(message: string) {
    const { fields, step: jump } = mapAdmissionSaveError(message)
    if (Object.keys(fields).length > 0) {
      setErrors((prev) => ({ ...prev, ...fields }))
      if (jump !== undefined) setStep(jump)
      return true
    }
    toast.error(message)
    return false
  }

  function validateStep(index: number) {
    const next: Record<string, string> = {}
    if (index === 0) {
      if (!student.name.trim()) next.name = "Full name is required."
      if (!student.dob) next.dob = "Date of birth is required."
      else if (
        !isIsoDateInRange(student.dob, dobBounds.fromDate, dobBounds.toDate)
      ) {
        next.dob = "Date of birth is outside the allowed range."
      }
      const phoneErr = phonePkError(student.phone, "Contact number")
      if (phoneErr) next.phone = phoneErr
      if (!student.address.trim()) next.address = "Home address is required."
      if (!classSelectionValid(student.classId, state.classes)) {
        next.classId =
          state.classes.length === 0
            ? "No classes are available. Add a class in school setup first."
            : "Select the class this student is applying for."
      }
    }
    if (index === 1) {
      const primary = primaryGuardian()
      if (!primary?.name.trim()) next.guardian = "Guardian name is required."
      const gPhone = phonePkError(primary?.phone ?? "", "Guardian phone")
      if (gPhone) next.guardianPhone = gPhone
      if (primary?.cnic.trim()) {
        const cErr = cnicError(primary.cnic)
        if (cErr) next.guardianCnic = cErr
      }
      for (const g of guardians) {
        if (!g.whatsapp.trim()) continue
        const waErr = phonePkError(g.whatsapp, "WhatsApp")
        if (waErr) {
          next.guardianWhatsapp = waErr
          break
        }
      }
    }
    if (index === 3 && !interview.waived) {
      if (interview.date) {
        if (
          !isIsoDateInRange(
            interview.date,
            interviewBounds.fromDate,
            interviewBounds.toDate
          )
        ) {
          next.interviewDate = `Choose a date from ${interviewBounds.fromDate} onward (no past dates).`
        }
      }
      const marksErr = interviewMarksError(
        interview.scoreObtained,
        interview.scoreTotal
      )
      if (marksErr) next.interviewScore = marksErr
    }
    if (index === 4) {
      if (!decision.choice) {
        next.decision = "Choose Admit, Reject, or Waitlist."
      } else if (decision.choice === "Admit" && !student.email.trim()) {
        next.email = "Guardian email is required to enroll after admission."
      }
    }
    if (index === 5) {
      if (decision.choice === "Admit") {
        if (!classSelectionValid(enrollment.classId, state.classes)) {
          next.classId = "Select the class for enrollment."
        }
        if (!enrollment.enrollDate)
          next.enrollDate = "Enrollment date is required."
      } else if (!decision.choice) {
        next.decision = "Choose a decision on the previous step."
      }
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function buildPayload(classIdOverride?: string, upToStep = step) {
    const primary = primaryGuardian()
    const payload: Record<string, unknown> = {
      name: student.name,
      dob: student.dob,
      gender: student.gender,
      address: student.address,
      previousSchool: student.previousSchool,
      previousClass: student.previousClass,
      classId: classIdOverride || enrollment.classId || student.classId,
      phone: normalizePhonePk(student.phone || primary?.phone || ""),
      email: student.email.trim(),
    }

    if (upToStep >= 1) {
      payload.guardian = primary?.name ?? ""
      payload.guardianRelation = primary?.type
      payload.guardianAddress = primary?.address || student.address
      payload.phone = normalizePhonePk(primary?.phone || student.phone || "")
    }

    if (upToStep >= 2) {
      payload.documents = documents
    }

    if (upToStep >= 3) {
      payload.interviewType = interview.waived ? "Waived" : interview.type
      if (!interview.waived && interview.date) {
        if (
          isIsoDateInRange(
            interview.date,
            interviewBounds.fromDate,
            interviewBounds.toDate
          )
        ) {
          payload.interviewDate = interview.date
        }
      } else if (interview.waived) {
        payload.interviewDate = null
      }
      const scoreStr = formatInterviewScore(
        interview.scoreObtained,
        interview.scoreTotal
      )
      if (scoreStr) payload.interviewScore = scoreStr
      if (interview.result) payload.interviewResult = interview.result
    }

    if (upToStep >= 4) {
      const notes = [decision.remarks, interview.remarks]
        .filter(Boolean)
        .join("\n")
      if (notes) payload.notes = notes
    }

    return payload
  }

  async function persistStepProgress() {
    const payload = buildPayload(student.classId, step)
    if (!createdId) {
      const result = await persistApplicationDraft(payload, actor.name)
      if ("error" in result) return result
      setCreatedId(result.id)
      return {}
    }
    const patch = await patchApplicationRecord(createdId, payload, actor.name)
    if (patch) return { error: patch }
    return {}
  }

  async function continueStep() {
    if (!validateStep(step)) return
    setSaving(true)
    const save = await persistStepProgress()
    setSaving(false)
    if ("error" in save && typeof save.error === "string") {
      showSaveError(save.error)
      return
    }
    setStep((value) => value + 1)
  }

  async function submit() {
    if (!validateStep(step)) return
    if (!decision.choice) {
      toast.error("Choose Admit, Reject, or Waitlist.")
      return
    }
    if (decision.choice === "Admit" && !student.email.trim()) {
      toast.error("Guardian email is required to enroll after admission.")
      return
    }
    setSaving(true)
    let appId = createdId
    if (!appId) {
      const draft = await persistApplicationDraft(
        buildPayload(enrollment.classId || student.classId, 99),
        actor.name
      )
      if ("error" in draft) {
        setSaving(false)
        setSaving(false)
        showSaveError(draft.error)
        return
      }
      appId = draft.id
      setCreatedId(appId)
    } else {
      const patch = await patchApplicationRecord(
        appId,
        buildPayload(enrollment.classId || student.classId, 99),
        actor.name
      )
      if (patch) {
        setSaving(false)
        showSaveError(patch)
        return
      }
    }
    const finalize = await finalizeApplication(
      appId,
      {
        decision: decision.choice,
        remarks: decision.remarks,
        payload: buildPayload(enrollment.classId || student.classId, 99),
      },
      actor.name
    )
    setSaving(false)
    if (finalize) {
      showSaveError(finalize)
      return
    }
    toast.success(
      decision.choice === "Admit"
        ? "Application submitted and student enrolled."
        : "Application submitted."
    )
    setCreatedId(appId)
    setDone(true)
  }

  async function ensureApplicationId(): Promise<string | null> {
    if (createdId) return createdId
    setSaving(true)
    const result = await persistApplicationDraft(
      buildPayload(student.classId, step),
      actor.name
    )
    setSaving(false)
    if ("error" in result) {
      showSaveError(result.error)
      return null
    }
    setCreatedId(result.id)
    return result.id
  }

  async function handleDocumentUpdated(doc: AdmissionDocument) {
    const nextDocs = documents.map((item) => (item.id === doc.id ? doc : item))
    setDocuments(nextDocs)
    const appId = createdId ?? (await ensureApplicationId())
    if (!appId) return
    const patch = await patchApplicationRecord(
      appId,
      { ...buildPayload(student.classId, Math.max(step, 2)), documents: nextDocs },
      actor.name
    )
    if (patch) showSaveError(patch)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (value) onOpenChange(true)
      }}
    >
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-black/30"
        className="flex max-h-[min(92vh,820px)] w-[min(100vw-2rem,48rem)] max-w-none flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-[48rem]"
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogTitle className="sr-only">New Admission Application</DialogTitle>
        <div className="flex shrink-0 items-start justify-between border-b border-[var(--cls-border)] bg-white px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--cls-ink)]">
              {resumeApplicationId ? "Edit admission application" : "New admission application"}
            </h2>
            <p className="mt-1 text-sm text-[var(--cls-muted)]">
              Reference{" "}
              <span className="font-mono font-medium text-[var(--cls-brand)]">
                {refNo}
              </span>
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-[var(--cls-muted)]"
            onClick={close}
            aria-label="Close"
          >
            <X />
          </Button>
        </div>

        {!done ? (
          <div className="shrink-0 overflow-x-auto overflow-y-hidden border-b border-[var(--cls-border)] bg-[var(--page-wash)]/40 px-6 py-4">
            <AdmissionStepper step={step} />
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white px-4 py-4 sm:px-6 sm:py-5">
          {done ? (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-[#e8f7ee]">
                <Check className="size-7 text-[var(--cls-brand)]" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--cls-ink)]">
                Student Profile Created
              </h3>
              <p className="mt-1 text-sm text-[var(--cls-muted)]">
                {student.name} has been processed for{" "}
                {state.classes.find((c) => c.id === enrollment.classId)?.label ??
                  "the selected class"}
              </p>
              <p className="mt-1 text-xs text-[var(--cls-muted)]">
                Application:{" "}
                <span className="font-mono font-medium text-[var(--cls-brand)]">
                  {createdId ?? refNo}
                </span>
              </p>
              <div className="mt-6 flex gap-2">
                <Button type="button" variant="outline" onClick={close}>
                  Close
                </Button>
                <Button
                  type="button"
                  className="bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"
                  onClick={() => {
                    if (createdId) onCompleted?.(createdId)
                    close()
                  }}
                >
                  View application →
                </Button>
              </div>
            </div>
          ) : step === 0 ? (
            <div className="flex flex-col gap-4">
              <WizardStepHeader
                step={step}
                title="Student information"
                description="Enter the applicant’s personal details and the class they are applying for."
              />
              <MandatoryNotice />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label className="mb-1.5 block">
                    <AdmissionFieldLabel required>Full Name</AdmissionFieldLabel>
                  </Label>
                  <Input
                    value={student.name}
                    onChange={(e) =>
                      setStudent({ ...student, name: e.target.value })
                    }
                    placeholder="e.g. Zainab Mirza"
                    aria-invalid={Boolean(errors.name)}
                  />
                  <FieldError message={errors.name} />
                </div>
                <div>
                  <Label className="mb-1.5 block">
                    <AdmissionFieldLabel required>
                      Date of Birth
                    </AdmissionFieldLabel>
                  </Label>
                  <DatePicker
                    value={student.dob}
                    onChange={(dob) => setStudent({ ...student, dob })}
                    aria-invalid={Boolean(errors.dob)}
                    fromDate={dobBounds.fromDate}
                    maxDate={dobBounds.toDate}
                  />
                  <FieldError message={errors.dob} />
                </div>
                <div>
                  <Label className="mb-1.5 block">
                    <AdmissionFieldLabel required>Gender</AdmissionFieldLabel>
                  </Label>
                  <Select
                    value={student.gender}
                    onValueChange={(gender: "Female" | "Male") =>
                      setStudent({ ...student, gender })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5 block">
                    <AdmissionFieldLabel required>
                      Contact Number
                    </AdmissionFieldLabel>
                  </Label>
                  <Input
                    value={student.phone}
                    onChange={(e) => {
                      const phone = formatPhonePk(e.target.value)
                      setStudent({ ...student, phone })
                      setErrors((prev) => {
                        if (!prev.phone) return prev
                        const err = phonePkError(phone, "Contact number")
                        if (!err) {
                          const next = { ...prev }
                          delete next.phone
                          return next
                        }
                        return { ...prev, phone: err }
                      })
                    }}
                    placeholder="0300-1234567"
                    inputMode="tel"
                    aria-invalid={Boolean(errors.phone)}
                  />
                  <FieldError message={errors.phone} />
                </div>
                <div>
                  <Label className="mb-1.5 block">
                    <AdmissionFieldLabel>Email (optional)</AdmissionFieldLabel>
                  </Label>
                  <Input
                    type="email"
                    value={student.email}
                    onChange={(e) =>
                      setStudent({ ...student, email: e.target.value })
                    }
                    placeholder="parent@example.com"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="mb-1.5 block">
                    <AdmissionFieldLabel required>Home Address</AdmissionFieldLabel>
                  </Label>
                  <Input
                    value={student.address}
                    onChange={(e) =>
                      setStudent({ ...student, address: e.target.value })
                    }
                    placeholder="House No, Street, City"
                    aria-invalid={Boolean(errors.address)}
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block">
                    <AdmissionFieldLabel>Previous School</AdmissionFieldLabel>
                  </Label>
                  <Input
                    value={student.previousSchool}
                    onChange={(e) =>
                      setStudent({
                        ...student,
                        previousSchool: e.target.value,
                      })
                    }
                    placeholder="Name of last school attended"
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block">
                    <AdmissionFieldLabel>
                      Last Class Completed
                    </AdmissionFieldLabel>
                  </Label>
                  <Input
                    value={student.previousClass}
                    onChange={(e) =>
                      setStudent({
                        ...student,
                        previousClass: e.target.value,
                      })
                    }
                    placeholder="e.g. Class 4"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="mb-1.5 block">
                    <AdmissionFieldLabel required>
                      Applying for
                    </AdmissionFieldLabel>
                  </Label>
                  <Select
                    value={student.classId || undefined}
                    onValueChange={(classId) => {
                      setStudent({ ...student, classId })
                      setErrors((prev) => {
                        if (!prev.classId) return prev
                        const next = { ...prev }
                        delete next.classId
                        return next
                      })
                    }}
                  >
                    <SelectTrigger aria-invalid={Boolean(errors.classId)}>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {state.classes.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldError message={errors.classId} />
                </div>
              </div>
              <ReadOnlyRefCard refNo={refNo} />
            </div>
          ) : step === 1 ? (
            <div className="flex flex-col gap-4">
              <WizardStepHeader
                step={step}
                title="Guardian information"
                description="Add at least one guardian. Mark who is the primary contact for school communication."
              />
              {guardians.map((guardian, index) => (
                <div
                  key={guardian.id}
                  className="rounded-[10px] border border-[var(--cls-border)] p-4"
                >
                  <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                    <div className="min-w-[160px] flex-1">
                      <Label className="mb-1.5 block">
                        <AdmissionFieldLabel required>
                          Relationship
                        </AdmissionFieldLabel>
                      </Label>
                      <Select
                        value={guardian.type}
                        onValueChange={(type) =>
                          setGuardians((rows) =>
                            rows.map((row, i) =>
                              i === index ? { ...row, type } : row
                            )
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {["Father", "Mother", "Guardian", "Other"].map(
                              (item) => (
                                <SelectItem key={item} value={item}>
                                  {item}
                                </SelectItem>
                              )
                            )}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-wrap gap-3 pb-1">
                      <label className="flex items-center gap-1.5 text-xs">
                        <input
                          type="radio"
                          name="primary-guardian"
                          checked={guardian.isPrimary}
                          onChange={() =>
                            setGuardians((rows) =>
                              rows.map((row, i) => ({
                                ...row,
                                isPrimary: i === index,
                              }))
                            )
                          }
                        />
                        Primary Contact
                      </label>
                      <label className="flex items-center gap-1.5 text-xs">
                        <Checkbox
                          checked={guardian.isEmergency}
                          onCheckedChange={(checked) =>
                            setGuardians((rows) =>
                              rows.map((row, i) =>
                                i === index
                                  ? { ...row, isEmergency: Boolean(checked) }
                                  : row
                              )
                            )
                          }
                        />
                        Emergency
                      </label>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Input
                        placeholder="Guardian full name"
                        value={guardian.name}
                        onChange={(e) =>
                          setGuardians((rows) =>
                            rows.map((row, i) =>
                              i === index
                                ? { ...row, name: e.target.value }
                                : row
                            )
                          )
                        }
                      />
                    </div>
                    <Input
                      placeholder="Phone"
                      value={guardian.phone}
                      inputMode="tel"
                      onChange={(e) => {
                        const phone = formatPhonePk(e.target.value)
                        setGuardians((rows) =>
                          rows.map((row, i) =>
                            i === index ? { ...row, phone } : row
                          )
                        )
                        setErrors((prev) => {
                          if (!prev.guardianPhone) return prev
                          const err = phonePkError(phone, "Guardian phone")
                          if (!err) {
                            const next = { ...prev }
                            delete next.guardianPhone
                            return next
                          }
                          return { ...prev, guardianPhone: err }
                        })
                      }}
                    />
                    <Input
                      placeholder="WhatsApp"
                      value={guardian.whatsapp}
                      inputMode="tel"
                      onChange={(e) => {
                        const whatsapp = formatPhonePk(e.target.value)
                        setGuardians((rows) =>
                          rows.map((row, i) =>
                            i === index ? { ...row, whatsapp } : row
                          )
                        )
                        setErrors((prev) => {
                          if (!prev.guardianWhatsapp) return prev
                          if (!whatsapp.trim()) {
                            const next = { ...prev }
                            delete next.guardianWhatsapp
                            return next
                          }
                          const err = phonePkError(whatsapp, "WhatsApp")
                          if (!err) {
                            const next = { ...prev }
                            delete next.guardianWhatsapp
                            return next
                          }
                          return { ...prev, guardianWhatsapp: err }
                        })
                      }}
                    />
                    <Input
                      placeholder="CNIC (XXXXX-XXXXXXX-X)"
                      value={guardian.cnic}
                      inputMode="numeric"
                      onChange={(e) =>
                        setGuardians((rows) =>
                          rows.map((row, i) =>
                            i === index
                              ? { ...row, cnic: formatCnic(e.target.value) }
                              : row
                          )
                        )
                      }
                    />
                    <Input
                      placeholder="Occupation"
                      value={guardian.occupation}
                      onChange={(e) =>
                        setGuardians((rows) =>
                          rows.map((row, i) =>
                            i === index
                              ? { ...row, occupation: e.target.value }
                              : row
                          )
                        )
                      }
                    />
                    <div className="sm:col-span-2">
                      <Input
                        placeholder="Address (if different)"
                        value={guardian.address}
                        onChange={(e) =>
                          setGuardians((rows) =>
                            rows.map((row, i) =>
                              i === index
                                ? { ...row, address: e.target.value }
                                : row
                            )
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
              {errors.guardian ? (
                <p className="text-xs text-destructive">{errors.guardian}</p>
              ) : null}
              {errors.guardianPhone ? (
                <p className="text-xs text-destructive">{errors.guardianPhone}</p>
              ) : null}
              {errors.guardianWhatsapp ? (
                <p className="text-xs text-destructive">{errors.guardianWhatsapp}</p>
              ) : null}
              {errors.guardianCnic ? (
                <p className="text-xs text-destructive">{errors.guardianCnic}</p>
              ) : null}
              <button
                type="button"
                className="inline-flex items-center gap-2 text-sm font-medium text-[var(--cls-brand)]"
                onClick={() =>
                  setGuardians((rows) => [
                    ...rows,
                    { ...emptyGuardian(), isPrimary: false },
                  ])
                }
              >
                <Plus className="size-4" />
                Add another guardian
              </button>
            </div>
          ) : step === 2 ? (
            <div className="flex flex-col gap-4">
              <WizardStepHeader
                step={step}
                title="Required documents"
                description="Upload PDF or image files (max 10 MB). Documents are stored securely for this application."
              />
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex flex-col gap-3 rounded-lg border border-[var(--cls-border)] p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--cls-ink)]">
                      {doc.label}
                    </p>
                    <p className="text-[10.5px] text-[var(--cls-muted)]">
                      {doc.status}
                    </p>
                  </div>
                  <AdmissionDocumentUpload
                    applicationId={createdId}
                    document={doc}
                    onEnsureApplication={ensureApplicationId}
                    onUpdated={(updated) => void handleDocumentUpdated(updated)}
                  />
                </div>
              ))}
            </div>
          ) : step === 3 ? (
            <div className="flex flex-col gap-4">
              <WizardStepHeader
                step={step}
                title="Interview or entrance test"
                description="Record assessment details or mark the step as waived if not required."
              />
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={interview.waived}
                  onCheckedChange={(checked) =>
                    setInterview({ ...interview, waived: Boolean(checked) })
                  }
                />
                Not required / Waived
              </label>
              {interview.waived ? (
                <div className="rounded-lg border border-[#a8d5bc] bg-[#e8f7ee] p-3 text-sm text-[var(--cls-brand)]">
                  Interview / Test has been waived. Proceed to Decision.
                </div>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="mb-1.5 block">Interview / Test Date</Label>
                      <DatePicker
                        value={interview.date}
                        onChange={(date) =>
                          setInterview({ ...interview, date })
                        }
                        placeholder="Interview date"
                        defaultMonthKind="today"
                        fromDate={interviewBounds.fromDate}
                        maxDate={interviewBounds.toDate}
                        popoverClassName="z-[100]"
                      />
                      <FieldError message={errors.interviewDate} />
                      <p className="mt-1 text-[11px] text-[var(--cls-muted)]">
                        From today through the next 18 months (past dates not allowed).
                      </p>
                    </div>
                    <div>
                      <Label className="mb-1.5 block">Type</Label>
                      <Select
                        value={interview.type}
                        onValueChange={(type) =>
                          setInterview({ ...interview, type })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="Interview">Interview</SelectItem>
                            <SelectItem value="Written">Written Test</SelectItem>
                            <SelectItem value="Both">Both</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="mb-1.5 block">Evaluator</Label>
                      <Input
                        value={interview.evaluator}
                        onChange={(e) =>
                          setInterview({
                            ...interview,
                            evaluator: e.target.value,
                          })
                        }
                        placeholder="Staff member name"
                      />
                    </div>
                    <div>
                      <Label className="mb-1.5 block">Marks obtained</Label>
                      <Input
                        inputMode="numeric"
                        value={interview.scoreObtained}
                        onChange={(e) => {
                          const scoreObtained = marksDigitsOnly(e.target.value)
                          setInterview({ ...interview, scoreObtained })
                          setErrors((prev) => {
                            if (!prev.interviewScore) return prev
                            const err = interviewMarksError(
                              scoreObtained,
                              interview.scoreTotal
                            )
                            if (!err) {
                              const next = { ...prev }
                              delete next.interviewScore
                              return next
                            }
                            return { ...prev, interviewScore: err }
                          })
                        }}
                        placeholder="e.g. 38"
                        aria-invalid={Boolean(errors.interviewScore)}
                      />
                    </div>
                    <div>
                      <Label className="mb-1.5 block">Total marks</Label>
                      <Input
                        inputMode="numeric"
                        value={interview.scoreTotal}
                        onChange={(e) => {
                          const scoreTotal = marksDigitsOnly(e.target.value)
                          setInterview({ ...interview, scoreTotal })
                          setErrors((prev) => {
                            if (!prev.interviewScore) return prev
                            const err = interviewMarksError(
                              interview.scoreObtained,
                              scoreTotal
                            )
                            if (!err) {
                              const next = { ...prev }
                              delete next.interviewScore
                              return next
                            }
                            return { ...prev, interviewScore: err }
                          })
                        }}
                        placeholder="e.g. 50"
                        aria-invalid={Boolean(errors.interviewScore)}
                      />
                      <p className="mt-1 text-[11px] text-[var(--cls-muted)]">
                        Optional if the test or interview is not completed yet.
                      </p>
                      <FieldError message={errors.interviewScore} />
                    </div>
                    <div>
                      <Label className="mb-1.5 block">Result</Label>
                      <Select
                        value={interview.result || "none"}
                        onValueChange={(value) =>
                          setInterview({
                            ...interview,
                            result: value === "none" ? "" : value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select result" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="none">Not recorded</SelectItem>
                            <SelectItem value="Pass">Pass / Recommended</SelectItem>
                            <SelectItem value="Fail">
                              Fail / Not Recommended
                            </SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Textarea
                    value={interview.remarks}
                    onChange={(e) =>
                      setInterview({ ...interview, remarks: e.target.value })
                    }
                    placeholder="Evaluator remarks"
                    rows={3}
                  />
                </>
              )}
            </div>
          ) : step === 4 ? (
            <div className="flex flex-col gap-4">
              <WizardStepHeader
                step={step}
                title="Admission decision"
                description="Choose whether to admit, waitlist, or reject this applicant."
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {(["Admit", "Waitlist", "Reject"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setDecision({ ...decision, choice: option })}
                    className={cn(
                      "rounded-[10px] border-2 p-4 text-center text-sm font-semibold transition-colors",
                      decision.choice === option
                        ? option === "Admit"
                          ? "border-[var(--cls-brand)] bg-[#e8f7ee] text-[var(--cls-brand)]"
                          : option === "Reject"
                            ? "border-[#d64545] bg-[#fff0f0] text-[#d64545]"
                            : "border-[#e8a317] bg-[#fef9ec] text-[#e8a317]"
                        : "border-[var(--cls-border)] hover:bg-[var(--page-wash)]"
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
              {errors.decision ? (
                <p className="text-xs text-destructive">{errors.decision}</p>
              ) : null}
              <Textarea
                value={decision.remarks}
                onChange={(e) =>
                  setDecision({ ...decision, remarks: e.target.value })
                }
                placeholder="Decision remarks"
                rows={3}
              />
            </div>
          ) : decision.choice === "Admit" ? (
            <div className="flex flex-col gap-4">
              <WizardStepHeader
                step={step}
                title="Enrollment"
                description="Assign the student to a class and record the enrollment date."
              />
              <Select
                value={enrollment.classId || undefined}
                onValueChange={(classId) => {
                  setEnrollment({ ...enrollment, classId })
                  setErrors((prev) => {
                    if (!prev.classId) return prev
                    const next = { ...prev }
                    delete next.classId
                    return next
                  })
                }}
              >
                <SelectTrigger aria-invalid={Boolean(errors.classId)}>
                  <SelectValue placeholder="Assign to class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {state.classes.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldError message={errors.classId} />
              <div>
                <Label className="mb-1.5 block">Academic Session</Label>
                <Input
                  readOnly
                  value={currentSession?.name ?? "2026–2027"}
                />
              </div>
              <div>
                <Label className="mb-1.5 block">Enrollment Date</Label>
                <DatePicker
                  value={enrollment.enrollDate}
                  onChange={(enrollDate) =>
                    setEnrollment({ ...enrollment, enrollDate })
                  }
                  aria-invalid={Boolean(errors.enrollDate)}
                  placeholder="Enrollment date"
                  defaultMonthKind="today"
                  fromDate={enrollBounds.fromDate}
                  maxDate={enrollBounds.toDate}
                  popoverClassName="z-[100]"
                />
              </div>
              <div className="rounded-lg border border-[#a8d5bc] bg-[#e8f7ee] p-3 text-xs text-[var(--cls-brand)]">
                Completing enrollment creates the student profile and preserves
                admission history.
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 text-sm text-[var(--cls-muted)]">
              <WizardStepHeader
                step={step}
                title="Review & submit"
                description="Confirm the decision before saving this application."
              />
              <p>
                Decision:{" "}
                <span className="font-semibold text-[var(--cls-ink)]">
                  {decision.choice}
                </span>
              </p>
              <p>
                Submit to save this application. No class assignment is required
                for waitlist or reject decisions.
              </p>
            </div>
          )}
        </div>

        {!done ? (
          <div className="flex shrink-0 items-center justify-between border-t border-[var(--cls-border)] bg-[var(--page-wash)]/60 px-6 py-4">
            <div>
              {step > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setErrors({})
                    setStep((value) => value - 1)
                  }}
                >
                  ← Back
                </Button>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={close} disabled={saving}>
                Cancel
              </Button>
              {step < 5 ? (
                <Button
                  type="button"
                  className="bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"
                  disabled={saving}
                  onClick={() => void continueStep()}
                >
                  {saving ? "Saving…" : "Continue →"}
                </Button>
              ) : (
                <Button
                  type="button"
                  className="bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"
                  disabled={saving}
                  onClick={() => void submit()}
                >
                  {saving
                    ? "Submitting…"
                    : decision.choice === "Admit"
                      ? "Complete Enrollment"
                      : "Submit Application"}
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
