import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuditLog } from '../hooks/useAuditLog'
import { FilterBar } from '../components/ui/FilterBar'
import { ErrorState } from '../components/ui/ErrorState'
import { EmptyState } from '../components/ui/EmptyState'
import { LoadingState } from '../components/ui/LoadingState'
import type { AuditFilters } from '../types'
import { formatDateTime } from '../utils/formatters'

const EVENT_TYPES = [
  'work_order_created', 'triage_completed', 'status_changed',
  'team_assigned', 'escalated', 'approval_requested', 'approved',
]

const EVENT_LABEL: Record<string, string> = {
  work_order_created: 'Created',
  triage_completed: 'Triaged',
  status_changed: 'Status changed',
  team_assigned: 'Team assigned',
  escalated: 'Escalated',
  approval_requested: 'Approval requested',
  approved: 'Approved',
}

function parseDetails(raw: string): string {
  try {
    const obj = JSON.parse(raw)
    return Object.entries(obj).map(([k, v]) => `${k}: ${v}`).join(' · ')
  } catch {
    return raw
  }
}

export function AuditLogPage() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<AuditFilters>({})
  const [actorSearch, setActorSearch] = useState('')
  const { data, isLoading, error, refetch } = useAuditLog({ ...filters, actor: actorSearch || undefined })

  function handleChange(key: string, value: string) {
    setFilters(prev => ({ ...prev, [key]: value || undefined }))
  }

  return (
    <div className="panel" style={{ overflow: 'hidden' }}>
      <div className="panel-header">
        <span className="panel-title">
          Audit Log
          {data && <span style={{ marginLeft: 8, color: 'var(--text-muted)', fontWeight: 400 }}>({data.length})</span>}
        </span>
      </div>

      <FilterBar
        filters={[
          { key: 'event_type', label: 'Event Type', options: EVENT_TYPES.map(e => ({ label: EVENT_LABEL[e] ?? e, value: e })) },
        ]}
        values={{ event_type: filters.event_type ?? '' }}
        onChange={handleChange}
        search={{ value: actorSearch, onChange: setActorSearch, placeholder: 'Filter by actor…' }}
        onClear={() => { setFilters({}); setActorSearch('') }}
      />

      {isLoading ? <LoadingState message="Loading audit log…" /> : error ? (
        <div style={{ padding: 16 }}><ErrorState message="Failed to load audit log." onRetry={refetch} /></div>
      ) : !data?.length ? (
        <EmptyState label="No audit events" sub="Events appear here as work orders are created and updated." />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 150 }}>Timestamp</th>
                <th style={{ width: 150 }}>Event</th>
                <th style={{ width: 130 }}>Work Order</th>
                <th style={{ width: 130 }}>Actor</th>
                <th>Change / Details</th>
              </tr>
            </thead>
            <tbody>
              {data.map(log => (
                <tr key={log.id}>
                  <td className="td-muted" style={{ whiteSpace: 'nowrap' }}>{formatDateTime(log.created_at)}</td>
                  <td><span className="audit-event-type">{EVENT_LABEL[log.event_type] ?? log.event_type}</span></td>
                  <td>
                    {log.work_order_number ? (
                      <span
                        className="td-mono"
                        style={{ color: 'var(--accent)', cursor: 'pointer' }}
                        onClick={() => navigate(`/work-orders/${log.work_order_id}`)}
                      >
                        {log.work_order_number}
                      </span>
                    ) : <span className="td-muted">—</span>}
                  </td>
                  <td className="td-dim">{log.actor}</td>
                  <td>
                    {log.old_value && log.new_value ? (
                      <span className="audit-change">
                        <span className="audit-old">{log.old_value}</span>
                        <span className="audit-change-arrow">→</span>
                        <span className="audit-new">{log.new_value}</span>
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {parseDetails(log.details).slice(0, 100)}
                        {parseDetails(log.details).length > 100 && '…'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
