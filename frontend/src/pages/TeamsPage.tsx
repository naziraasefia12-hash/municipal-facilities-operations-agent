import { useNavigate } from 'react-router-dom'
import { useTeams } from '../hooks/useTeams'
import { useWorkOrders } from '../hooks/useWorkOrders'
import { DataTable, Column } from '../components/ui/DataTable'
import { ErrorState } from '../components/ui/ErrorState'
import type { Team } from '../types'

export function TeamsPage() {
  const navigate = useNavigate()
  const { data: teams, isLoading, error, refetch } = useTeams()
  const { data: workOrders } = useWorkOrders()

  function teamCounts(teamName: string) {
    const teamWOs = workOrders?.filter(wo => wo.assigned_team_name === teamName) ?? []
    return {
      open: teamWOs.filter(wo => wo.status === 'open').length,
      inProgress: teamWOs.filter(wo => wo.status === 'in_progress').length,
      critical: teamWOs.filter(wo => wo.priority === 'critical' && wo.status !== 'resolved' && wo.status !== 'closed').length,
    }
  }

  const COLUMNS: Column<Team>[] = [
    { key: 'team_code', label: 'Code', sortable: true, width: '80px',
      render: r => <span className="td-mono">{r.team_code ?? '—'}</span> },
    { key: 'name', label: 'Team Name', sortable: true,
      render: r => <span className="td-title">{r.name}</span> },
    { key: 'specialty', label: 'Specialty', sortable: true,
      render: r => <span className="td-dim">{r.specialty ?? '—'}</span> },
    { key: 'contact_email', label: 'Contact', sortable: false,
      render: r => <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.contact_email ?? '—'}</span> },
    { key: 'open', label: 'Open', sortable: false, width: '65px',
      render: r => { const c = teamCounts(r.name); return <span style={{ fontSize: 12, color: c.open > 0 ? 'var(--accent)' : 'var(--text-muted)' }}>{c.open}</span> } },
    { key: 'in_progress', label: 'In Progress', sortable: false, width: '90px',
      render: r => { const c = teamCounts(r.name); return <span style={{ fontSize: 12, color: c.inProgress > 0 ? 'var(--s-inprogress-text)' : 'var(--text-muted)' }}>{c.inProgress}</span> } },
    { key: 'critical', label: 'Critical', sortable: false, width: '75px',
      render: r => { const c = teamCounts(r.name); return <span style={{ fontSize: 12, fontWeight: c.critical > 0 ? 600 : 400, color: c.critical > 0 ? 'var(--p-critical-text)' : 'var(--text-muted)' }}>{c.critical}</span> } },
  ]

  if (error) return <ErrorState message="Failed to load teams." onRetry={refetch} />

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">Maintenance Teams ({teams?.length ?? 0})</span>
      </div>
      <DataTable<Team>
        columns={COLUMNS}
        data={teams ?? []}
        getRowId={r => r.id}
        onRowClick={r => navigate(`/work-orders?team_id=${r.id}`)}
        loading={isLoading}
        defaultSortKey="name"
        emptyMessage="No teams found."
      />
    </div>
  )
}
