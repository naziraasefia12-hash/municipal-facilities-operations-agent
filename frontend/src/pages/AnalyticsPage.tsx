import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { useAnalyticsOverview } from '../hooks/useAnalytics'
import { StatStrip } from '../components/ui/StatStrip'
import { LoadingState } from '../components/ui/LoadingState'
import { ErrorState } from '../components/ui/ErrorState'
import { capitalize } from '../utils/formatters'

// ── Chart helpers ─────────────────────────────────────────────────────────────

const TICK_STYLE = { fontSize: 11, fill: 'var(--text-muted)' }

// Truncate long building / team names so Y-axis labels fit
function abbrev(name: string, max = 22): string {
  return name.length > max ? name.slice(0, max - 1) + '…' : name
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#fff',
      border: '1px solid var(--border)',
      borderRadius: 3,
      padding: '6px 10px',
      fontSize: 12,
    }}>
      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: 'var(--text-secondary)' }}>
          {p.name}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  )
}

// ── Reusable chart panel ──────────────────────────────────────────────────────

function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="chart-panel">
      <div className="chart-panel-header">
        <div className="chart-panel-title">{title}</div>
      </div>
      <div className="chart-body">{children}</div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function AnalyticsPage() {
  const { data, isLoading, error, refetch } = useAnalyticsOverview()

  if (isLoading) return <LoadingState message="Loading analytics…" />
  if (error || !data) return <ErrorState message="Failed to load analytics." onRetry={refetch} />

  const { summary, by_category, by_building, by_team, sla_performance } = data

  // Active teams only (have at least one open/in-progress/critical WO)
  const activeTeams = by_team.filter(
    t => t.open_count + t.in_progress_count + t.critical_count > 0
  ).sort((a, b) => b.critical_count - a.critical_count || b.open_count - a.open_count)

  const teamsWithWork = activeTeams.length
  const buildingsWithWork = by_building.filter(b => b.count > 0).length

  // Abbrev building names for chart
  const buildingChartData = by_building
    .filter(b => b.count > 0)
    .map(b => ({ ...b, short_name: abbrev(b.building_name) }))
    .sort((a, b) => b.count - a.count)

  // Category chart — filter zero-count categories
  const categoryChartData = by_category.filter(c => c.count > 0)

  return (
    <div className="stack">

      {/* ── Stats strip ───────────────────────────────────────────── */}
      <StatStrip cells={[
        { label: 'Total WOs', value: summary.total_work_orders },
        { label: 'Open', value: summary.open_work_orders },
        { label: 'In Progress', value: summary.in_progress_work_orders },
        {
          label: 'Critical',
          value: summary.critical_work_orders,
          variant: summary.critical_work_orders > 0 ? 'danger' : 'default',
        },
        {
          label: 'Overdue',
          value: summary.overdue_work_orders,
          variant: summary.overdue_work_orders > 0 ? 'warn' : 'default',
        },
        { label: 'Pending Approval', value: summary.pending_approval_work_orders },
      ]} />

      {/* ── Report context ─────────────────────────────────────────── */}
      <div className="analytics-report-summary">
        <strong>{summary.total_work_orders}</strong> total work orders ·{' '}
        <strong>{buildingsWithWork}</strong> of {by_building.length} buildings active ·{' '}
        <strong>{teamsWithWork}</strong> team{teamsWithWork !== 1 ? 's' : ''} with open items ·{' '}
        Generated {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </div>

      {/* ── Section 1: Distribution charts ────────────────────────── */}
      <div className="analytics-section">
        <div className="analytics-section-header">Breakdown by Category & Location</div>
        <div className="analytics-two-col">

          {/* Category distribution */}
          <ChartPanel title="Work Orders by Category">
            {categoryChartData.length === 0 ? (
              <div className="empty-state" style={{ padding: 'var(--sp-5) 0' }}>
                <div className="empty-state-label">No data</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(160, categoryChartData.length * 30)}>
                <BarChart
                  data={categoryChartData}
                  layout="vertical"
                  margin={{ top: 2, right: 24, bottom: 2, left: -10 }}
                >
                  <XAxis
                    type="number"
                    tick={TICK_STYLE}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="category"
                    tick={TICK_STYLE}
                    axisLine={false}
                    tickLine={false}
                    width={95}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--accent-subtle)' }} />
                  <Bar dataKey="count" name="Work Orders" fill="#2457A0" radius={[0, 2, 2, 0]} label={{ position: 'right', fontSize: 11, fill: 'var(--text-muted)' }} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartPanel>

          {/* Building distribution */}
          <ChartPanel title="Work Orders by Building">
            {buildingChartData.length === 0 ? (
              <div className="empty-state" style={{ padding: 'var(--sp-5) 0' }}>
                <div className="empty-state-label">No data</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(160, buildingChartData.length * 30)}>
                <BarChart
                  data={buildingChartData}
                  layout="vertical"
                  margin={{ top: 2, right: 24, bottom: 2, left: -10 }}
                >
                  <XAxis
                    type="number"
                    tick={TICK_STYLE}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="short_name"
                    tick={TICK_STYLE}
                    axisLine={false}
                    tickLine={false}
                    width={150}
                  />
                  <Tooltip
                    content={<ChartTooltip />}
                    cursor={{ fill: 'var(--accent-subtle)' }}
                    formatter={(_v: any, _n: any, props: any) => [props.payload.count, props.payload.building_name]}
                  />
                  <Bar dataKey="count" name="Work Orders" fill="#3A6BBF" radius={[0, 2, 2, 0]} label={{ position: 'right', fontSize: 11, fill: 'var(--text-muted)' }} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartPanel>

        </div>
      </div>

      {/* ── Section 2: Workload & SLA tables ──────────────────────── */}
      <div className="analytics-section">
        <div className="analytics-section-header">Team Workload & SLA Performance</div>
        <div className="analytics-two-col">

          {/* Team workload table */}
          <div className="chart-panel">
            <div className="chart-panel-header">
              <div className="chart-panel-title">Team Workload</div>
              <div className="panel-meta">{activeTeams.length} of {by_team.length} teams active</div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table analytics-team-table">
                <thead>
                  <tr>
                    <th>Team</th>
                    <th style={{ width: 56, textAlign: 'center' }}>Open</th>
                    <th style={{ width: 75, textAlign: 'center' }}>In Progress</th>
                    <th style={{ width: 62, textAlign: 'center' }}>Critical</th>
                    <th style={{ width: 70 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {by_team
                    .sort((a, b) => b.critical_count - a.critical_count || b.open_count - a.open_count)
                    .map(team => {
                      const isActive = team.open_count + team.in_progress_count + team.critical_count > 0
                      return (
                        <tr key={team.team_name}>
                          <td style={{ fontSize: 12.5, color: 'var(--text-primary)' }}>{team.team_name}</td>
                          <td style={{ textAlign: 'center', fontSize: 12, fontWeight: team.open_count > 0 ? 600 : 400, color: team.open_count > 0 ? 'var(--accent)' : 'var(--text-muted)' }}>
                            {team.open_count}
                          </td>
                          <td style={{ textAlign: 'center', fontSize: 12, fontWeight: team.in_progress_count > 0 ? 600 : 400, color: team.in_progress_count > 0 ? 'var(--s-inprogress-text)' : 'var(--text-muted)' }}>
                            {team.in_progress_count}
                          </td>
                          <td style={{ textAlign: 'center', fontSize: 12, fontWeight: team.critical_count > 0 ? 700 : 400, color: team.critical_count > 0 ? 'var(--p-critical-text)' : 'var(--text-muted)' }}>
                            {team.critical_count}
                          </td>
                          <td>
                            {team.critical_count > 0 ? (
                              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--p-critical-text)' }}>Alert</span>
                            ) : isActive ? (
                              <span style={{ fontSize: 11, color: 'var(--accent)' }}>Active</span>
                            ) : (
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Idle</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {/* SLA Performance table */}
          <div className="chart-panel">
            <div className="chart-panel-header">
              <div className="chart-panel-title">SLA Performance by Priority</div>
              <div className="panel-meta">Resolved work orders only</div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Priority</th>
                    <th style={{ width: 65 }}>Target</th>
                    <th style={{ width: 75 }}>Avg Actual</th>
                    <th style={{ width: 56 }}>Count</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {sla_performance.map(row => {
                    const hasData = row.average_actual_hours != null
                    const withinSla = hasData && row.average_actual_hours! <= row.target_hours
                    const pct = hasData
                      ? Math.round((row.target_hours / row.average_actual_hours!) * 100)
                      : null

                    return (
                      <tr key={row.priority}>
                        <td>
                          <span className={`badge badge-${row.priority}`}>
                            {capitalize(row.priority)}
                          </span>
                        </td>
                        <td className="td-muted">{row.target_hours}h</td>
                        <td className="td-dim">
                          {hasData ? `${row.average_actual_hours!.toFixed(1)}h` : '—'}
                        </td>
                        <td className="td-muted">{row.count}</td>
                        <td>
                          {!hasData ? (
                            <span className="td-muted">No resolved WOs</span>
                          ) : withinSla ? (
                            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--p-low-text)' }}>
                              Within SLA
                            </span>
                          ) : (
                            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--p-high-text)' }}>
                              {pct}% of target
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
