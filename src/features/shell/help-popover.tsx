import { useQuery } from "@tanstack/react-query"
import { ChevronRight, CircleHelp } from "lucide-react"
import { useState } from "react"

import systemNoticesService from "@/api/system-notices/system-notices.service"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const SYSTEM_NOTICES_QUERY_KEY = ["system-notices"]

type Props = {
  onOpenSection: (section: string) => void
}

/** "?" in the top bar: things that need doing now, plus where to get help. */
export function HelpPopover({ onOpenSection }: Props) {
  const [open, setOpen] = useState(false)
  const { data: notices = [], isLoading, isError } = useQuery({
    queryKey: SYSTEM_NOTICES_QUERY_KEY,
    queryFn: systemNoticesService.list,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  })

  function go(section: string) {
    setOpen(false)
    onOpenSection(section)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="relative size-8 text-[var(--cls-muted)]"
          aria-label={notices.length ? `Help, ${notices.length} item(s) need attention` : "Help"}
        >
          <CircleHelp className="size-[18px]" />
          {notices.length ? (
            <span
              data-testid="help-dot"
              className="absolute top-1 right-1 size-2 rounded-full bg-[#d64545] ring-2 ring-white"
              aria-hidden
            />
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-[var(--cls-border)] px-3.5 py-2.5">
          <p className="text-sm font-semibold text-[var(--cls-ink)]">Needs attention</p>
        </div>
        <div className="max-h-72 overflow-y-auto p-1.5">
          {isLoading ? (
            <p className="px-2 py-2 text-xs text-[var(--cls-muted)]">Checking…</p>
          ) : isError ? (
            <p className="px-2 py-2 text-xs text-[var(--cls-muted)]">Couldn't load notices right now.</p>
          ) : notices.length === 0 ? (
            <p className="px-2 py-2 text-xs text-[var(--cls-muted)]">You're all caught up.</p>
          ) : (
            <ul className="flex flex-col">
              {notices.map((notice) => (
                <li key={notice.id}>
                  <button
                    type="button"
                    onClick={() => go(notice.section)}
                    className="flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-[var(--page-wash)]"
                  >
                    <span className="mt-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#fdecec] px-1.5 text-[11px] font-semibold text-[#b42318]">
                      {notice.count}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-medium text-[var(--cls-ink)]">{notice.title}</span>
                      <span className="block text-xs text-[var(--cls-muted)]">{notice.detail}</span>
                    </span>
                    <ChevronRight className="mt-1 size-3.5 shrink-0 text-[var(--cls-muted)]" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t border-[var(--cls-border)] px-3.5 py-2.5 text-xs text-[var(--cls-muted)]">
          <p className="font-medium text-[var(--cls-ink)]">Help</p>
          <p className="mt-0.5">
            Can't sign in or missing access? Ask your school administrator.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  )
}
