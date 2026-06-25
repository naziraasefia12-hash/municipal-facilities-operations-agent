import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuditLog } from '../hooks/useAuditLog'
import { ErrorState } from '../components/ui/ErrorState'
import { EmptyState } from '../components/ui/EmptyState'
import { LoadingState } from '../components/ui/LoadingState'
import type { AuditLog, AuditFilters } from '../types'
import { formatDateTime } from '../utils/formatters'

// ── Event metadata ────────────────────────────────────────────────────────────

const EVENT_LABEL: Record<string, string> = {
  work_order_created:  'Created',
  triage_completed:    'Triaged',
  status_changed:      'Status changed',
  team_assigned:       'Team assigned',
  escalated:           'Escalated',
  approval_requested:  'Approval requested',
  approved:            'Approved',
}

// Maps each event type to a CSS chip class defined in styles.css
const EVENT_CHIP: Record<string, string> = {
  work_order_created:  'audit-chip-created',
  triage_completed:    'audit-chip-triaged',
  status_changed:      'audit-chip-status',
  team_assigned:       'audit-chip-assigned',
  escalated:           'audit-chip-escalated',
  approval_requested:  'audit-chip-pending',
  approved:            'audit-chip-approved',
}

const EVENT_TYPES = Object.keys(EVENT_LABEL)

// ── Detail formatter ──────────────────────────────────────────────────────────
// Returns a readable summary of the event details JSON for display in the table.
// Each event type gets a tailored format rather than a raw key:value dump.

