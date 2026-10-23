import { useClassesList } from "../classes/hooks/use-classes"
import { useSessionsList } from "../sessions/hooks/use-sessions"

/** Classes of the current session that are not archived. */
export function useReviewClasses() {
  const sessions = useSessionsList()
  const current = sessions.data?.find((session) => session.current)
  const classes = useClassesList(current ? Number(current.id) : undefined)
  const list = (classes.data ?? []).filter((klass) => klass.status !== "Archived")
  return { classes: list, loading: sessions.isLoading || classes.isLoading }
}
