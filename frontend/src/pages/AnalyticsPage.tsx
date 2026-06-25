import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useAnalyticsOverview } from '../hooks/useAnalytics'
import { StatStrip } from '../components/ui/StatStrip'
import { LoadingState } from '../components/ui/LoadingState'
import { ErrorState } from '../components/ui/ErrorState'
import { CHART_COLORS } from '../utils/constants'

const CUSTOM_TOOLTIP = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 3, padding: '6px 10px', fontSize: 12 }}>
      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: 'var(--text-secondary)' }}>
          {p.name}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  )
}

const TICK_STYLE = { fontSize: 11, fill: 'var(--text-muted)' }

export function AnalyticsPage() {
  const { data, isLoading, error, refetch } = useAnalyticsOverview()

  if (isLoading) return <LoadingState message="Loading analytics…" />
  if (error || !data) return <ErrorState message="Failed to load analytics." onRetry={refetch} />

  const { summary, by_category, by_building, by_team, sla_performance } = data

  return (
    <div className="stack">
      <StatStrip cells={[
        { label: 'Total WOs', value: summary.total_work_orders },
        { label: 'Open', value: summary.open_work_orders },
        { label: 'In Progress', value: summary.in_progress_work_orders },
        { label: 'Critical', value: summary.critical_work_orders, variant: summary.critical_work_orders > 0 ? 'danger' : 'default' },
        { label: 'Overdue', value: summary.overdue_work_orders, variant: summary.overdue_work_orders > 0 ? 'warn' : 'default' },
        { label: 'Pending Approval', value: summary.pending_approval_work_orders },
      ]} />

      <div className="analytics-grid">
        {/* Category chart */}
        <div className="chart-panel">
          <div className="chart-panel-header"><div className="chart-panel-title">Work Orders by Category</div></div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={by_category} margin={{ top: 4, right: 8, bottom: 4, left: -20 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-row)" horizontal={false} />
                <XAxis type="number" tick={TICK_STYLE} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="category" tick={TICK_STYLE} axisLine={false} tickLine={false} width={90} />
                <Tooltip content={<CUSTOM_TOOLTIP />} cursor={{ fill: 'var(--accent-subtle)' }} />
                <Bar dataKey="count" name="Work Orders" radius={[0, 2, 2, 0]}>
                  {by_category.map((_, i) => <Cell key={i} fill={CHART_COLORS.bars[i % CHART_COLORS.bars.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Team workload */}
        <div className="chart-panel">
          <div className="chart-panel-header"><div className="chart-panel-title">Team Workload (Open + In Progress)</div></div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={by_team} margin={{ top: 4, right: 8, bottom: 4, left: -20 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-row)" horizontal={false} />
                <XAxis type="number" tick={TICK_STYLE} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="team_name" tick={TICK_STYLE} axisLine={false} tickLine={false} width={130} />
                <Tooltip content={<CUSTOM_TOOLTIP />} cursor={{ fill: 'var(--accent-subtle)' }} />
                <Bar dataKey="open_count" name="Open" fill={CHART_COLORS.primary} radius={[0, 0, 0, 0]} stackId="a" />
                <Bar dataKey="in_progress_count" name="In Progress" fill={CHART_COLORS.bars[2]} radius={[0, 2, 2, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Buildings */}
        <div className="chart-panel">
          <div className="chart-panel-header"><div className="chart-panel-title">Work Orders by Building</div></div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={by_building} margin={{ top: 4, right: 8, bottom: 4, left: -20 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-row)" horizontal={false} />
                <XAxis type="number" tick={TICK_STYLE} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="building_name" tick={TICK_STYLE} axisLine={false} tickLine={false} width={140} />
                <Tooltip content={<CUSTOM_TOOLTIP />} cursor={{ fill: 'var(--accent-subtle)' }} />
                <Bar dataKey="count" name="Work Orders" fill={CHART_COLORS.bars[1]} radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SLA Performance table */}
        <div className="chart-panel">
          <div className="chart-panel-header"><div className="chart-panel-title">SLA Performance by Priority</div></div>
          <div className="chart-body" style={{ padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Priority</th>
                  <th>Target</th>
                  <th>Avg Actual</th>
                  <th>Work Orders</th>
                  <th>Performance</th>
                </tr>
              </thead>
              <tbody>
                {sla_performance.map(row => {
                  const pct = row.average_actual_hours != null
                    ? Math.round((row.target_hours / row.average_actual_hours) * 100)
                    : null
                  return (
                    <tr key={row.priority}>
                      <td><span className={`badge badge-${row.priority}`}>{row.priority.charAt(0).toUpperCase() + row.priority.slice(1)}</span></td>
                      <td className="td-muted">{row.target_hours}h</td>
                      <td className="td-dim">{row.average_actual_hours != null ? `${row.average_actual_hours.toFixed(1)}h` : '—'}</td>
                      <td className="td-muted">{row.count}</td>
                      <td>
                        {pct != null ? (
                          <span style={{ fontSize: 12, fontWeight: 500, color: pct >= 100 ? 'var(--p-low-text)' : 'var(--p-high-text)' }}>
                            {pct >= 100 ? `Within SLA` : `${pct}% of target`}
                          </span>
                        ) : <span className="td-muted">—</span>}
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
  )
}
