import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useWorkOrder, useUpdateStatus, useAssignTeam, useApproveWorkOrder } from '../hooks/useWorkOrders'
import { useTeams } from '../hooks/useTeams'
import { useAuditLog } from '../hooks/useAuditLog'
import { Tabs } from '../components/ui/Tabs'
import { StatusBadge } from '../components/ui/StatusBadge'
import { PriorityBadge } from '../components/ui/PriorityBadge'
import { TriageOutputPanel } from '../components/work-orders/TriageOutputPanel'
import { NoteThread } from '../components/work-orders/NoteThread'
import { LoadingState } from '../components/ui/LoadingState'
import { ErrorState } from '../components/ui/ErrorState'
import { formatDateTime, formatCurrency, isOverdue } from '../utils/formatters'
import { STATUS_TRANSITIONS } from '../utils/constants'

const AUDIT_EVENT_LABELS: Record<string, string> = {
  work_order_created: 'Created',
  triage_completed: 'Triaged',
  status_changed: 'Status changed',
  team_assigned: 'Team assigned',
  escalated: 'Escalated',
  approval_requested: 'Approval requested',
  approved: 'Approved',
}

export function WorkOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const woId = Number(id)
  const [tab, setTab] = useState('overview')
  const [triageOpen, setTriageOpen] = useState(true)
  const [statusVal, setStatusVal] = useState('')
  const [teamVal, setTeamVal] = useState('')
  const [approver, setApprover] = useState('')
  const [showApprove, setShowApprove] = useState(false)

  const { data: wo, isLoading, error, refetch } = useWorkOrder(woId)
  const { data: teams } = useTeams()
  const { data: auditLogs } = useAuditLog({ work_order_id: woId })
  const updateStatus = useUpdateStatus(woId)
  const assignTeam = useAssignTeam(woId)
  const approve = useApproveWorkOrder(woId)

  if (isLoading) return <LoadingState message="Loading work order…" />
  if (error || !wo) return <ErrorState message="Work order not found." onRetry={refetch} />

  const overdue = isOverdue(wo.sla_deadline, wo.status)
  const transitions = STATUS_TRANSITIONS[wo.status] ?? []
  const notes = wo.notes ?? []

  function handleStatusChange() {
    if (!statusVal) return
    updateStatus.mutate({ status: statusVal, actor: 'Facilities Staff' }, {
      onSuccess: () => setStatusVal(''),
    })
  }

  function handleAssign() {
    if (!teamVal) return
    assignTeam.mutate({ assigned_team_id: Number(teamVal), actor: 'Facilities Staff' }, {
      onSuccess: () => setTeamVal(''),
    })
  }

  function handleApprove() {
    if (!approver.trim()) return
    approve.mutate({ approved_by: approver, notes: '' }, {
      onSuccess: () => { setShowApprove(false); setApprover('') },
    })
  }

  return (
    <div className="stack">
      {/* Banner */}
      <div className="wo-banner" style={{ borderRadius: 3, border: '1px solid var(--border)' }}>
        <div style={{ minWidth: 0 }}>
          <div className="wo-banner-meta">
            {wo.order_number} · Submitted by {wo.submitted_by} · {formatDateTime(wo.created_at)}
          </div>
          <div className="wo-banner-title">{wo.title}</div>
          <div className="wo-banner-badges">
            <PriorityBadge priority={wo.priority} />
            <StatusBadge status={wo.status} />
            <span className="badge badge-neutral">{wo.category}</span>
            {wo.requires_approval && !wo.approved_by && (
              <span className="badge badge-pending_approval">Pending Approval</span>
            )}
            {overdue && <span style={{ fontSize: 11, color: 'var(--p-critical-text)', fontWeight: 500 }}>⚠ Overdue</span>}
          </div>
        </div>
        <div className="wo-banner-actions">
          {transitions.length > 0 && (
            <div className="row">
              <select className="filter-bar-select" value={statusVal} onChange={e => setStatusVal(e.target.value)}>
                <option value="">Change status…</option>
                {transitions.map(s => <option key={s} value={s}>{s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
              </select>
              <button className="btn btn-neutral btn-sm" onClick={handleStatusChange} disabled={!statusVal || updateStatus.isPending}>
                {updateStatus.isPending ? '…' : 'Apply'}
              </button>
            </div>
          )}
          {wo.requires_approval && !wo.approved_by && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowApprove(v => !v)}>
              Approve
            </button>
          )}
        </div>
      </div>

      {showApprove && (
        <div className="panel" style={{ padding: 12 }}>
          <div className="row">
            <input className="form-input" value={approver} onChange={e => setApprover(e.target.value)} placeholder="Approving manager name" style={{ maxWidth: 260 }} />
            <button className="btn btn-primary btn-sm" onClick={handleApprove} disabled={!approver.trim() || approve.isPending}>
              {approve.isPending ? 'Approving…' : 'Confirm Approval'}
            </button>
            <button className="btn btn-neutral btn-sm" onClick={() => setShowApprove(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="panel" style={{ overflow: 'hidden' }}>
        <Tabs
          tabs={[
            { id: 'overview', label: 'Overview' },
            { id: 'notes', label: 'Notes', count: notes.length },
            { id: 'audit', label: 'Audit', count: auditLogs?.length },
          ]}
          active={tab}
          onChange={setTab}
        />

        {tab === 'overview' && (
          <div className="wo-detail-grid">
            <div className="wo-detail-main">
              <div className="form-section-title">Request Details</div>
              <div className="field-group">
                <div className="field-label">Description</div>
                <div className="field-value muted" style={{ lineHeight: 1.55 }}>{wo.description}</div>
              </div>
              <div className="field-row">
                <div className="field-group">
                  <div className="field-label">Building</div>
                  <div className="field-value">{wo.building_name ?? '—'}</div>
                </div>
                <div className="field-group">
                  <div className="field-label">Location</div>
                  <div className="field-value muted">{wo.location_details ?? '—'}</div>
                </div>
                <div className="field-group">
                  <div className="field-label">Assigned Team</div>
                  <div className="row">
                    <span className="field-value">{wo.assigned_team_name ?? 'Unassigned'}</span>
                    <select className="filter-bar-select" style={{ fontSize: 11, padding: '2px 6px' }} value={teamVal} onChange={e => setTeamVal(e.target.value)}>
                      <option value="">Reassign…</option>
                      {(teams ?? []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    {teamVal && <button className="btn btn-neutral btn-sm" onClick={handleAssign} disabled={assignTeam.isPending}>Apply</button>}
                  </div>
                </div>
                <div className="field-group">
                  <div className="field-label">Category</div>
                  <div className="field-value">{wo.category}</div>
                </div>
              </div>

              <div className="field-divider" />
              <div className="form-section-title">SLA & Cost</div>
              <div className="field-row">
                <div className="field-group">
                  <div className="field-label">SLA Hours</div>
                  <div className="field-value">{wo.sla_hours ? `${wo.sla_hours}h` : '—'}</div>
                </div>
                <div className="field-group">
                  <div className="field-label">SLA Deadline</div>
                  <div className={`field-value ${overdue ? 'danger' : ''}`}>
                    {wo.sla_deadline ? formatDateTime(wo.sla_deadline) : '—'}
                    {overdue && ' (overdue)'}
                  </div>
                </div>
                <div className="field-group">
                  <div className="field-label">Estimated Cost</div>
                  <div className="field-value">{formatCurrency(wo.estimated_cost)}</div>
                </div>
                <div className="field-group">
                  <div className="field-label">Approval</div>
                  <div className="field-value">
                    {wo.requires_approval
                      ? (wo.approved_by ? `Approved by ${wo.approved_by}` : `Required (${wo.approval_level ?? 'manager'})`)
                      : 'Not required'}
                  </div>
                </div>
              </div>

              <div className="field-divider" />
              {/* Triage section */}
              {wo.triage_result && (
                <>
                  <div className="collapsible-header" onClick={() => setTriageOpen(v => !v)}>
                    <span className="collapsible-title">AI Triage Result</span>
                    <span className={`collapsible-chevron ${triageOpen ? 'open' : ''}`}>▶</span>
                  </div>
                  {triageOpen && (
                    <div className="collapsible-body">
                      <TriageOutputPanel result={wo.triage_result} compact />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Sidebar */}
            <div className="wo-detail-side">
              <div className="field-group">
                <div className="field-label">Order Number</div>
                <div className="field-value mono" style={{ fontSize: 12 }}>{wo.order_number}</div>
              </div>
              <div className="field-group">
                <div className="field-label">Submitted By</div>
                <div className="field-value">{wo.submitted_by}</div>
              </div>
              <div className="field-group">
                <div className="field-label">Created</div>
                <div className="field-value muted" style={{ fontSize: 12 }}>{formatDateTime(wo.created_at)}</div>
              </div>
              <div className="field-group">
                <div className="field-label">Updated</div>
                <div className="field-value muted" style={{ fontSize: 12 }}>{formatDateTime(wo.updated_at)}</div>
              </div>
              {wo.resolved_at && (
                <div className="field-group">
                  <div className="field-label">Resolved</div>
                  <div className="field-value muted" style={{ fontSize: 12 }}>{formatDateTime(wo.resolved_at)}</div>
                </div>
              )}
              <div className="field-divider" />
              <div className="field-group">
                <div className="field-label">Recent Notes</div>
                {notes.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>None</div>
                ) : notes.slice(-2).map(n => (
                  <div key={n.id} style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, lineHeight: 1.4 }}>
                    <span style={{ fontWeight: 600 }}>{n.author}: </span>{n.content}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'notes' && (
          <div style={{ padding: 16 }}>
            <NoteThread workOrderId={woId} notes={notes} />
          </div>
        )}

        {tab === 'audit' && (
          <div style={{ padding: 0, overflowX: 'auto' }}>
            {!auditLogs?.length ? (
              <div className="empty-state">
                <div className="empty-state-label">No audit events</div>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Actor</th>
                    <th>Change</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map(log => (
                    <tr key={log.id}>
                      <td><span className="audit-event-type">{AUDIT_EVENT_LABELS[log.event_type] ?? log.event_type}</span></td>
                      <td className="td-dim">{log.actor}</td>
                      <td>
                        {log.old_value && log.new_value ? (
                          <span className="audit-change">
                            <span className="audit-old">{log.old_value}</span>
                            <span className="audit-change-arrow">→</span>
                            <span className="audit-new">{log.new_value}</span>
                          </span>
                        ) : (
                          <span className="audit-details">{log.details.length > 60 ? log.details.slice(0, 60) + '…' : log.details}</span>
                        )}
                      </td>
                      <td className="td-muted">{formatDateTime(log.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
