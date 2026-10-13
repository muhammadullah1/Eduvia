import { api } from "@/lib/api"
import type { ApiFeeMonth } from "@/lib/api-types"

const feesService = {
  listMonths: () => api.get<ApiFeeMonth[]>("/fees/months"),
}

export default feesService
