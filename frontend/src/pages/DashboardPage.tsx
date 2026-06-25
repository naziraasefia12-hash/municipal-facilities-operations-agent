import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAnalyticsSummary, useAnalyticsOverview } from '../hooks/useAnalytics'
import { useWorkOrders } from '../hooks/useWorkOrders'
import { useAuditLog } from '../hooks/useAuditLog'
import { StatStrip } from '../components/ui/StatStrip'
import { DataTable, Column } from '../components/ui/DataTable'
import { StatusBadge } from '../components/ui/StatusBadge'
import { PriorityBadge } from '../components/ui/PriorityBadge'
import { ErrorState } from '../components/ui/ErrorState'
import type { WorkOrderListItem } from '../types'
import { formatRelative, isOverdue } from '../utils/formatters'

// Audit event labels reused from audit log page
const AUDIT_LABEL: Record<string, string> = {
  work_order_created: 'Created',
  triage_completed: 'Triaged',
  status_changed: 'Status changed',
  team_assigned: 'Team assigned',
  escalated: 'Escalated',
  approval_requested: 'Approval requested',
  approved: 'Approved',
}

const COLUMNS: Column<WorkOrderListItem>[] = [
  {
    key: 'order_number', label: 'Order #', sortable: true, width: '130px',
    render: r => <span className="td-mono">{r.order_number}</span>,
  },
  {
    key: 'title', label: 'Title', sortable: true,
    render: r => (
      <span className="td-title td-truncate">
        {(r.priority === 'critical' || r.status === 'escalated') && (
          <span className={`urg-dot ${r.priority}`} style={{ marginRight: 6 }} />
        )}
        {r.title}
      </span>
    ),
  },
  {
    key: 'building_name', label: 'Building', sortable: true,
    render: r => <span className="td-dim">{r.building_name ?? '—'}</span>,
  },
  {
    key: 'priority', label: 'Priority', sortable: true, width: '90px',
    render: r => <PriorityBadge priority={r.priority} />,
  },
  {
    key: 'status', label: 'Status', sortable: true, width: '130px',
    render: r => <StatusBadge status={r.status} />,
  },
  {
    key: 'assigned_team_name', label: 'Team', sortable: true,
    render: r => <span className="td-dim">{r.assigned_team_name ?? '—'}</span>,
  },
  {
    key: 'created_at', label: 'Submitted', sortable: true, width: '120px',
    render: r => <span className="td-muted">{formatRelative(r.created_at)}</span>,
  },
]

