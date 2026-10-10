import { Check, Plus, X } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { useActor } from "@/lib/actor"
import { cn } from "@/lib/utils"

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
}

export function AdmissionWizard({ open, onOpenChange, onCompleted }: Props) {
  const { state, addApplication, setApplicationStatus } = useSchool()
  const actor = useActor()
  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [refNo] = useState(genRef)
  const [done, setDone] = useState(false)
  const [createdId, setCreatedId] = useState<string | null>(null)

  const [student, setStudent] = useState({
    name: "",
    dob: "",
    gender: "Male" as "Female" | "Male",
    phone: "",
    email: "",
    address: "",
    previousSchool: "",
    previousClass: "",
    classId: state.classes[0]?.id ?? "",
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
    score: "",
    remarks: "",
    result: "",
  })
  const [decision, setDecision] = useState({
    choice: "" as Application["decision"],
    remarks: "",
  })
  const [enrollment, setEnrollment] = useState({
    classId: state.classes[0]?.id ?? "",
    enrollDate: "",
  })

  const currentSession = useMemo(
    () => state.sessions.find((session) => session.current),
    [state.sessions]
  )

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
      classId: state.classes[0]?.id ?? "",
    })
    setGuardians([emptyGuardian()])
    setDocuments(DOC_DEFAULTS.map((item) => ({ ...item })))
    setInterview({
      waived: false,
      date: "",
      type: "Interview",
      evaluator: "",
      score: "",
      remarks: "",
      result: "",
    })
    setDecision({ choice: "", remarks: "" })
    setEnrollment({
      classId: state.classes[0]?.id ?? "",
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

  function validateStep(index: number) {
    const next: Record<string, string> = {}
    if (index === 0) {
      if (!student.name.trim()) next.name = "Full name is required."
      if (!student.dob) next.dob = "Date of birth is required."
      if (!student.phone.trim()) next.phone = "Contact number is required."
      if (!student.address.trim()) next.address = "Home address is required."
      if (!student.classId) next.classId = "Choose a class."
    }
    if (index === 1) {
      const primary = primaryGuardian()
      if (!primary?.name.trim()) next.guardian = "Guardian name is required."
      if (!primary?.phone.trim()) next.guardianPhone = "Guardian phone is required."
    }
    if (index === 4 && !decision.choice) {
      next.decision = "Choose Admit, Reject, or Waitlist."
    }
    if (index === 5) {
      if (decision.choice === "Admit") {
        if (!enrollment.classId) next.classId = "Choose the enrollment class."
        if (!enrollment.enrollDate)
          next.enrollDate = "Enrollment date is required."
      } else if (!decision.choice) {
        next.decision = "Choose a decision on the previous step."
      }
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function submit() {
    if (!validateStep(step)) return
    const primary = primaryGuardian()
    const notes = [decision.remarks, interview.remarks, student.email]
      .filter(Boolean)
      .join("\n")
    const result = addApplication(
      {
        name: student.name,
        dob: student.dob,
        gender: student.gender,
        address: student.address,
        previousSchool: student.previousSchool,
        previousClass: student.previousClass,
        classId: enrollment.classId || student.classId,
        guardian: primary.name,
        guardianRelation: primary.type,
        phone: student.phone || primary.phone,
        guardianAddress: primary.address || student.address,
        documents,
        interviewType: interview.waived ? "Waived" : interview.type,
        interviewDate: interview.waived ? "" : interview.date,
        interviewScore: interview.score,
        interviewResult: interview.result,
        decision: decision.choice,
        notes,
      },
      actor.name
    )
    if ("error" in result) {
      toast.error(result.error)
      return
    }
    const status =
      decision.choice === "Admit"
        ? "Enrolled"
        : decision.choice === "Waitlist"
          ? "Waitlist"
          : decision.choice === "Reject"
            ? "Rejected"
            : "Review"
    const statusError = setApplicationStatus(result.id, status, actor.name)
    if (statusError) toast.error(statusError)
    else toast.success("Application saved.")
    setCreatedId(result.id)
    setDone(true)
  }

  function setDocStatus(id: string, status: AdmissionDocument["status"]) {
    setDocuments((current) =>
      current.map((item) => (item.id === id ? { ...item, status } : item))
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) close()
        else onOpenChange(true)
      }}
    >
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-black/30"
        className="flex max-h-[min(92vh,820px)] w-[min(100vw-2rem,48rem)] max-w-none flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-[48rem]"
      >
        <DialogTitle className="sr-only">New Admission Application</DialogTitle>
        <div className="flex items-start justify-between border-b border-[var(--cls-border)] bg-white px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--cls-ink)]">
              New admission application
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
          <div className="overflow-x-auto border-b border-[var(--cls-border)] bg-[var(--page-wash)]/40 px-6 py-4">
            <AdmissionStepper step={step} />
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto bg-white px-6 py-5">
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
                Reference:{" "}
                <span className="font-mono font-medium text-[var(--cls-brand)]">
                  {refNo}
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
                  <Input
                    type="date"
                    value={student.dob}
                    onChange={(e) =>
                      setStudent({ ...student, dob: e.target.value })
                    }
                    aria-invalid={Boolean(errors.dob)}
                  />
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
                    onChange={(e) =>
                      setStudent({ ...student, phone: e.target.value })
                    }
                    placeholder="0300-1234567"
                    aria-invalid={Boolean(errors.phone)}
                  />
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
                    value={student.classId}
                    onValueChange={(classId) =>
                      setStudent({ ...student, classId })
                    }
                  >
                    <SelectTrigger>
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
                      onChange={(e) =>
                        setGuardians((rows) =>
                          rows.map((row, i) =>
                            i === index ? { ...row, phone: e.target.value } : row
                          )
                        )
                      }
                    />
                    <Input
                      placeholder="WhatsApp"
                      value={guardian.whatsapp}
                      onChange={(e) =>
                        setGuardians((rows) =>
                          rows.map((row, i) =>
                            i === index
                              ? { ...row, whatsapp: e.target.value }
                              : row
                          )
                        )
                      }
                    />
                    <Input
                      placeholder="CNIC"
                      value={guardian.cnic}
                      onChange={(e) =>
                        setGuardians((rows) =>
                          rows.map((row, i) =>
                            i === index ? { ...row, cnic: e.target.value } : row
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
                description="Track each document through upload and verification. File storage connects when the API is ready."
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
                  <div className="flex flex-wrap gap-2">
                    {doc.status === "Pending" ? (
                      <Button
                        type="button"
                        size="sm"
                        className="bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"
                        onClick={() => setDocStatus(doc.id, "Uploaded")}
                      >
                        Upload
                      </Button>
                    ) : null}
                    {doc.status === "Uploaded" ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setDocStatus(doc.id, "Verified")}
                        >
                          Verify
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setDocStatus(doc.id, "Rejected")}
                        >
                          Reject
                        </Button>
                      </>
                    ) : null}
                    {doc.status !== "Pending" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setDocStatus(doc.id, "Pending")}
                      >
                        Replace
                      </Button>
                    ) : null}
                  </div>
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
                      <Input
                        type="date"
                        value={interview.date}
                        onChange={(e) =>
                          setInterview({ ...interview, date: e.target.value })
                        }
                      />
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
                      <Label className="mb-1.5 block">Score</Label>
                      <Input
                        value={interview.score}
                        onChange={(e) =>
                          setInterview({ ...interview, score: e.target.value })
                        }
                        placeholder="38/50"
                      />
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
                value={enrollment.classId}
                onValueChange={(classId) =>
                  setEnrollment({ ...enrollment, classId })
                }
              >
                <SelectTrigger>
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
              <div>
                <Label className="mb-1.5 block">Academic Session</Label>
                <Input
                  readOnly
                  value={currentSession?.label ?? "2026–2027"}
                />
              </div>
              <div>
                <Label className="mb-1.5 block">Enrollment Date</Label>
                <Input
                  type="date"
                  value={enrollment.enrollDate}
                  onChange={(e) =>
                    setEnrollment({
                      ...enrollment,
                      enrollDate: e.target.value,
                    })
                  }
                  aria-invalid={Boolean(errors.enrollDate)}
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
          <div className="flex items-center justify-between border-t border-[var(--cls-border)] bg-[var(--page-wash)]/60 px-6 py-4">
            <div>
              {step > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep((value) => value - 1)}
                >
                  ← Back
                </Button>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={close}>
                Cancel
              </Button>
              {step < 5 ? (
                <Button
                  type="button"
                  className="bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"
                  onClick={() => {
                    if (!validateStep(step)) return
                    setStep((value) => value + 1)
                  }}
                >
                  Continue →
                </Button>
              ) : (
                <Button
                  type="button"
                  className="bg-[var(--cls-brand)] hover:bg-[var(--cls-brand-hover)]"
                  onClick={submit}
                >
                  {decision.choice === "Admit"
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
