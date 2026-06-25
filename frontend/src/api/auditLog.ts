import client from './client'
import type { AuditLog, AuditFilters } from '../types'

export const getAuditLogs = (filters: AuditFilters = {}) => {
  const params: Record<string, string | number> = {}
  if (filters.event_type) params.event_type = filters.event_type
  if (filters.actor) params.actor = filters.actor
  if (filters.work_order_id) params.work_order_id = filters.work_order_id
  return client.get<AuditLog[]>('/audit-logs', { params }).then(r => r.data)
}
