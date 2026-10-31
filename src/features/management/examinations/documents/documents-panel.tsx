import { useQuery } from "@tanstack/react-query"
import {
  Award,
  BookOpenCheck,
  ClipboardList,
  Download,
  Eye,
  FileSpreadsheet,
  Loader2,
  type LucideIcon,
  School,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import examsService, {
  type ExamDocumentKind,
  type ExamDocumentQuery,
  type ExamSummary,
} from "@/api/exams/exams.service"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

import { classPapers } from "../exam-utils"
import { type PrintableDocument, toPrintable } from "./document-model"
import { DocumentPreview } from "./document-preview"

type Needs = { student?: boolean; subject?: boolean; classLevel?: boolean }

const CARDS: {
  kind: ExamDocumentKind
  title: string
  detail: string
  icon: LucideIcon
  needs: Needs
}[] = [
  { kind: "dmc", title: "DMC", detail: "One student's papers with total, passing and obtained marks, grade, result and class rank.", icon: Award, needs: { classLevel: true, student: true } },
  { kind: "result-sheet", title: "Result sheet", detail: "The class against every paper, with totals, grades and ranks.", icon: FileSpreadsheet, needs: { classLevel: true } },
  { kind: "mark-sheet", title: "Mark sheet", detail: "One subject's marks for the class, ready to print and sign.", icon: ClipboardList, needs: { classLevel: true, subject: true } },
  { kind: "class-report", title: "Class result report", detail: "Every subject for one class: subject statistics and class standing.", icon: BookOpenCheck, needs: { classLevel: true } },
  { kind: "overall", title: "Overall examination report", detail: "Every class in this exam, ranked within each class.", icon: School, needs: {} },
]

type Props = {
  exam: ExamSummary
  /** Class picked elsewhere on the page (URL `class`), used as each card's starting class. */
  initialClassId?: string
}

export function DocumentsPanel({ exam, initialClassId }: Props) {
  const [preview, setPreview] = useState<PrintableDocument | null>(null)
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-[var(--cls-muted)]">
        Documents use live marks. Anything not yet published is marked provisional. Parents can only open their own child's DMC,
        and only once the result is visible to them.
      </p>
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {CARDS.map((card) => (
          <DocumentCard
            key={card.kind}
            exam={exam}
            card={card}
            initialClassId={initialClassId}
            onPreview={setPreview}
          />
        ))}
      </div>
      <Dialog open={Boolean(preview)} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="flex max-h-[90vh] min-w-0 flex-col gap-4 sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{preview?.title}</DialogTitle>
            <DialogDescription>Preview of the printable document.</DialogDescription>
          </DialogHeader>
          {/* Only this body scrolls; wide tables scroll sideways inside it, never past the modal. */}
          <div className="min-h-0 min-w-0 flex-1 overflow-auto rounded-lg border border-[var(--cls-border)] bg-[var(--page-wash)] p-3 sm:p-4">
            {preview ? <DocumentPreview doc={preview} /> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(null)}>Close</Button>
            {preview ? <DownloadButton doc={preview} /> : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DocumentCard({
  exam,
  card,
  initialClassId,
  onPreview,
}: {
  exam: ExamSummary
  card: (typeof CARDS)[number]
  initialClassId?: string
  onPreview: (doc: PrintableDocument) => void
}) {
  const [classId, setClassId] = useState(() =>
    initialClassId && exam.classes.some((item) => String(item.id) === initialClassId)
      ? initialClassId
      : exam.classes[0]
        ? String(exam.classes[0].id)
        : ""
  )
  const [subjectId, setSubjectId] = useState("")
  const [studentId, setStudentId] = useState("")
  const [busy, setBusy] = useState<"preview" | "download" | null>(null)
  const papers = classPapers(exam, classId)
  const activeSubject = subjectId || (papers[0] ? String(papers[0].subjectId) : "")

  const students = useQuery({
    queryKey: ["exam-results", exam.id, classId, "documents"],
    queryFn: () => examsService.results(exam.id, Number(classId)),
    enabled: Boolean(card.needs.student && classId),
  })
  const studentOptions = (students.data?.rows ?? [])
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((row) => ({ value: String(row.studentId), label: `${row.name} · ${row.admissionNo}` }))

  function query(): ExamDocumentQuery | null {
    const missing =
      (card.needs.classLevel && !classId && "Choose a class first.") ||
      (card.needs.subject && !activeSubject && "This class has no papers yet.") ||
      (card.needs.student && !studentId && "Choose a student first.")
    if (missing) {
      toast.error(missing)
      return null
    }
    return {
      classId: card.needs.classLevel ? Number(classId) : undefined,
      subjectId: card.needs.subject ? Number(activeSubject) : undefined,
      studentId: card.needs.student ? Number(studentId) : undefined,
    }
  }

  async function run(action: "preview" | "download") {
    const params = query()
    if (!params) return
    setBusy(action)
    try {
      const doc = toPrintable(await examsService.document(exam.id, card.kind, params))
      if (action === "preview") onPreview(doc)
      else await saveDocumentPdf(doc)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not build this document.")
    } finally {
      setBusy(null)
    }
  }

  const Icon = card.icon
  return (
    <article
      data-document={card.kind}
      className="flex flex-col rounded-xl border border-[var(--cls-border)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.06)] transition-shadow hover:shadow-[0_4px_12px_rgba(16,24,40,0.08)]"
    >
      <div className="flex items-start gap-3 p-5 pb-4">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--secondary-color)] text-[var(--primary-color)] ring-1 ring-[var(--brand-border)] ring-inset">
          <Icon className="size-[18px]" />
        </span>
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-[var(--cls-ink)]">{card.title}</h3>
          <p className="mt-0.5 text-[13px] leading-5 text-[var(--cls-muted)]">{card.detail}</p>
        </div>
      </div>
      <div className="flex flex-1 flex-wrap content-start gap-x-3 gap-y-2.5 px-5 pb-4">
        {card.needs.classLevel ? (
          <CompactSelect
            label="Class"
            value={classId}
            placeholder="Select class"
            onChange={(value) => {
              setClassId(value)
              setSubjectId("")
              setStudentId("")
            }}
            options={exam.classes.map((item) => ({ value: String(item.id), label: item.label }))}
          />
        ) : null}
        {card.needs.subject ? (
          <CompactSelect
            label="Subject"
            value={activeSubject}
            placeholder="Select subject"
            onChange={setSubjectId}
            options={papers.map((item) => ({ value: String(item.subjectId), label: item.subject }))}
          />
        ) : null}
        {card.needs.student ? (
          <CompactSelect
            label="Student"
            value={studentId}
            placeholder={students.isLoading ? "Loading…" : "Select student"}
            onChange={setStudentId}
            options={studentOptions}
            wide
          />
        ) : null}
        {!card.needs.classLevel ? (
          <p className="self-center text-[13px] text-[var(--cls-muted)]">
            Covers all {exam.classes.length} {exam.classes.length === 1 ? "class" : "classes"} in this exam.
          </p>
        ) : null}
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-[var(--cls-border)] bg-[var(--page-wash)]/60 px-5 py-3">
        <Button variant="outline" size="sm" disabled={busy != null} onClick={() => void run("preview")}>
          {busy === "preview" ? <Loader2 className="animate-spin" /> : <Eye />}
          Preview
        </Button>
        <Button size="sm" disabled={busy != null} onClick={() => void run("download")}>
          {busy === "download" ? <Loader2 className="animate-spin" /> : <Download />}
          Download PDF
        </Button>
      </div>
    </article>
  )
}

/** Label + right-sized select used inside the document cards. */
function CompactSelect({
  label,
  value,
  placeholder,
  options,
  onChange,
  wide,
}: {
  label: string
  value: string
  placeholder: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  wide?: boolean
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-[var(--cls-muted)]">{label}</span>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger size="sm" className={cn("text-[13px]", wide ? "w-56" : "w-36")}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  )
}

function DownloadButton({ doc }: { doc: PrintableDocument }) {
  const [busy, setBusy] = useState(false)
  return (
    <Button
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        try {
          await saveDocumentPdf(doc)
        } catch {
          toast.error("Could not create the PDF.")
        } finally {
          setBusy(false)
        }
      }}
    >
      {busy ? <Loader2 className="animate-spin" /> : <Download />}
      Download PDF
    </Button>
  )
}

/** The PDF renderer is heavy, so it loads only when a PDF is requested. */
async function saveDocumentPdf(doc: PrintableDocument) {
  const { downloadDocumentPdf } = await import("./pdf-download")
  await downloadDocumentPdf(doc)
}
