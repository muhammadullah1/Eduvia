import { Archive, PencilLine, Trash2 } from "lucide-react"
import type { ComponentProps, ReactNode } from "react"

import type { ExamSummary } from "@/api/exams/exams.service"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import { examLocks } from "./exam-utils"

/** Shows why an action is unavailable. Disabled buttons get a focusable wrapper so the tooltip still opens. */
function WithReason({ reason, disabled, children }: { reason: string; disabled: boolean; children: ReactNode }) {
  if (!reason) return children
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {disabled ? (
          <span tabIndex={0} className="inline-flex cursor-not-allowed rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color)]/35">
            {children}
          </span>
        ) : (
          children
        )}
      </TooltipTrigger>
      <TooltipContent className="max-w-64 text-center">{reason}</TooltipContent>
    </Tooltip>
  )
}

type Props = {
  exam: ExamSummary
  size?: ComponentProps<typeof Button>["size"]
  onEdit: () => void
  onDelete: () => void
  onArchive: () => void
}

/**
 * Edit / Delete / Archive for one exam, following its lifecycle:
 * unavailable actions stay visible but disabled, with the reason on hover.
 * Archive appears only once the exam has ended.
 */
export function ExamLifecycleActions({ exam, size = "default", onEdit, onDelete, onArchive }: Props) {
  const locks = examLocks(exam)
  if (exam.status === "Archived") return null
  return (
    <div className="flex flex-wrap items-center gap-2" data-exam-phase={exam.phase}>
      <WithReason reason={locks.edit.reason} disabled={!locks.edit.allowed}>
        <Button variant="outline" size={size} disabled={!locks.edit.allowed} onClick={onEdit}>
          <PencilLine />
          {locks.edit.limited ? "Edit (limited)" : "Edit exam"}
        </Button>
      </WithReason>
      {locks.archive.allowed ? (
        <Button variant="outline" size={size} onClick={onArchive}>
          <Archive />
          Archive
        </Button>
      ) : null}
      <WithReason reason={locks.delete.reason} disabled={!locks.delete.allowed}>
        <Button
          variant="outline"
          size={size}
          disabled={!locks.delete.allowed}
          onClick={onDelete}
          className="border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
        >
          <Trash2 />
          Delete
        </Button>
      </WithReason>
    </div>
  )
}
