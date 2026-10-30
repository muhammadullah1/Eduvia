import { api } from "@/lib/api"

export type AuditLogDto = {
  id: number
  actorUserId?: number | null
  actorLabel?: string | null
  action: string
  at?: string | null
  created_at?: string | null
  createdAt?: string | null
  entityType?: string | null
  entityId?: number | null
  metadata?: Record<string, unknown> | null
}

export type AuditEventView = {
  id: string
  actor: string
  action: string
  at: string
  entity?: string
  metadata: Record<string, unknown>
}

function mapAudit(row: AuditLogDto): AuditEventView {
  return {
    id: String(row.id),
    actor: row.actorLabel || "System",
    action: row.action,
    at: row.at || row.createdAt || row.created_at || new Date().toISOString(),
    entity: row.entityType ?? undefined,
    metadata: row.metadata ?? {},
  }
}

const auditService = {
  list: async (query?: { limit?: number; entityType?: string; entityId?: number }) => {
    const rows = await api.get<AuditLogDto[]>("/audit-logs", {
      limit: query?.limit ?? 200,
      entityType: query?.entityType,
      entityId: query?.entityId,
    })
    return (rows ?? []).map(mapAudit)
  },
}

export default auditService
