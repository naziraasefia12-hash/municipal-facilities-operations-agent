import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBuildings } from '../hooks/useBuildings'
import { useWorkOrders } from '../hooks/useWorkOrders'
import { DataTable, Column } from '../components/ui/DataTable'
import { StatStrip } from '../components/ui/StatStrip'
import { ErrorState } from '../components/ui/ErrorState'
import type { Building } from '../types'

// Extended row type so workload columns are sortable by DataTable
type BuildingRow = Building & {
  _activeWOs: number   // open + in_progress + escalated (not resolved/closed)
  _criticalWOs: number // critical priority, not resolved/closed
}

const COLUMNS: Column<BuildingRow>[] = [
  {
    key: 'building_code', label: 'Code', sortable: true, width: '90px',
    render: r => <span className="td-mono">{r.building_code ?? '—'}</span>,
  },
  {
    key: 'name', label: 'Building Name', sortable: true,
    render: r => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="td-title">{r.name}</span>
        {r._criticalWOs > 0 && (
          <span className="urg-dot critical" title={`${r._criticalWOs} critical WO${r._criticalWOs !== 1 ? 's' : ''}`} />
        )}
      </div>
    ),
  },
  {
    key: 'address', label: 'Address', sortable: false,
    render: r => <span className="td-dim">{r.address ?? '—'}</span>,
  },
  {
    key: 'floors', label: 'Floors', sortable: true, width: '65px',
    render: r => (
      <span className="td-muted" style={{ display: 'block', textAlign: 'center' }}>
        {r.floors ?? '—'}
      </span>
    ),
  },
  {
    key: '_activeWOs', label: 'Active WOs', sortable: true, width: '92px',
    render: r => (
      <span style={{
        fontSize: 12,
        fontWeight: r._activeWOs > 0 ? 600 : 400,
        color: r._activeWOs > 0 ? 'var(--accent)' : 'var(--text-muted)',
      }}>
        {r._activeWOs > 0 ? r._activeWOs : '—'}
      </span>
    ),
  },
  {
    key: '_criticalWOs', label: 'Critical', sortable: true, width: '72px',
    render: r => (
      <span style={{
        fontSize: 12,
        fontWeight: r._criticalWOs > 0 ? 700 : 400,
        color: r._criticalWOs > 0 ? 'var(--p-critical-text)' : 'var(--text-muted)',
      }}>
        {r._criticalWOs > 0 ? r._criticalWOs : '—'}
      </span>
    ),
  },
  {
    key: 'is_active', label: 'Status', width: '72px',
    render: r => (
      <span style={{
        fontSize: 11,
        fontWeight: 500,
        color: r.is_active ? 'var(--p-low-text)' : 'var(--text-muted)',
      }}>
        {r.is_active ? 'Active' : 'Inactive'}
      </span>
    ),
  },
]

export function BuildingsPage() {
  const navigate = useNavigate()
  const { data: buildings, isLoading, error, refetch } = useBuildings()
  const { data: workOrders } = useWorkOrders()

  // Pre-compute workload stats per building so columns are sortable
  const rows = useMemo<BuildingRow[]>(() => {
    return (buildings ?? []).map(b => {
      const bWOs = (workOrders ?? []).filter(
        wo => wo.building_name === b.name &&
          wo.status !== 'resolved' &&
          wo.status !== 'closed'
      )
      return {
        ...b,
        _activeWOs: bWOs.length,
        _criticalWOs: bWOs.filter(wo => wo.priority === 'critical').length,
      }
    })
  }, [buildings, workOrders])

  // Summary stats for the strip
  const totalBuildings = buildings?.length ?? 0
  const buildingsWithWork = rows.filter(r => r._activeWOs > 0).length
  const totalActiveWOs = rows.reduce((s, r) => s + r._activeWOs, 0)
  const totalCritical = rows.reduce((s, r) => s + r._criticalWOs, 0)

  if (error) return <ErrorState message="Failed to load buildings." onRetry={refetch} />

  return (
    <div className="stack">
      {/* Summary strip */}
      <StatStrip cells={[
        { label: 'Total Buildings', value: totalBuildings },
        { label: 'With Active WOs', value: buildingsWithWork },
        { label: 'Total Active WOs', value: totalActiveWOs, variant: totalActiveWOs > 0 ? 'accent' : 'default' },
        { label: 'Critical WOs', value: totalCritical, variant: totalCritical > 0 ? 'danger' : 'default' },
      ]} />

      {/* Buildings table */}
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">
            Municipal Buildings
            <span style={{ marginLeft: 8, color: 'var(--text-muted)', fontWeight: 400 }}>
              ({totalBuildings})
            </span>
          </span>
          <span
            className="panel-action"
            onClick={() => navigate('/work-orders')}
          >
            All work orders →
          </span>
        </div>

        {/* Contextual hint */}
        <div style={{
          padding: '6px var(--sp-4)',
          fontSize: 11,
          color: 'var(--text-muted)',
          background: 'var(--bg-surface-alt)',
          borderBottom: '1px solid var(--border-row)',
        }}>
          Click a building row to view its work orders. Critical dot (●) indicates an active critical priority item.
        </div>

        <DataTable<BuildingRow>
          columns={COLUMNS}
          data={rows}
          getRowId={r => r.id}
          onRowClick={r => navigate(`/work-orders?building_id=${r.id}`)}
          loading={isLoading}
          defaultSortKey="_criticalWOs"
          defaultSortDir="desc"
          emptyMessage="No buildings found."
          getRowClassName={r => r._criticalWOs > 0 ? 'has-critical' : ''}
        />
      </div>
    </div>
  )
}
