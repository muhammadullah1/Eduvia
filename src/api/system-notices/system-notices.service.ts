import { api } from "@/lib/api"

export type SystemNotice = {
  id: string
  title: string
  detail: string
  count: number
  /** Portal section that resolves it. */
  section: string
}

const systemNoticesService = {
  list: () => api.get<SystemNotice[]>("/system-notices"),
}

export default systemNoticesService
