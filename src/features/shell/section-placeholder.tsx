import { EmptyState } from "@/components/app/kit"

import { subtitles } from "./navigation"

export function SectionPlaceholder({ section }: { section: string }) {
  return (
    <EmptyState
      title="Coming soon"
      description={
        subtitles[section] ??
        "This area is part of the CLS SMS roadmap and will be available in a future release."
      }
    />
  )
}
