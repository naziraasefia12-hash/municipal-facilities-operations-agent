interface Tab { id: string; label: string; count?: number }

interface Props {
  tabs: Tab[]
  active: string
  onChange: (id: string) => void
}

export function Tabs({ tabs, active, onChange }: Props) {
  return (
    <div className="tabs">
      {tabs.map(t => (
        <button
          key={t.id}
          className={`tab-item ${active === t.id ? 'active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
          {t.count != null && (
            <span style={{ marginLeft: 5, fontSize: 10, color: 'inherit', opacity: 0.7 }}>
              ({t.count})
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
