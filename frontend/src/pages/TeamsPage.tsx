import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTeams } from '../hooks/useTeams'
import { useWorkOrders } from '../hooks/useWorkOrders'
import { DataTable, Column } from '../components/ui/DataTable'
import { StatStrip } from '../components/ui/StatStrip'
import { ErrorState } from '../components/ui/ErrorState'
import type { Team } from '../types'

// Extended row so workload columns are sortable
type TeamRow = Team & {
  _open: number
  _inProgress: number
  _critical: number
}

function DispatchStatus({ open, inProgress, critical }: { open: number; inProgress: number; critical: number }) {
  if (critical > 0) {
    return <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--p-critical-text)' }}>Alert</span>
  }
  if (open + inProgress > 0) {
    return <span style={{ fontSize: 11, color: 'var(--accent)' }}>Active</span>
  }
  return <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Idle</span>
}

const COLUMNS: Column<TeamRow>[] = [
  {
    key: 'team_code', label: 'Code', sortable: true, width: '75px',
    render: r => <span className="td-mono">{r.team_code ?? '—'}</span>,
  },
  {
    key: 'name', label: 'Team', sortable: true,
    render: r => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {r._critical > 0 && <span className="urg-dot critical" />}
        <span className="td-title">{r.name}</span>
      </div>
    ),
  },
  {
    key: 'specialty', label: 'Specialty', sortable: false,
    render: r => <span className="td-dim" style={{ fontSize: 12 }}>{r.specialty ?? '—'}</span>,
  },
  {
    key: '_open', label: 'Open', sortable: true, width: '58px',
    render: r => (
      <span style={{
        fontSize: 12,
        fontWeight: r._open > 0 ? 600 : 400,
        color: r._open > 0 ? 'var(--accent)' : 'var(--text-muted)',
        display: 'block', textAlign: 'center',
      }}>
        {r._open}
      </span>
    ),
  },
  {
    key: '_inProgress', label: 'In Prog', sortable: true, width: '68px',
    render: r => (
      <span style={{
        fontSize: 12,
        fontWeight: r._inProgress > 0 ? 600 : 400,
        color: r._inProgress > 0 ? 'var(--s-inprogress-text)' : 'var(--text-muted)',
        display: 'block', textAlign: 'center',
      }}>
        {r._inProgress}
      </span>
    ),
  },
  {
    key: '_critical', label: 'Critical', sortable: true, width: '70px',
    render: r => (
      <span style={{
        fontSize: 12,
        fontWeight: r._critical > 0 ? 700 : 400,
        color: r._critical > 0 ? 'var(--p-critical-text)' : 'var(--text-muted)',
        display: 'block', textAlign: 'center',
      }}>
        {r._critical > 0 ? r._critical : '—'}
      </span>
    ),
  },
  {
    key: 'dispatch_status', label: 'Status', sortable: false, width: '65px',
    render: r => (
      <DispatchStatus open={r._open} inProgress={r._inProgress} critical={r._critical} />
    ),
  },
  {
    key: 'contact_email', label: 'Contact', sortable: false,
    render: r => r.contact_email ? (
      <a
        href={`mailto:${r.contact_email}`}
        style={{ fontSize: 12, color: 'var(--accent)' }}
        onClick={e => e.stopPropagation()}
      >
        {r.contact_email}
      </a>
    ) : <span className="td-muted">—</span>,
  },
]

export function TeamsPage() {
  const navigate = useNavigate()
  const { data: teams, isLoading, error, refetch } = useTeams()
  const { data: workOrders } = useWorkOrders()

  // Pre-compute workload stats per team — computed once, not per-cell per-render
  const rows = useMemo<TeamRow[]>(() => {
    return (teams ?? []).map(t => {
      const tWOs = (workOrders ?? []).filter(wo => wo.assigned_team_name === t.name)
      return {
        ...t,
        _open: tWOs.filter(wo => wo.status === 'open').length,
        _inProgress: tWOs.filter(wo => wo.status === 'in_progress').length,
        _critical: tWOs.filter(
          wo => wo.priority === 'critical' &&
            wo.status !== 'resolved' &&
            wo.status !== 'closed'
        ).length,
      }
    })
  }, [teams, workOrders])

  // Summary stats for the strip
  const totalTeams = teams?.length ?? 0
  const teamsWithWork = rows.filter(r => r._open + r._inProgress > 0).length
  const teamsOnAlert = rows.filter(r => r._critical > 0).length
  const totalOpen = rows.reduce((s, r) => s + r._open, 0)
  const totalCritical = rows.reduce((s, r) => s + r._critical, 0)

  if (error) return <ErrorState message="Failed to load teams." onRetry={refetch} />

  return (
    <div className="stack">
      {/* Summary strip */}
      <StatStrip cells={[
        { label: 'Total Teams', value: totalTeams },
        { label: 'Teams with Work', value: teamsWithWork },
        { label: 'Teams on Alert', value: teamsOnAlert, variant: teamsOnAlert > 0 ? 'danger' : 'default' },
        { label: 'Total Open WOs', value: totalOpen, variant: totalOpen > 0 ? 'accent' : 'default' },
        { label: 'Critical WOs', value: totalCritical, variant: totalCritical > 0 ? 'danger' : 'default' },
      ]} />

      {/* Teams table */}
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">
            Maintenance Teams
            <span style={{ marginLeft: 8, color: 'var(--text-muted)', fontWeight: 400 }}>
              ({totalTeams})
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
          Click a team row to view its assigned work orders. Alert indicates at least one critical priority item.
        </div>

        <DataTable<TeamRow>
          columns={COLUMNS}
          data={rows}
          getRowId={r => r.id}
          onRowClick={r => navigate(`/work-orders?team_id=${r.id}`)}
          loading={isLoading}
          defaultSortKey="_critical"
          defaultSortDir="desc"
          emptyMessage="No teams found."
          getRowClassName={r => r._critical > 0 ? 'has-critical' : ''}
        />
      </div>
    </div>
  )
}
