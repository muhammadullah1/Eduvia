import { Eye } from "lucide-react"
import { useState } from "react"

import applicationsService from "@/api/admissions/applications.service"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "@/lib/toast"

/** Signed R2 links keep the key's extension before the query string. */
function isPdfUrl(url: string) {
  return /\.pdf(\?|$)/i.test(url)
}

type PreviewProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  fileUrl: string
  /** Overrides the extension check (blob: URLs have none). */
  isPdf?: boolean
}

export function AdmissionDocumentPreviewDialog({
  open,
  onOpenChange,
  title,
  fileUrl,
  isPdf,
}: PreviewProps) {
  const pdf = isPdf ?? isPdfUrl(fileUrl)

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
  /** A local file not uploaded yet. */
  file?: File | null
  /** A stored document: opened through a short-lived signed link. */
  stored?: { applicationId: number; documentId: number } | null
  size?: "sm" | "default"
  variant?: "outline" | "ghost" | "link"
  className?: string
}

/** Opens a document preview; stored files get a fresh 5-minute link each time. */
export function AdmissionDocumentViewButton({
  title,
  file,
  stored,
  size = "sm",
  variant = "outline",
  className,
}: ViewButtonProps) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function open() {
    if (file) {
      setUrl(URL.createObjectURL(file))
      return
    }
    if (!stored) return
    setLoading(true)
    try {
      const link = await applicationsService.documentUrl(stored.applicationId, stored.documentId)
      setUrl(link.url)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open the document.")
    } finally {
      setLoading(false)
    }
  }

  function close() {
    if (url?.startsWith("blob:")) URL.revokeObjectURL(url)
    setUrl(null)
  }

  return (
    <>
      <Button
        type="button"
        size={size}
        variant={variant}
        className={className}
        disabled={loading}
        onClick={() => void open()}
      >
        <Eye data-icon="inline-start" />
        {loading ? "Opening…" : "View"}
      </Button>
      {url ? (
        <AdmissionDocumentPreviewDialog
          open
          onOpenChange={(next) => !next && close()}
          title={title}
          fileUrl={url}
          isPdf={file ? file.type === "application/pdf" : undefined}
        />
      ) : null}
    </>
  )
}
