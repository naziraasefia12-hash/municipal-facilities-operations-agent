interface Props { label?: string; sub?: string; action?: React.ReactNode }

export function EmptyState({ label = 'No records found', sub, action }: Props) {
  return (
    <div className="empty-state">
      <div className="empty-state-label">{label}</div>
      {sub && <div className="empty-state-sub">{sub}</div>}
      {action && <div style={{ marginTop: 12 }}>{action}</div>}
    </div>
  )
}
