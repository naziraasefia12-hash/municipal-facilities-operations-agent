import { useQuery } from '@tanstack/react-query'
import type { AuditFilters } from '../types'
import { getAuditLogs } from '../api/auditLog'

export function useAuditLog(filters: AuditFilters = {}) {
  return useQuery({ queryKey: ['auditLog', filters], queryFn: () => getAuditLogs(filters) })
}
