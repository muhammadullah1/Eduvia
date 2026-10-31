import { EmptyState } from "@/components/app/kit"
import { Button } from "@/components/ui/button"

/** Shown in place of a section the signed-in role is not permitted to open (the API would answer 403). */
export function SectionForbidden({ onHome }: { onHome: () => void }) {
  return (
    <div role="alert">
      <EmptyState
        title="You don't have access to this page"
        detail="Your role does not include the permission this page needs. Ask your Super Admin if you should have access."
        action={
          <Button type="button" onClick={onHome}>
            Go to my home page
          </Button>
        }
      />
    </div>
  )
}
