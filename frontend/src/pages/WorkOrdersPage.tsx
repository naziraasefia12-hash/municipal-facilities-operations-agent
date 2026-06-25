import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkOrders } from '../hooks/useWorkOrders'
import { useBuildings } from '../hooks/useBuildings'
import { useTeams } from '../hooks/useTeams'
import { DataTable, Column } from '../components/ui/DataTable'
import { FilterBar } from '../components/ui/FilterBar'
import { StatusBadge } from '../components/ui/StatusBadge'
import { PriorityBadge } from '../components/ui/PriorityBadge'
import { ErrorState } from '../components/ui/ErrorState'
import type { WorkOrderListItem, WorkOrderFilters } from '../types'
import { formatRelative, isOverdue } from '../utils/formatters'
import { CATEGORIES, STATUSES, PRIORITIES } from '../utils/constants'

const COLUMNS: Column<WorkOrderListItem>[] = [
  { key: 'order_number', label: 'Order #', sortable: true, width: '130px',
    render: r => <span className="td-mono">{r.order_number}</span> },
  { key: 'title', label: 'Title', sortable: true,
    render: r => (
      <span className="td-title td-truncate" style={{ maxWidth: 300 }}>
        {(r.priority === 'critical' || r.status === 'escalated') && (
          <span className={`urg-dot ${r.priority}`} style={{ marginRight: 6 }} />
        )}
        {r.title}
      </span>
    ),
  },
  { key: 'building_name', label: 'Building', sortable: true,
    render: r => <span className="td-dim">{r.building_name ?? '—'}</span> },
  { key: 'category', label: 'Category', sortable: true, width: '110px',
    render: r => <span className="badge badge-neutral">{r.category}</span> },
  { key: 'priority', label: 'Priority', sortable: true, width: '90px',
    render: r => <PriorityBadge priority={r.priority} /> },
  { key: 'status', label: 'Status', sortable: true, width: '130px',
    render: r => <StatusBadge status={r.status} /> },
  { key: 'assigned_team_name', label: 'Team', sortable: true,
    render: r => <span className="td-dim">{r.assigned_team_name ?? 'Unassigned'}</span> },
  { key: 'sla_deadline', label: 'SLA', sortable: true, width: '120px',
    render: r => {
      const overdue = isOverdue(r.sla_deadline, r.status)
      return (
        <span style={{ color: overdue ? 'var(--p-critical-text)' : 'var(--text-muted)', fontSize: 12 }}>
          {r.sla_deadline ? (overdue ? '⚠ Overdue' : formatRelative(r.sla_deadline)) : '—'}
        </span>
      )
    },
  },
  { key: 'created_at', label: 'Submitted', sortable: true, width: '110px',
    render: r => <span className="td-muted">{formatRelative(r.created_at)}</span> },
]

export function WorkOrdersPage() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<WorkOrderFilters>({})
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const activeFilters = { ...filters, search: search || undefined }
  const { data, isLoading, error, refetch } = useWorkOrders(activeFilters)
  const { data: buildings } = useBuildings()
  const { data: teams } = useTeams()

  function handleFilterChange(key: string, value: string) {
    setFilters(prev => ({ ...prev, [key]: value || undefined }))
  }

  function clearFilters() {
    setFilters({})
    setSearch('')
  }

  const filterConfigs = [
    { key: 'status', label: 'Status', options: STATUSES.map(s => ({ label: s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()), value: s })) },
    { key: 'priority', label: 'Priority', options: PRIORITIES.map(p => ({ label: p.charAt(0).toUpperCase()+p.slice(1), value: p })) },
    { key: 'category', label: 'Category', options: CATEGORIES.map(c => ({ label: c, value: c })) },
    { key: 'building_id', label: 'Building', options: (buildings ?? []).map(b => ({ label: b.name, value: String(b.id) })) },
    { key: 'team_id', label: 'Team', options: (teams ?? []).map(t => ({ label: t.name, value: String(t.id) })) },
  ]

  return (
    <div className="panel" style={{ overflow: 'hidden' }}>
      <div className="panel-header">
        <span className="panel-title">
          Work Orders
          {data && <span style={{ marginLeft: 8, color: 'var(--text-muted)', fontWeight: 400 }}>({data.length})</span>}
        </span>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/work-orders/new')}>
          + New
        </button>
      </div>

      <FilterBar
        filters={filterConfigs}
        values={filters as Record<string, string>}
        onChange={handleFilterChange}
        search={{ value: search, onChange: setSearch, placeholder: 'Search title or description…' }}
        onClear={clearFilters}
      />

      {error ? (
        <div style={{ padding: 16 }}>
          <ErrorState message="Failed to load work orders." onRetry={refetch} />
        </div>
      ) : (
        <DataTable<WorkOrderListItem>
          columns={COLUMNS}
          data={data ?? []}
          getRowId={r => r.id}
          onRowClick={r => { setSelectedId(r.id); navigate(`/work-orders/${r.id}`) }}
          selectedId={selectedId}
          loading={isLoading}
          defaultSortKey="created_at"
          defaultSortDir="desc"
          emptyMessage="No work orders match the current filters."
        />
      )}
    </div>
  )
}
