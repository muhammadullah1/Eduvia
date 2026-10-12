import { ClassesPage } from "@/features/management/classes/classes-page"

export function Classes({ query }: { query: string }) {
  return <ClassesPage globalQuery={query} />
}
