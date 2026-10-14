import { cn } from "@/lib/utils"

type Props = {
  name: string
  size?: "md" | "lg"
  className?: string
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  const first = parts[0][0] ?? ""
  const last = parts[parts.length - 1][0] ?? ""
  return `${first}${last}`.toUpperCase()
}

export function StaffAvatar({ name, size = "md", className }: Props) {
  const initials = initialsFromName(name)
  let sizeClass = "size-10 text-sm"
  if (size === "lg") sizeClass = "size-14 text-base"

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--cls-brand)]/15 to-[var(--cls-brand)]/5 font-semibold text-[var(--cls-brand)] ring-1 ring-[var(--cls-brand)]/20",
        sizeClass,
        className
      )}
      aria-hidden
    >
      {initials}
    </span>
  )
}
