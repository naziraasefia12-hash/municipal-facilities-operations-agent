import { useState, useMemo } from 'react'

export interface Column<T> {
  key: string
  label: string
  sortable?: boolean
  width?: string
  render: (row: T) => React.ReactNode
}

interface Props<T> {
  columns: Column<T>[]
  data: T[]
  onRowClick?: (row: T) => void
  getRowId: (row: T) => string | number
  selectedId?: string | number | null
  loading?: boolean
  emptyMessage?: string
  defaultSortKey?: string
  defaultSortDir?: 'asc' | 'desc'
  getRowClassName?: (row: T) => string
}

export function DataTable<T>({
  columns, data, onRowClick, getRowId, selectedId,
  loading, emptyMessage = 'No records found.',
  defaultSortKey = '', defaultSortDir = 'asc',
  getRowClassName,
}: Props<T>) {
  const [sortKey, setSortKey] = useState(defaultSortKey)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(defaultSortDir)

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const sorted = useMemo(() => {
    if (!sortKey) return data
    return [...data].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortKey] as string | number | null
      const bv = (b as Record<string, unknown>)[sortKey] as string | number | null
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, sortKey, sortDir])

  if (loading) {
    return (
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>{columns.map(c => <th key={c.key} style={c.width ? { width: c.width } : {}}>{c.label}</th>)}</tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <tr key={i} className="loading-rows">
                {columns.map(c => (
                  <td key={c.key}>
                    <span className="skeleton" style={{ width: `${50 + Math.random() * 40}%` }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (!sorted.length) {
    return (
      <div>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>{columns.map(c => <th key={c.key}>{c.label}</th>)}</tr>
            </thead>
          </table>
        </div>
        <div className="empty-state">
          <div className="empty-state-label">No records found</div>
          <div className="empty-state-sub">{emptyMessage}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map(c => (
              <th
                key={c.key}
                className={`${c.sortable ? 'sortable' : ''} ${sortKey === c.key ? 'sorted' : ''}`}
                style={c.width ? { width: c.width } : {}}
                onClick={c.sortable ? () => toggleSort(c.key) : undefined}
              >
                {c.label}
                {c.sortable && (
                  <span className="sort-icon">
                    {sortKey === c.key ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map(row => {
            const id = getRowId(row)
            const isSelected = selectedId != null && selectedId === id
            const extraClass = getRowClassName ? getRowClassName(row) : ''
            return (
              <tr
                key={id}
                className={`${onRowClick ? 'clickable' : ''} ${isSelected ? 'selected' : ''} ${extraClass}`}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map(c => <td key={c.key}>{c.render(row)}</td>)}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
