import { useNavigate } from 'react-router-dom'
import { useBuildings } from '../hooks/useBuildings'
import { useWorkOrders } from '../hooks/useWorkOrders'
import { DataTable, Column } from '../components/ui/DataTable'
import { ErrorState } from '../components/ui/ErrorState'
import type { Building } from '../types'

export function BuildingsPage() {
  const navigate = useNavigate()
  const { data: buildings, isLoading, error, refetch } = useBuildings()
  const { data: workOrders } = useWorkOrders()

  function openCount(buildingName: string) {
    return workOrders?.filter(wo => wo.building_name === buildingName && wo.status !== 'resolved' && wo.status !== 'closed').length ?? 0
  }

  const COLUMNS: Column<Building>[] = [
    { key: 'building_code', label: 'Code', sortable: true, width: '90px',
      render: r => <span className="td-mono">{r.building_code ?? '—'}</span> },
    { key: 'name', label: 'Building Name', sortable: true,
      render: r => <span className="td-title">{r.name}</span> },
    { key: 'address', label: 'Address', sortable: true,
      render: r => <span className="td-dim">{r.address ?? '—'}</span> },
    { key: 'floors', label: 'Floors', sortable: true, width: '70px',
      render: r => <span className="td-muted">{r.floors ?? '—'}</span> },
    { key: 'open_wo', label: 'Open WOs', sortable: false, width: '100px',
      render: r => {
        const count = openCount(r.name)
        return <span style={{ fontSize: 12, fontWeight: count > 0 ? 600 : 400, color: count > 0 ? 'var(--accent)' : 'var(--text-muted)' }}>{count}</span>
      },
    },
    { key: 'is_active', label: 'Status', width: '80px',
      render: r => <span style={{ fontSize: 11, color: r.is_active ? 'var(--p-low-text)' : 'var(--text-muted)' }}>{r.is_active ? 'Active' : 'Inactive'}</span> },
  ]

  if (error) return <ErrorState message="Failed to load buildings." onRetry={refetch} />

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">Municipal Buildings ({buildings?.length ?? 0})</span>
      </div>
      <DataTable<Building>
        columns={COLUMNS}
        data={buildings ?? []}
        getRowId={r => r.id}
        onRowClick={r => navigate(`/work-orders?building_id=${r.id}`)}
        loading={isLoading}
        defaultSortKey="name"
        emptyMessage="No buildings found."
      />
    </div>
  )
}
