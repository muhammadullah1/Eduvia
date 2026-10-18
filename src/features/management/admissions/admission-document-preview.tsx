import { Eye } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

function isPdfUrl(url: string) {
  return /\.pdf(\?|$)/i.test(url)
}

type PreviewProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  fileUrl: string
}

export function AdmissionDocumentPreviewDialog({
  open,
  onOpenChange,
  title,
  fileUrl,
}: PreviewProps) {
  const pdf = isPdfUrl(fileUrl)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[min(92vh,720px)] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="border-b border-[var(--cls-border)] px-4 py-3 text-left">
          <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
        </DialogHeader>
        <div className="min-h-[min(60vh,480px)] flex-1 overflow-auto bg-[var(--page-wash)] p-3">
          {pdf ? (
            <iframe
              src={fileUrl}
              title={title}
              className="h-[min(60vh,480px)] w-full rounded-lg border border-[var(--cls-border)] bg-white"
            />
          ) : (
            <img
              src={fileUrl}
              alt={title}
              className="mx-auto max-h-[min(60vh,480px)] w-auto max-w-full rounded-lg border border-[var(--cls-border)] bg-white object-contain"
            />
          )}
        </div>
        <DialogFooter className="border-t border-[var(--cls-border)] px-4 py-3 sm:justify-between">
          <Button type="button" variant="outline" size="sm" asChild>
            <a href={fileUrl} target="_blank" rel="noreferrer">
              Open in new tab
            </a>
          </Button>
          <Button type="button" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type ViewButtonProps = {
  title: string
  fileUrl: string
  size?: "sm" | "default"
  variant?: "outline" | "ghost" | "link"
  className?: string
}

export function AdmissionDocumentViewButton({
  title,
  fileUrl,
  size = "sm",
  variant = "outline",
  className,
}: ViewButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        type="button"
        size={size}
        variant={variant}
        className={className}
        onClick={() => setOpen(true)}
      >
        <Eye data-icon="inline-start" />
        View
      </Button>
      <AdmissionDocumentPreviewDialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        fileUrl={fileUrl}
      />
    </>
  )
}
