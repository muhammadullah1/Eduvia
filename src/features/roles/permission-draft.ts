import type {
  CatalogPermission,
  PermissionCatalog,
  PermissionModule,
  RolePermissionState,
} from "@/api/roles/roles.service"
import type { PermissionKey } from "@/lib/access"

export type PermissionRow = CatalogPermission & {
  lockReason: string | null
  isDefault: boolean
  sensitive: boolean
}

export type ModuleGroup = { module: PermissionModule; rows: PermissionRow[] }

export type PermissionDiff = { added: PermissionKey[]; removed: PermissionKey[] }

/** Catalog modules in their order, each with the role's state for every permission in it. */
export function groupByModule(
  catalog: PermissionCatalog,
  states: readonly RolePermissionState[]
): ModuleGroup[] {
  const stateByKey = new Map(states.map((state) => [state.key, state]))
  return catalog.modules
    .map((module) => ({
      module,
      rows: catalog.permissions
        .filter((permission) => permission.module === module.key)
        .map((permission) => {
          const state = stateByKey.get(permission.key)
          return {
            ...permission,
            lockReason: state?.lockReason ?? null,
            isDefault: state?.isDefault ?? false,
            sensitive: module.sensitive || permission.risk === "high",
          }
        }),
    }))
    .filter((group) => group.rows.length > 0)
}

export function grantedKeys(states: readonly RolePermissionState[]): Set<PermissionKey> {
  return new Set(states.filter((state) => state.granted).map((state) => state.key))
}

export function diffPermissions(
  saved: ReadonlySet<PermissionKey>,
  draft: ReadonlySet<PermissionKey>
): PermissionDiff {
  return {
    added: [...draft].filter((key) => !saved.has(key)).sort(),
    removed: [...saved].filter((key) => !draft.has(key)).sort(),
  }
}

/** Locked permissions keep their state: the API refuses to grant them and always keeps sign-in keys. */
export function isEditable(row: PermissionRow) {
  return row.lockReason === null
}

export function toggleKey(draft: ReadonlySet<PermissionKey>, key: PermissionKey, on: boolean) {
  const next = new Set(draft)
  if (on) next.add(key)
  else next.delete(key)
  return next
}

/** Turns every editable permission in a module on or off, leaving locked ones as they are. */
export function toggleModule(
  draft: ReadonlySet<PermissionKey>,
  rows: readonly PermissionRow[],
  on: boolean
) {
  return rows
    .filter(isEditable)
    .reduce((next, row) => toggleKey(next, row.key, on), new Set(draft))
}
