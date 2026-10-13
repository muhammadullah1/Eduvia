import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      position="top-center"
      richColors={false}
      closeButton
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4 text-emerald-600" />,
        info: <InfoIcon className="size-4 text-[var(--cls-muted)]" />,
        warning: <TriangleAlertIcon className="size-4 text-amber-600" />,
        error: <OctagonXIcon className="size-4 text-red-600" />,
        loading: <Loader2Icon className="size-4 animate-spin text-[var(--cls-muted)]" />,
      }}
      toastOptions={{
        unstyled: false,
        classNames: {
          toast:
            "flex items-center gap-2 rounded-lg border border-[var(--cls-border)] bg-white px-4 py-3 text-[var(--cls-ink)] shadow-sm",
          title: "text-sm font-medium text-[var(--cls-ink)]",
          description: "text-sm text-[var(--cls-muted)]",
          closeButton:
            "border-[var(--cls-border)] bg-white text-[var(--cls-muted)] hover:bg-[var(--page-wash)]",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
