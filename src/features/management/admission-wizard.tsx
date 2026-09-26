import { useMemo, useState } from "react"
import { toast } from "sonner"

import { Field } from "@/components/app/kit"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useSchool } from "@/data/store"
import type { AdmissionDocument, Application } from "@/data/types"
import { cn } from "@/lib/utils"

const STEPS = [
  { id: "student", title: "Student details" },
  { id: "guardian", title: "Guardian" },
  { id: "documents", title: "Documents" },
  { id: "interview", title: "Interview / test" },
  { id: "decision", title: "Decision" },
  { id: "enrollment", title: "Enrollment" },
] as const

const DOC_DEFAULTS: AdmissionDocument[] = [
  { id: "birth", label: "Birth certificate", status: "Pending" },
  { id: "slc", label: "School leaving certificate", status: "Pending" },
  { id: "cnic", label: "Guardian CNIC copy", status: "Pending" },
  { id: "photo", label: "Student photograph", status: "Pending" },
]

function emptyForm(classId: string) {
  return {
    name: "",
    dob: "",
    gender: "Female" as "Female" | "Male",
    address: "",
    previousSchool: "",
    previousClass: "",
    classId,
    guardian: "",
    guardianRelation: "Father",
    phone: "",
    guardianAddress: "",
    documents: DOC_DEFAULTS.map((item) => ({ ...item })),
    interviewType: "Interview",
    interviewDate: "",
    interviewScore: "",
    interviewResult: "",
    decision: "" as Application["decision"],
    notes: "",
  }
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AdmissionWizard({ open, onOpenChange }: Props) {
  const { state, addApplication, setApplicationStatus } = useSchool()
  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState(() => emptyForm(state.classes[0]?.id ?? ""))
  const currentSession = useMemo(() => state.sessions.find((session) => session.current), [state.sessions])

  function reset() {
    setStep(0)
    setErrors({})
    setForm(emptyForm(state.classes[0]?.id ?? ""))
  }

  function close() {
    onOpenChange(false)
    reset()
  }

  function validateStep(index: number) {
    const next: Record<string, string> = {}
    if (index === 0) {
      if (!form.name.trim()) next.name = "Student name is required."
      if (!form.dob) next.dob = "Date of birth is required."
      if (!form.classId) next.classId = "Choose a class."
    }
    if (index === 1) {
      if (!form.guardian.trim()) next.guardian = "Guardian name is required."
      if (!form.phone.trim()) next.phone = "Phone is required."
    }
    if (index === 4 && !form.decision) next.decision = "Choose Admit, Reject, or Waitlist."
    if (index === 5 && form.decision === "Admit" && !form.classId) next.classId = "Choose the enrollment class."
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function goNext() {
    if (!validateStep(step)) return
    setStep((value) => Math.min(value + 1, STEPS.length - 1))
  }

  function goBack() {
    setErrors({})
    setStep((value) => Math.max(value - 1, 0))
  }

  function setDocStatus(id: string, status: AdmissionDocument["status"]) {
    setForm((current) => ({
      ...current,
      documents: current.documents.map((item) => (item.id === id ? { ...item, status } : item)),
    }))
  }

  function submitWizard() {
    if (!validateStep(step)) return
    const result = addApplication({
      name: form.name,
      dob: form.dob,
      gender: form.gender,
      address: form.address,
      previousSchool: form.previousSchool,
      previousClass: form.previousClass,
      classId: form.classId,
      guardian: form.guardian,
      guardianRelation: form.guardianRelation,
      phone: form.phone,
      guardianAddress: form.guardianAddress || form.address,
      documents: form.documents,
      interviewType: form.interviewType,
      interviewDate: form.interviewDate,
      interviewScore: form.interviewScore,
      interviewResult: form.interviewResult,
      decision: form.decision,
      notes: form.notes,
    }, "Ayesha Khan")
    if ("error" in result) {
      toast.error(result.error)
      return
    }
    const status = form.decision === "Admit" ? "Enrolled" : form.decision === "Waitlist" ? "Waitlist" : form.decision === "Reject" ? "Rejected" : "Review"
    const statusError = setApplicationStatus(result.id, status, "Ayesha Khan")
    if (statusError) toast.error(statusError)
    else toast.success(status === "Enrolled" ? "Applicant enrolled into the register" : `Application saved as ${status}`)
    close()
  }

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) close(); else onOpenChange(true) }}>
      <DialogContent className="gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle className="text-[20px] font-semibold text-[var(--heading)]">New admission</DialogTitle>
          <DialogDescription>
            SRS intake wizard · dummy data · {currentSession?.name ?? "No active session"}
          </DialogDescription>
          <ol className="mt-4 flex flex-wrap gap-2">
            {STEPS.map((item, index) => (
              <li
                key={item.id}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium",
                  index === step && "bg-[var(--primary-color)] text-white",
                  index < step && "bg-[var(--secondary-color)] text-[var(--primary-color)]",
                  index > step && "bg-muted text-muted-foreground",
                )}
              >
                {index + 1}. {item.title}
              </li>
            ))}
          </ol>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto px-6 py-5">
          {step === 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Student name" error={errors.name}><Input aria-invalid={Boolean(errors.name)} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Full name" /></Field>
              <Field label="Date of birth" error={errors.dob}><Input aria-invalid={Boolean(errors.dob)} type="date" value={form.dob} onChange={(event) => setForm({ ...form, dob: event.target.value })} /></Field>
              <Field label="Gender">
                <Select value={form.gender} onValueChange={(gender: "Female" | "Male") => setForm({ ...form, gender })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectGroup><SelectItem value="Female">Female</SelectItem><SelectItem value="Male">Male</SelectItem></SelectGroup></SelectContent>
                </Select>
              </Field>
              <Field label="Applying for" error={errors.classId}>
                <Select value={form.classId} onValueChange={(classId) => setForm({ ...form, classId })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectGroup>{state.classes.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}</SelectGroup></SelectContent>
                </Select>
              </Field>
              <div className="sm:col-span-2"><Field label="Address"><Input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="Home address" /></Field></div>
              <Field label="Previous school"><Input value={form.previousSchool} onChange={(event) => setForm({ ...form, previousSchool: event.target.value })} placeholder="School last attended" /></Field>
              <Field label="Last class completed"><Input value={form.previousClass} onChange={(event) => setForm({ ...form, previousClass: event.target.value })} placeholder="Grade 5" /></Field>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Guardian name" error={errors.guardian}><Input aria-invalid={Boolean(errors.guardian)} value={form.guardian} onChange={(event) => setForm({ ...form, guardian: event.target.value })} /></Field>
              <Field label="Relationship">
                <Select value={form.guardianRelation} onValueChange={(guardianRelation) => setForm({ ...form, guardianRelation })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectGroup>{["Father", "Mother", "Guardian", "Other"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectGroup></SelectContent>
                </Select>
              </Field>
              <Field label="Phone" error={errors.phone}><Input aria-invalid={Boolean(errors.phone)} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="03xx-xxxxxxx" /></Field>
              <div className="sm:col-span-2"><Field label="Guardian address"><Input value={form.guardianAddress} onChange={(event) => setForm({ ...form, guardianAddress: event.target.value })} placeholder="Same as student if shared" /></Field></div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-3">
              <p className="text-sm text-muted-foreground">Mark each required document. Uploads are simulated with dummy statuses.</p>
              {form.documents.map((doc) => (
                <div key={doc.id} className="flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={doc.status !== "Pending"} onCheckedChange={(checked) => setDocStatus(doc.id, checked ? "Uploaded" : "Pending")} />
                    <Label className="font-medium">{doc.label}</Label>
                  </div>
                  <Select value={doc.status} onValueChange={(status: AdmissionDocument["status"]) => setDocStatus(doc.id, status)}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectGroup><SelectItem value="Pending">Pending</SelectItem><SelectItem value="Uploaded">Uploaded</SelectItem><SelectItem value="Verified">Verified</SelectItem></SelectGroup></SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Type">
                <Select value={form.interviewType} onValueChange={(interviewType) => setForm({ ...form, interviewType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectGroup>{["Interview", "Written test", "Interview + written test"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectGroup></SelectContent>
                </Select>
              </Field>
              <Field label="Date"><Input type="date" value={form.interviewDate} onChange={(event) => setForm({ ...form, interviewDate: event.target.value })} /></Field>
              <Field label="Score / marks"><Input value={form.interviewScore} onChange={(event) => setForm({ ...form, interviewScore: event.target.value })} placeholder="78" /></Field>
              <Field label="Result">
                <Select value={form.interviewResult || "none"} onValueChange={(value) => setForm({ ...form, interviewResult: value === "none" ? "" : value })}>
                  <SelectTrigger><SelectValue placeholder="Select result" /></SelectTrigger>
                  <SelectContent><SelectGroup>
                    <SelectItem value="none">Not recorded</SelectItem>
                    {["Pass", "Fail", "Recommended", "Not recommended"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                  </SelectGroup></SelectContent>
                </Select>
              </Field>
              <div className="sm:col-span-2"><Field label="Remarks"><Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Evaluator notes" /></Field></div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="grid gap-4">
              <Field label="Admission decision" error={errors.decision}>
                <div className="grid gap-2 sm:grid-cols-3">
                  {(["Admit", "Reject", "Waitlist"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setForm({ ...form, decision: option })}
                      className={cn(
                        "rounded-xl border px-4 py-3 text-sm font-medium transition-colors",
                        form.decision === option
                          ? "border-[var(--primary-color)] bg-[var(--secondary-color)] text-[var(--primary-color)]"
                          : "hover:bg-muted",
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Decision notes"><Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Reason for admit, reject or waitlist" /></Field>
            </div>
          ) : null}

          {step === 5 ? (
            <div className="grid gap-4">
              <div className="rounded-xl border bg-[var(--secondary-color)]/50 px-4 py-3 text-sm">
                <p className="font-medium text-[var(--heading)]">{form.name || "Applicant"}</p>
                <p className="text-muted-foreground">
                  Decision: {form.decision || "—"} · Session: {currentSession?.name ?? "—"} · Class: {state.classes.find((item) => item.id === form.classId)?.label ?? "—"}
                </p>
              </div>
              {form.decision === "Admit" ? (
                <Field label="Enroll into class" error={errors.classId}>
                  <Select value={form.classId} onValueChange={(classId) => setForm({ ...form, classId })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectGroup>{state.classes.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}</SelectGroup></SelectContent>
                  </Select>
                </Field>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {form.decision === "Waitlist"
                    ? "Applicant will be saved on the waitlist. No student record is created yet."
                    : "Applicant will be marked rejected. No student record is created."}
                </p>
              )}
            </div>
          ) : null}
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button variant="outline" onClick={step === 0 ? close : goBack}>{step === 0 ? "Cancel" : "Back"}</Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={goNext}>Continue</Button>
          ) : (
            <Button onClick={submitWizard}>{form.decision === "Admit" ? "Enroll student" : "Save application"}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
