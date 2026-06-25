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

function statusLabel(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
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
  const canApprove = wo.requires_approval && !wo.approved_by

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

      {/* ── Banner + Action bar in one panel ─────────────────────────── */}
      <div className="panel" style={{ overflow: 'hidden' }}>

        {/* Banner */}
        <div style={{ padding: '12px 16px 12px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{wo.order_number}</span>
            {' · '}Submitted by {wo.submitted_by}
            {' · '}{formatDateTime(wo.created_at)}
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: 8 }}>
            {wo.title}
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
            <PriorityBadge priority={wo.priority} />
            <StatusBadge status={wo.status} />
            <span className="badge badge-neutral">{wo.category}</span>
            {canApprove && <span className="badge badge-pending_approval">Pending Approval</span>}
            {wo.approved_by && (
              <span style={{ fontSize: 11, color: 'var(--p-low-text)', fontWeight: 500 }}>
                Approved by {wo.approved_by}
              </span>
            )}
            {overdue && (
              <span style={{ fontSize: 11, color: 'var(--p-critical-text)', fontWeight: 600 }}>
                SLA Overdue
              </span>
            )}
          </div>
        </div>

        {/* Action bar — separated from banner content */}
        <div className="wo-action-bar">
          {transitions.length > 0 && (
            <div className="wo-action-group">
              <span className="wo-action-group-label">Status</span>
              <select
                className="filter-bar-select"
                value={statusVal}
                onChange={e => setStatusVal(e.target.value)}
              >
                <option value="">Change to…</option>
                {transitions.map(s => (
                  <option key={s} value={s}>{statusLabel(s)}</option>
                ))}
              </select>
              <button
                className="btn btn-neutral btn-sm"
                onClick={handleStatusChange}
                disabled={!statusVal || updateStatus.isPending}
              >
                {updateStatus.isPending ? '…' : 'Apply'}
              </button>
            </div>
          )}

          <div className="wo-action-group">
            <span className="wo-action-group-label">Team</span>
            <select
              className="filter-bar-select"
              value={teamVal}
              onChange={e => setTeamVal(e.target.value)}
            >
              <option value="">
                {wo.assigned_team_name ? `${wo.assigned_team_name} (reassign…)` : 'Assign team…'}
              </option>
              {(teams ?? []).map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {teamVal && (
              <button
                className="btn btn-neutral btn-sm"
                onClick={handleAssign}
                disabled={assignTeam.isPending}
              >
                {assignTeam.isPending ? '…' : 'Apply'}
              </button>
            )}
          </div>

          {canApprove && (
            <div className="wo-action-group">
              <button
                className={`btn btn-sm ${showApprove ? 'btn-neutral' : 'btn-primary'}`}
                onClick={() => setShowApprove(v => !v)}
              >
                {showApprove ? 'Cancel' : 'Approve Work Order'}
              </button>
            </div>
          )}
        </div>

        {/* Inline approval form */}
        {showApprove && (
          <div className="wo-approve-form">
            <span className="wo-approve-form-label">Approving manager name:</span>
            <input
              className="form-input"
              value={approver}
              onChange={e => setApprover(e.target.value)}
              placeholder="Full name"
              style={{ maxWidth: 220 }}
            />
            <button
              className="btn btn-primary btn-sm"
              onClick={handleApprove}
              disabled={!approver.trim() || approve.isPending}
            >
              {approve.isPending ? 'Saving…' : 'Confirm Approval'}
            </button>
          </div>
        )}
      </div>

      {/* ── Tabs + content ────────────────────────────────────────────── */}
      <div className="panel" style={{ overflow: 'hidden' }}>
        <Tabs
          tabs={[
            { id: 'overview', label: 'Overview' },
            { id: 'notes', label: 'Notes', count: notes.length },
            { id: 'audit', label: 'Audit History', count: auditLogs?.length },
          ]}
          active={tab}
          onChange={setTab}
        />

        {/* ── Overview tab ─────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="wo-detail-grid">

            {/* Main content */}
            <div className="wo-detail-main">

              {/* Description */}
              <div className="form-section-title" style={{ marginTop: 0 }}>Request</div>
              <div className="field-group">
                <div className="field-label">Description</div>
                <div className="field-value muted" style={{ lineHeight: 1.6 }}>
                  {wo.description}
                </div>
              </div>

              <div className="field-row" style={{ marginTop: 'var(--sp-3)' }}>
                <div className="field-group">
                  <div className="field-label">Building</div>
                  <div className="field-value">{wo.building_name ?? '—'}</div>
                </div>
                <div className="field-group">
                  <div className="field-label">Location</div>
                  <div className="field-value muted">{wo.location_details ?? '—'}</div>
                </div>
                <div className="field-group">
                  <div className="field-label">Category</div>
                  <div className="field-value">{wo.category}</div>
                </div>
                <div className="field-group">
                  <div className="field-label">Assigned Team</div>
                  <div className="field-value">{wo.assigned_team_name ?? 'Unassigned'}</div>
                </div>
              </div>

              {/* SLA & Cost */}
              <div className="field-divider" />
              <div className="form-section-title">SLA & Cost</div>
              <div className="field-row">
                <div className="field-group">
                  <div className="field-label">SLA Target</div>
                  <div className="field-value">{wo.sla_hours ? `${wo.sla_hours}h` : '—'}</div>
                </div>
                <div className="field-group">
                  <div className="field-label">Deadline</div>
                  <div className={`field-value ${overdue ? 'danger' : ''}`}>
                    {wo.sla_deadline ? formatDateTime(wo.sla_deadline) : '—'}
                    {overdue && <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 600 }}>OVERDUE</span>}
                  </div>
                </div>
                <div className="field-group">
                  <div className="field-label">Estimated Cost</div>
                  <div className="field-value">{formatCurrency(wo.estimated_cost)}</div>
                </div>
                <div className="field-group">
                  <div className="field-label">Approval</div>
                  <div className="field-value" style={{ color: canApprove ? 'var(--s-pending-text)' : 'inherit' }}>
                    {!wo.requires_approval
                      ? 'Not required'
                      : wo.approved_by
                        ? `Approved — ${wo.approved_by}`
                        : `Required (${wo.approval_level ?? 'manager'})`}
                  </div>
                </div>
                {wo.resolved_at && (
                  <div className="field-group">
                    <div className="field-label">Resolved</div>
                    <div className="field-value muted">{formatDateTime(wo.resolved_at)}</div>
                  </div>
                )}
              </div>

              {/* AI Triage Result */}
              {wo.triage_result && (
                <>
                  <div className="field-divider" />
                  <div
                    className="collapsible-header"
                    onClick={() => setTriageOpen(v => !v)}
                    style={{ marginBottom: triageOpen ? 8 : 0 }}
                  >
                    <span className="collapsible-title">AI Triage Result</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        {wo.triage_result.agent_mode === 'gemini' ? 'Gemini AI' : 'Rule-based'}
                      </span>
                      <span className={`collapsible-chevron ${triageOpen ? 'open' : ''}`}>▶</span>
                    </div>
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

              {/* Record section */}
              <div className="side-section">
                <div className="side-section-label">Record</div>
                <div className="side-field">
                  <div className="side-field-label">Order Number</div>
                  <div className="side-field-value mono">{wo.order_number}</div>
                </div>
                <div className="side-field">
                  <div className="side-field-label">Submitted By</div>
                  <div className="side-field-value">{wo.submitted_by}</div>
                </div>
                <div className="side-field">
                  <div className="side-field-label">Created</div>
                  <div className="side-field-value muted">{formatDateTime(wo.created_at)}</div>
                </div>
                <div className="side-field">
                  <div className="side-field-label">Last Updated</div>
                  <div className="side-field-value muted">{formatDateTime(wo.updated_at)}</div>
                </div>
                {wo.approved_at && (
                  <div className="side-field">
                    <div className="side-field-label">Approved</div>
                    <div className="side-field-value muted">{formatDateTime(wo.approved_at)}</div>
                  </div>
                )}
              </div>

              {/* SLA snapshot */}
              <div className="side-section">
                <div className="side-section-label">SLA Status</div>
                <div className="side-field">
                  <div className="side-field-label">Priority</div>
                  <div className="side-field-value">
                    <PriorityBadge priority={wo.priority} />
                  </div>
                </div>
                <div className="side-field">
                  <div className="side-field-label">Deadline</div>
                  <div className={`side-field-value ${overdue ? 'danger' : 'muted'}`}>
                    {wo.sla_deadline ? formatDateTime(wo.sla_deadline) : '—'}
                  </div>
                </div>
                {wo.estimated_cost != null && (
                  <div className="side-field">
                    <div className="side-field-label">Est. Cost</div>
                    <div className="side-field-value">{formatCurrency(wo.estimated_cost)}</div>
                  </div>
                )}
              </div>

              {/* Recent notes */}
              {notes.length > 0 && (
                <div className="side-section">
                  <div className="side-section-label">
                    Recent Notes
                    {notes.length > 2 && (
                      <span
                        style={{ marginLeft: 6, fontWeight: 400, color: 'var(--accent)', cursor: 'pointer', textTransform: 'none', letterSpacing: 0 }}
                        onClick={() => setTab('notes')}
                      >
                        · View all {notes.length}
                      </span>
                    )}
                  </div>
                  {notes.slice(-2).map(n => (
                    <div key={n.id} style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 1 }}>
                        {n.author}
                        <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>
                          {n.note_type}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                        {n.content.length > 80 ? n.content.slice(0, 80) + '…' : n.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Notes tab ────────────────────────────────────────────────── */}
        {tab === 'notes' && (
          <div style={{ padding: 16 }}>
            <NoteThread workOrderId={woId} notes={notes} />
          </div>
        )}

        {/* ── Audit History tab ─────────────────────────────────────────── */}
        {tab === 'audit' && (
          <div style={{ overflowX: 'auto' }}>
            {!auditLogs?.length ? (
              <div className="empty-state">
                <div className="empty-state-label">No audit events</div>
                <div className="empty-state-sub">Events appear here as the work order progresses.</div>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 150 }}>Timestamp</th>
                    <th style={{ width: 150 }}>Event</th>
                    <th style={{ width: 130 }}>Actor</th>
                    <th>Change / Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map(log => (
                    <tr key={log.id}>
                      <td className="td-muted" style={{ whiteSpace: 'nowrap' }}>
                        {formatDateTime(log.created_at)}
                      </td>
                      <td>
                        <span className="audit-event-type">
                          {AUDIT_EVENT_LABELS[log.event_type] ?? log.event_type}
                        </span>
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
                            {log.details.length > 80 ? log.details.slice(0, 80) + '…' : log.details}
                          </span>
                        )}
                      </td>
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
