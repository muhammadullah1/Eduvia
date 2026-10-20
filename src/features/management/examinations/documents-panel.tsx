import { FileText } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import examsService, { type ExamResults, type ExamSummary } from "@/api/exams/exams.service"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { loadAuth } from "@/lib/auth"

import { Chooser } from "./exam-shared"
import { classPapers } from "./exam-utils"

type Kind = "dmc" | "result-sheet" | "mark-sheet" | "class-report" | "overall"

const CARDS: { kind: Kind; title: string; detail: string }[] = [
  { kind: "dmc", title: "DMC", detail: "Student marks, total, percentage, and grade." },
  { kind: "result-sheet", title: "Result sheet", detail: "Class result across every paper, with class ranks." },
  { kind: "mark-sheet", title: "Mark sheet", detail: "The same subject sheet, ready to print." },
  { kind: "class-report", title: "Class result report", detail: "Every subject for one class combined." },
  { kind: "overall", title: "Overall examination report", detail: "Every class in this exam, ranked within each class." },
]

type Props = { exam: ExamSummary }

export function DocumentsPanel({ exam }: Props) {
  const [classId, setClassId] = useState("")
  const [subjectId, setSubjectId] = useState("")
  const [studentId, setStudentId] = useState("")
  const [preview, setPreview] = useState<ExamResults[] | null>(null)
  const [previewTitle, setPreviewTitle] = useState("")
  const activeClass = classId || (exam.classes[0] ? String(exam.classes[0].id) : "")
  const subjects = classPapers(exam, activeClass)
  const activeSubject = subjectId || (subjects[0] ? String(subjects[0].subjectId) : "")

  async function openPreview(kind: Kind) {
    try {
      if (kind === "dmc") {
        if (!studentId) {
          toast.error("Enter the student id shown on the result sheet.")
          return
        }
        const data = await examsService.results(exam.id, Number(activeClass))
        const row = data.rows.find((item) => String(item.studentId) === studentId)
        if (!row) {
          toast.error("That student is not on the selected class sheet.")
          return
        }
        setPreview([{ ...data, rows: [row] }])
        setPreviewTitle("Detailed marks certificate")
        return
      }
      const path = documentPath(kind, exam.id, activeClass, activeSubject, false)
      const res = await fetch(`/api${path}`, {
        headers: authHeaders(),
      })
      const body = (await res.json()) as {
        success?: boolean
        message?: string
        data?: ExamResults | { classes: ExamResults[] }
      }
      if (!res.ok || body.success === false || !body.data) {
        throw new Error(body.message || "Could not preview this document.")
      }
      setPreview("classes" in body.data ? body.data.classes : [body.data])
      setPreviewTitle(CARDS.find((card) => card.kind === kind)?.title ?? "Document")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not preview this document.")
    }
  }

  async function download(kind: Kind) {
    try {
      if (kind === "dmc") {
        if (!studentId) {
          toast.error("Enter a student id before downloading the DMC.")
          return
        }
        await examsService.download(
          `/exams/${exam.id}/dmc?studentId=${studentId}&format=pdf`,
          `dmc-${studentId}.pdf`
        )
        return
      }
      await examsService.download(
        documentPath(kind, exam.id, activeClass, activeSubject, true),
        `${kind}.pdf`
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not download the PDF.")
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 rounded-2xl border border-[var(--cls-border)] bg-white p-4 shadow-sm md:grid-cols-3">
        <Chooser label="Class" value={activeClass} placeholder="Select class" onChange={setClassId} options={exam.classes.map((item) => ({ value: String(item.id), label: item.label }))} />
        <Chooser label="Subject (mark sheet)" value={activeSubject} placeholder="Select subject" onChange={setSubjectId} options={subjects.map((item) => ({ value: String(item.subjectId), label: item.subject }))} />
        <label className="flex flex-col gap-1 text-xs text-[var(--cls-muted)]">
          Student id for DMC
          <input
            className="h-9 rounded-md border border-[var(--cls-border)] px-3 text-sm text-[var(--cls-ink)]"
            value={studentId}
            onChange={(event) => setStudentId(event.target.value)}
            placeholder="e.g. 12"
          />
        </label>
      </div>
      <p className="text-sm text-[var(--cls-muted)]">
        Documents are built from published and in-progress sheets. A parent can download a DMC only when the result is visible to them.
      </p>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {CARDS.map((card) => (
          <article key={card.kind} className="flex flex-col rounded-2xl border border-[var(--cls-border)] bg-white p-4 shadow-sm">
            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-[var(--secondary-color)] text-[var(--primary-color)]">
              <FileText className="size-5" />
            </span>
            <h3 className="mt-3 font-semibold text-[var(--cls-ink)]">{card.title}</h3>
            <p className="mt-1 flex-1 text-sm text-[var(--cls-muted)]">{card.detail}</p>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="sm" onClick={() => void openPreview(card.kind)}>Preview</Button>
              <Button size="sm" onClick={() => void download(card.kind)}>Download PDF</Button>
            </div>
          </article>
        ))}
      </div>
      <Dialog open={Boolean(preview)} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{previewTitle}</DialogTitle>
          </DialogHeader>
          {preview?.map((block) => (
            <div key={block.classId} className="mb-4 text-sm">
              <p className="mb-3 font-medium">
                {[block.exam.name, block.classLabel, block.subject].filter(Boolean).join(" · ")}
              </p>
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs text-[var(--cls-muted)] uppercase">
                    <th className="py-2">Rank</th>
                    <th>Student</th>
                    <th>Marks</th>
                    <th>Grade</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row) => (
                    <tr key={row.studentId} className="border-t border-[var(--cls-border)]">
                      <td className="py-2">{row.classRank ?? "—"}</td>
                      <td>{row.name}</td>
                      <td>{row.obtained ?? "—"} / {row.total}</td>
                      <td>{row.grade ?? "—"}</td>
                      <td>{row.result}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function documentPath(kind: Kind, examId: number, classId: string, subjectId: string, pdf: boolean) {
  const params = new URLSearchParams()
  if (kind !== "overall" && classId) params.set("classId", classId)
  if (kind === "mark-sheet" && subjectId) params.set("subjectId", subjectId)
  if (pdf) params.set("format", "pdf")
  return `/exams/${examId}/documents/${kind}?${params.toString()}`
}

function authHeaders() {
  const session = loadAuth()
  return {
    Authorization: session?.token ? `Bearer ${session.token}` : "",
    platform: "webApp",
  }
}
