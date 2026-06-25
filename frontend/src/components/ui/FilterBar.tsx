interface SelectFilter {
  key: string
  label: string
  options: { label: string; value: string }[]
}

interface Props {
  filters: SelectFilter[]
  values: Record<string, string>
  onChange: (key: string, value: string) => void
  search?: { value: string; onChange: (v: string) => void; placeholder?: string }
  onClear?: () => void
}

export function FilterBar({ filters, values, onChange, search, onClear }: Props) {
  const activeKeys = filters.filter(f => values[f.key]).map(f => f.key)
  const hasSearch = search && search.value

  return (
    <div className="filter-bar">
      {search && (
        <input
          type="text"
          className="filter-bar-search"
          placeholder={search.placeholder ?? 'Search…'}
          value={search.value}
          onChange={e => search.onChange(e.target.value)}
        />
      )}

      {filters.map(f => (
        <select
          key={f.key}
          className={`filter-bar-select ${values[f.key] ? 'active' : ''}`}
          value={values[f.key] ?? ''}
          onChange={e => onChange(f.key, e.target.value)}
        >
          <option value="">{f.label}</option>
          {f.options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ))}

      {(activeKeys.length > 0 || hasSearch) && (
        <div className="filter-chips">
          {hasSearch && (
            <span className="filter-chip">
              Search: {search!.value}
              <button className="filter-chip-remove" onClick={() => search!.onChange('')}>×</button>
            </span>
          )}
          {activeKeys.map(key => {
            const f = filters.find(x => x.key === key)!
            const opt = f.options.find(o => o.value === values[key])
            return (
              <span key={key} className="filter-chip">
                {f.label}: {opt?.label ?? values[key]}
                <button className="filter-chip-remove" onClick={() => onChange(key, '')}>×</button>
              </span>
            )
          })}
        </div>
      )}

      {(activeKeys.length > 0 || hasSearch) && onClear && (
        <button className="filter-bar-clear" onClick={onClear}>Clear all</button>
      )}
    </div>
  )
}