function formatDetail(log: AuditLog): string {
  try {
    const obj = JSON.parse(log.details) as Record<string, unknown>
    switch (log.event_type) {
      case 'work_order_created':
        return [obj.title, obj.building ? `@ ${obj.building}` : null]
          .filter(Boolean).join(' ')
      case 'triage_completed':
        return [
          obj.category,
          obj.priority ? `· priority: ${obj.priority}` : null,
          obj.agent_mode ? `· agent: ${obj.agent_mode}` : null,
        ].filter(Boolean).join(' ')
      case 'team_assigned':
        return obj.new_team ? `→ ${obj.new_team}` : ''
      case 'escalated':
        return typeof obj.reason === 'string'
          ? obj.reason.slice(0, 100) + (obj.reason.length > 100 ? '…' : '')
          : ''
      case 'approval_requested':
        return [
          obj.approval_level ? `Level: ${obj.approval_level}` : null,
          obj.estimated_cost != null ? `· Est. cost: $${Number(obj.estimated_cost).toLocaleString()}` : null,
        ].filter(Boolean).join(' ')
      case 'approved':
        return [
          obj.approved_by ? `By: ${obj.approved_by}` : null,
          typeof obj.notes === 'string' && obj.notes ? `· "${obj.notes}"` : null,
        ].filter(Boolean).join(' ')
      default: {
        const pairs = Object.entries(obj)
          .filter(([, v]) => v != null && v !== '')
          .slice(0, 3)
          .map(([k, v]) => `${k}: ${v}`)
        return pairs.join(' · ')
      }
    }
  } catch {
    return log.details.slice(0, 100)
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function AuditLogPage() {
  const navigate = useNavigate()
  const [eventType, setEventType] = useState('')
  const [actorSearch, setActorSearch] = useState('')
  const [woSearch, setWoSearch] = useState('')

  const backendFilters: AuditFilters = {
    event_type: eventType || undefined,
    actor: actorSearch || undefined,
  }

  const { data: rawData, isLoading, error, refetch } = useAuditLog(backendFilters)

  // WO number filter is client-side — backend supports it only by integer ID
  const data = useMemo(() => {
    if (!rawData) return []
    if (!woSearch.trim()) return rawData
    const q = woSearch.trim().toUpperCase()
    return rawData.filter(log => log.work_order_number?.toUpperCase().includes(q))
  }, [rawData, woSearch])

  const hasFilters = !!(eventType || actorSearch || woSearch)

  function clearAll() {
    setEventType('')
    setActorSearch('')
    setWoSearch('')
  }

  return (
    <div className="panel" style={{ overflow: 'hidden' }}>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="panel-header">
        <span className="panel-title">
          Audit Log
          {rawData && (
            <span style={{ marginLeft: 8, color: 'var(--text-muted)', fontWeight: 400 }}>
              {data.length}{rawData.length !== data.length ? ` of ${rawData.length}` : ''} events
            </span>
          )}
        </span>
      </div>

      {/* ── Filter bar ─────────────────────────────────────────────── */}
      <div className="filter-bar">
        {/* Event type dropdown */}
        <select
          className={`filter-bar-select ${eventType ? 'active' : ''}`}
          value={eventType}
          onChange={e => setEventType(e.target.value)}
        >
          <option value="">All event types</option>
          {EVENT_TYPES.map(et => (
            <option key={et} value={et}>{EVENT_LABEL[et] ?? et}</option>
          ))}
        </select>

        {/* Actor search */}
        <input
          type="text"
          className="filter-bar-search"
          placeholder="Filter by actor…"
          value={actorSearch}
          onChange={e => setActorSearch(e.target.value)}
          style={{ maxWidth: 180 }}
        />

        {/* WO number search (client-side) */}
        <input
          type="text"
          className="filter-bar-search"
          placeholder="WO number…"
          value={woSearch}
          onChange={e => setWoSearch(e.target.value)}
          style={{ maxWidth: 140 }}
        />

        {/* Active filter chips */}
        {hasFilters && (
          <div className="filter-chips">
            {eventType && (
              <span className="filter-chip">
                {EVENT_LABEL[eventType] ?? eventType}
                <button className="filter-chip-remove" onClick={() => setEventType('')}>×</button>
              </span>
            )}
            {actorSearch && (
              <span className="filter-chip">
                Actor: {actorSearch}
                <button className="filter-chip-remove" onClick={() => setActorSearch('')}>×</button>
              </span>
            )}
            {woSearch && (
              <span className="filter-chip">
                WO: {woSearch}
                <button className="filter-chip-remove" onClick={() => setWoSearch('')}>×</button>
              </span>
            )}
          </div>
        )}

        {hasFilters && (
          <button className="filter-bar-clear" onClick={clearAll}>Clear all</button>
        )}
      </div>

      {/* ── Content ─────────────────────────────────────────────────── */}
      {isLoading ? (
        <LoadingState message="Loading audit log…" />
      ) : error ? (
        <div style={{ padding: 16 }}>
          <ErrorState message="Failed to load audit log." onRetry={refetch} />
        </div>
      ) : !data.length ? (
        <EmptyState
          label={hasFilters ? 'No matching events' : 'No audit events'}
          sub={hasFilters ? 'Try clearing the filters.' : 'Events appear here as work orders are created and updated.'}
          action={hasFilters ? (
            <button className="btn btn-neutral btn-sm" onClick={clearAll}>Clear filters</button>
          ) : undefined}
        />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 155, whiteSpace: 'nowrap' }}>Timestamp</th>
                <th style={{ width: 160 }}>Event</th>
                <th style={{ width: 130 }}>Work Order</th>
                <th style={{ width: 130 }}>Actor</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {data.map(log => {
                const chipClass = EVENT_CHIP[log.event_type] ?? 'audit-chip-triaged'
                const hasChange = log.old_value && log.new_value
                const detail = formatDetail(log)

                return (
                  <tr key={log.id}>
                    {/* Timestamp */}
                    <td>
                      <span className="td-muted" style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                        {formatDateTime(log.created_at)}
                      </span>
                    </td>

                    {/* Event chip */}
                    <td>
                      <span className={`badge ${chipClass}`}>
                        {EVENT_LABEL[log.event_type] ?? log.event_type}
                      </span>
                    </td>

                    {/* Work order link */}
                    <td>
                      {log.work_order_number ? (
                        <span
                          className="audit-wo-link"
                          onClick={() => navigate(`/work-orders/${log.work_order_id}`)}
                        >
                          {log.work_order_number}
                        </span>
                      ) : (
                        <span className="td-muted">—</span>
                      )}
                    </td>

                    {/* Actor */}
                    <td>
                      <span
                        className="td-dim"
                        style={{
                          fontStyle: log.actor === 'agent' || log.actor === 'system' ? 'italic' : 'normal',
                        }}
                      >
                        {log.actor}
                      </span>
                    </td>

                    {/* Detail — prefer old→new for changes, formatted detail otherwise */}
                    <td>
                      {hasChange ? (
                        <span className="audit-change">
                          <span className="audit-old">{log.old_value}</span>
                          <span className="audit-change-arrow">→</span>
                          <span className="audit-new">{log.new_value}</span>
                        </span>
                      ) : detail ? (
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{detail}</span>
                      ) : (
                        <span className="td-muted">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
