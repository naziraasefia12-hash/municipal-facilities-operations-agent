interface StatCell {
  label: string
  value: number | string
  variant?: 'default' | 'danger' | 'warn' | 'accent'
  onClick?: () => void
}

interface Props { cells: StatCell[] }

export function StatStrip({ cells }: Props) {
  return (
    <div className="stat-strip">
      {cells.map((cell, i) => (
        <div
          key={i}
          className="stat-cell"
          onClick={cell.onClick}
          style={cell.onClick ? { cursor: 'pointer' } : {}}
        >
          <div className="stat-label">{cell.label}</div>
          <div className={`stat-value ${cell.variant ?? ''}`}>{cell.value}</div>
        </div>
      ))}
    </div>
  )
}
