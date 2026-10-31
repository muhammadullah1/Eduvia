import { api } from "@/lib/api"

import type { FeeType } from "./fee-structure.service"

export type FeeTypePolicy = {
  feeType: FeeType
  label: string
  concessionEligible: boolean
  active: boolean
}

export const FEE_POLICIES_QUERY_KEY = "fee-type-policies"

const feePoliciesService = {
  list: () => api.get<FeeTypePolicy[]>("/settings/fee-type-policies"),
  update: (items: Array<Partial<FeeTypePolicy> & { feeType: FeeType }>) =>
    api.put<FeeTypePolicy[]>("/settings/fee-type-policies", { items }),
}

export default feePoliciesService
