import { useNavigate } from 'react-router-dom'
import { useAnalyticsSummary } from '../hooks/useAnalytics'
import { useWorkOrders } from '../hooks/useWorkOrders'
import { StatStrip } from '../components/ui/StatStrip'
import { DataTable, Column } from '../components/ui/DataTable'
import { StatusBadge } from '../components/ui/StatusBadge'
import { PriorityBadge } from '../components/ui/PriorityBadge'
import { ErrorState } from '../components/ui/ErrorState'
import type { WorkOrderListItem } from '../types'
import { formatRelative, isOverdue } from '../utils/formatters'

const COLUMNS: Column<WorkOrderListItem>[] = [
  { key: 'order_number', label: 'Order #', sortable: true, width: '130px',
    render: r => <span className="td-mono">{r.order_number}</span> },
  { key: 'title', label: 'Title', sortable: true,
    render: r => (
      <span className="td-title td-truncate">
        {(r.priority === 'critical' || r.status === 'escalated') && (
          <span className={`urg-dot ${r.priority}`} style={{ marginRight: 6 }} />
        )}
        {r.title}
      </span>
    ),
  },
  { key: 'building_name', label: 'Building', sortable: true,
    render: r => <span className="td-dim">{r.building_name ?? '—'}</span> },
  { key: 'priority', label: 'Priority', sortable: true, width: '90px',
    render: r => <PriorityBadge priority={r.priority} /> },
  { key: 'status', label: 'Status', sortable: true, width: '130px',
    render: r => <StatusBadge status={r.status} /> },
  { key: 'assigned_team_name', label: 'Team', sortable: true,
    render: r => <span className="td-dim">{r.assigned_team_name ?? '—'}</span> },
  { key: 'created_at', label: 'Submitted', sortable: true, width: '120px',
    render: r => <span className="td-muted">{formatRelative(r.created_at)}</span> },
]

export function DashboardPage() {
  const navigate = useNavigate()
  const { data: summary, isLoading: summaryLoading, error: summaryError, refetch } = useAnalyticsSummary()
  const { data: workOrders, isLoading: woLoading } = useWorkOrders()

  const criticalOpen = workOrders?.filter(
    w => (w.priority === 'critical' || w.status === 'escalated') && w.status !== 'resolved' && w.status !== 'closed'
  ) ?? []

  const recent = workOrders?.slice(0, 10) ?? []

  return (
    <div className="stack">
      {summaryError ? (
        <ErrorState message="Failed to load summary." onRetry={refetch} />
      ) : (
        <StatStrip
          cells={[
            { label: 'Total WOs', value: summaryLoading ? '—' : (summary?.total_work_orders ?? 0) },
            { label: 'Open', value: summaryLoading ? '—' : (summary?.open_work_orders ?? 0) },
            { label: 'In Progress', value: summaryLoading ? '—' : (summary?.in_progress_work_orders ?? 0) },
            { label: 'Critical', value: summaryLoading ? '—' : (summary?.critical_work_orders ?? 0), variant: (summary?.critical_work_orders ?? 0) > 0 ? 'danger' : 'default' },
            { label: 'Overdue', value: summaryLoading ? '—' : (summary?.overdue_work_orders ?? 0), variant: (summary?.overdue_work_orders ?? 0) > 0 ? 'warn' : 'default' },
            { label: 'Pending Approval', value: summaryLoading ? '—' : (summary?.pending_approval_work_orders ?? 0) },
          ]}
        />
      )}

      {criticalOpen.length > 0 && (
        <div className="alert-row critical">
          <span className="alert-row-text">
            {criticalOpen.length} critical or escalated work order{criticalOpen.length !== 1 ? 's' : ''} require{criticalOpen.length === 1 ? 's' : ''} immediate attention
          </span>
          <span className="alert-row-link" onClick={() => navigate('/work-orders?priority=critical')}>
            View critical →
          </span>
        </div>
      )}

      {(summary?.overdue_work_orders ?? 0) > 0 && criticalOpen.length === 0 && (
        <div className="alert-row warn">
          <span className="alert-row-text">
            {summary?.overdue_work_orders} work order{summary!.overdue_work_orders !== 1 ? 's have' : ' has'} passed SLA deadline
          </span>
          <span className="alert-row-link" onClick={() => navigate('/work-orders')}>
            Review →
          </span>
        </div>
      )}

      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Recent Work Orders</span>
          <span className="panel-action" onClick={() => navigate('/work-orders')}>View all →</span>
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
          getRowClassName={r => isOverdue(r.sla_deadline, r.status) ? 'overdue-row' : ''}
        />
      </div>
    </div>
  )
}
