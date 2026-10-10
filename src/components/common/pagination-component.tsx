import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PAGE_SIZE_OPTIONS } from "@/constants/pagination"
import type { PaginationMeta } from "@/types/shared/api/response"
import { cn } from "@/lib/utils"

export type PaginationWithHandlers = PaginationMeta & {
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

type Props = {
  pagination: PaginationWithHandlers
  pageSizeOptions?: readonly number[]
  className?: string
}

export function PaginationComponent({
  pagination,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  className,
}: Props) {
  const totalPages = Math.max(
    pagination.totalPages ||
      Math.ceil(pagination.total / pagination.pageSize) ||
      1,
    1
  )
  const startIndex =
    pagination.total === 0
      ? 0
      : (pagination.page - 1) * pagination.pageSize + 1
  const endIndex = Math.min(
    pagination.page * pagination.pageSize,
    pagination.total
  )

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t border-[var(--cls-border)] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <p className="text-sm text-[var(--cls-muted)]">
        {pagination.total === 0
          ? "0 of 0"
          : `${startIndex}-${endIndex} of ${pagination.total}`}
      </p>
      <div className="flex flex-wrap items-center justify-end gap-4">
        <div className="flex items-center gap-2 text-sm text-[var(--cls-muted)]">
          <span>Rows per page:</span>
          <Select
            value={String(pagination.pageSize)}
            onValueChange={(value) =>
              pagination.onPageSizeChange(Number(value))
            }
          >
            <SelectTrigger
              size="sm"
              className="h-8 w-[4.25rem] border-[var(--cls-border)] bg-white text-[var(--cls-ink)]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectGroup>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {String(size).padStart(2, "0")}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="size-8 border-[var(--cls-border)]"
            onClick={() => pagination.onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-[3rem] text-center text-sm text-[var(--cls-muted)]">
            {pagination.page}/{totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="size-8 border-[var(--cls-border)]"
            onClick={() => pagination.onPageChange(pagination.page + 1)}
            disabled={pagination.page >= totalPages}
            aria-label="Next page"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