export function DashboardPage() {
  const navigate = useNavigate()
  // Captured at mount — shows when this view last pulled fresh data
  const [lastSync] = useState(() =>
    new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  )

  const { data: summary, isLoading: summaryLoading, error: summaryError, refetch } = useAnalyticsSummary()
  const { data: analytics } = useAnalyticsOverview()
  const { data: workOrders, isLoading: woLoading } = useWorkOrders()
  const { data: auditLogs } = useAuditLog()

  // ── Derived data ──────────────────────────────────────────────────────────
  const criticalQueue = (workOrders ?? [])
    .filter(w =>
      (w.priority === 'critical' || w.status === 'escalated') &&
      w.status !== 'resolved' && w.status !== 'closed'
    )
    .slice(0, 5)

  const recent = (workOrders ?? []).slice(0, 10)

  // Teams with at least one active work order, sorted by critical desc then open desc
  const activeTeams = (analytics?.by_team ?? [])
    .filter(t => t.open_count + t.in_progress_count + t.critical_count > 0)
    .sort((a, b) =>
      b.critical_count - a.critical_count || b.open_count - a.open_count
    )

  // Agent-produced events only (triage, escalations, approvals)
  const agentActivity = (auditLogs ?? [])
    .filter(e =>
      ['triage_completed', 'escalated', 'work_order_created', 'approved', 'approval_requested']
        .includes(e.event_type)
    )
    .slice(0, 8)

  const criticalCount = summary?.critical_work_orders ?? 0
  const overdueCount = summary?.overdue_work_orders ?? 0
  const pendingCount = summary?.pending_approval_work_orders ?? 0

  return (
    <div className="stack">

      {/* ── Agent status bar ──────────────────────────────────────────── */}
      <div className="dashboard-status-bar">
        <span className="status-indicator">
          <span className="status-dot" />
          Agent online
        </span>
        <span>Last sync: {lastSync}</span>
      </div>

      {/* ── Stats strip ───────────────────────────────────────────────── */}
      {summaryError ? (
        <ErrorState message="Failed to load summary." onRetry={refetch} />
      ) : (
        <StatStrip
          cells={[
            {
              label: 'Total WOs',
              value: summaryLoading ? '—' : (summary?.total_work_orders ?? 0),
            },
            {
              label: 'Open',
              value: summaryLoading ? '—' : (summary?.open_work_orders ?? 0),
            },
            {
              label: 'In Progress',
              value: summaryLoading ? '—' : (summary?.in_progress_work_orders ?? 0),
            },
            {
              label: 'Critical',
              value: summaryLoading ? '—' : criticalCount,
              variant: criticalCount > 0 ? 'danger' : 'default',
              onClick: criticalCount > 0 ? () => navigate('/work-orders?priority=critical') : undefined,
            },
            {
              label: 'Overdue',
              value: summaryLoading ? '—' : overdueCount,
              variant: overdueCount > 0 ? 'warn' : 'default',
              onClick: overdueCount > 0 ? () => navigate('/work-orders') : undefined,
            },
            {
              label: 'Pending Approval',
              value: summaryLoading ? '—' : pendingCount,
              onClick: pendingCount > 0 ? () => navigate('/work-orders?status=pending_approval') : undefined,
            },
          ]}
        />
      )}

      {/* ── Alert rows — show all relevant states simultaneously ──────── */}
      {criticalQueue.length > 0 && (
        <div className="alert-row critical">
          <span className="alert-row-text">
            <strong>{criticalQueue.length}</strong>{' '}
            critical or escalated work order{criticalQueue.length !== 1 ? 's' : ''}{' '}
            require{criticalQueue.length === 1 ? 's' : ''} immediate response
          </span>
          <span
            className="alert-row-link"
            onClick={() => navigate('/work-orders?priority=critical')}
          >
            View queue →
          </span>
        </div>
      )}

      {overdueCount > 0 && (
        <div className="alert-row warn">
          <span className="alert-row-text">
            <strong>{overdueCount}</strong>{' '}
            work order{overdueCount !== 1 ? 's have' : ' has'} passed SLA deadline
          </span>
          <span className="alert-row-link" onClick={() => navigate('/work-orders')}>
            Review →
          </span>
        </div>
      )}

      {pendingCount > 0 && (
        <div className="alert-row info">
          <span className="alert-row-text">
            <strong>{pendingCount}</strong>{' '}
            work order{pendingCount !== 1 ? 's are' : ' is'} awaiting manager approval
          </span>
          <span
            className="alert-row-link"
            onClick={() => navigate('/work-orders?status=pending_approval')}
          >
            Review →
          </span>
        </div>
      )}

      {/* ── Recent Work Orders ────────────────────────────────────────── */}
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Recent Work Orders</span>
          <span className="panel-action" onClick={() => navigate('/work-orders')}>
            View all →
          </span>
        </div>
        <DataTable<WorkOrderListItem>
          columns={COLUMNS}
          data={recent}
          getRowId={r => r.id}
          onRowClick={r => navigate(`/work-orders/${r.id}`)}
          loading={woLoading}
          defaultSortKey="created_at"
          defaultSortDir="desc"
          emptyMessage="No work orders yet. Submit the first one."
          getRowClassName={r =>
            isOverdue(r.sla_deadline, r.status) ? 'sla-overdue' : ''
          }
        />
      </div>

      {/* ── Bottom 3-panel grid ───────────────────────────────────────── */}
      <div className="dashboard-bottom-grid">

        {/* Critical & Escalated Queue */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Critical & Escalated Queue</span>
            {criticalQueue.length > 0 && (
              <span
                className="panel-action"
                onClick={() => navigate('/work-orders?priority=critical')}
              >
                All →
              </span>
            )}
          </div>
          <div className="panel-body">
            {criticalQueue.length === 0 ? (
              <div className="empty-state" style={{ padding: 'var(--sp-5) 0' }}>
                <div className="empty-state-label" style={{ color: 'var(--p-low-text)' }}>
                  No critical items
                </div>
                <div className="empty-state-sub">All open orders within normal priority</div>
              </div>
            ) : (
              criticalQueue.map(wo => (
                <div
                  key={wo.id}
                  className="critical-row"
                  onClick={() => navigate(`/work-orders/${wo.id}`)}
                >
                  <span className={`urg-dot ${wo.priority}`} />
                  <div className="critical-row-info">
                    <div className="critical-row-title">{wo.title}</div>
                    <div className="critical-row-meta">
                      {wo.building_name ?? '—'} · {wo.order_number}
                    </div>
                  </div>
                  <div className="critical-row-badges">
                    <PriorityBadge priority={wo.priority} />
                    <StatusBadge status={wo.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Team Workload */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Team Workload</span>
            <span className="panel-action" onClick={() => navigate('/teams')}>Details →</span>
          </div>
          <div className="panel-body">
            {activeTeams.length === 0 ? (
              <div className="empty-state" style={{ padding: 'var(--sp-5) 0' }}>
                <div className="empty-state-label">All teams idle</div>
                <div className="empty-state-sub">No open work orders assigned</div>
              </div>
            ) : (
              <>
                {/* Column headers */}
                <div style={{ display: 'flex', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ flex: 1, fontSize: 10, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Team
                  </div>
                  <span className="team-col-header">Open</span>
                  <span className="team-col-header">Busy</span>
                  <span className="team-col-header">Crit</span>
                </div>
                {activeTeams.map(t => (
                  <div
                    key={t.team_name}
                    className="team-row"
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate('/work-orders?team_id=' + encodeURIComponent(t.team_name))}
                  >
                    <div className="team-row-name">{t.team_name}</div>
                    <span className={`team-count-cell ${t.open_count === 0 ? 'zero' : 'open-col'}`}>
                      {t.open_count}
                    </span>
                    <span className={`team-count-cell ${t.in_progress_count === 0 ? 'zero' : 'busy-col'}`}>
                      {t.in_progress_count}
                    </span>
                    <span className={`team-count-cell ${t.critical_count === 0 ? 'zero' : 'crit-col'}`}>
                      {t.critical_count}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Recent Agent Activity */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Recent Agent Activity</span>
            <span className="panel-action" onClick={() => navigate('/audit-log')}>Full log →</span>
          </div>
          <div className="panel-body">
            {agentActivity.length === 0 ? (
              <div className="empty-state" style={{ padding: 'var(--sp-5) 0' }}>
                <div className="empty-state-label">No recent activity</div>
                <div className="empty-state-sub">Agent events appear here after submissions</div>
              </div>
            ) : (
              agentActivity.map(log => (
                <div key={log.id} className="audit-mini-row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span className="audit-mini-event">
                        {AUDIT_LABEL[log.event_type] ?? log.event_type}
                      </span>
                      {log.work_order_number && (
                        <span
                          className="audit-mini-ref"
                          onClick={e => {
                            e.stopPropagation()
                            if (log.work_order_id) navigate(`/work-orders/${log.work_order_id}`)
                          }}
                        >
                          {log.work_order_number}
                        </span>
                      )}
                    </div>
                    <div className="audit-mini-sub">
                      {log.actor} · {formatRelative(log.created_at)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
