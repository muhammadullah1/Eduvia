import { SubjectsPage } from "@/features/management/subjects/subjects-page"

export function Subjects({ query }: { query: string }) {
  return <SubjectsPage globalQuery={query} />
}
