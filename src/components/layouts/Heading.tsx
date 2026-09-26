import { cn } from "@/lib/utils"

export function Heading({
  title,
  detail,
  className,
}: {
  title: string
  detail?: string
  className?: string
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <h1 className="text-[20px] font-semibold tracking-tight text-[var(--heading)] dark:text-foreground">
        {title}
      </h1>
      {detail ? <p className="text-sm text-muted-foreground">{detail}</p> : null}
    </div>
  )
}

export default Heading
