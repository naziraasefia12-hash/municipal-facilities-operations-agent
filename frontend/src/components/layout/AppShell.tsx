import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Operations overview' },
  '/work-orders': { title: 'Work Orders', subtitle: 'All maintenance requests' },
  '/work-orders/new': { title: 'New Work Order', subtitle: 'Submit a maintenance request' },
  '/buildings': { title: 'Buildings', subtitle: 'Municipal facility inventory' },
  '/teams': { title: 'Teams', subtitle: 'Maintenance team workloads' },
  '/analytics': { title: 'Analytics', subtitle: 'Performance and workload metrics' },
  '/audit-log': { title: 'Audit Log', subtitle: 'All system events and changes' },
  '/agent-test': { title: 'Agent Test', subtitle: 'AI triage evaluation tool' },
}

export function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const path = location.pathname

  // Match exact first, then prefix
  const meta = PAGE_META[path]
    ?? Object.entries(PAGE_META).find(([k]) => k !== '/' && path.startsWith(k))?.[1]
    ?? { title: 'Work Order Detail', subtitle: 'Case record' }

  return (
    <div className="shell">
      <Sidebar />
      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <span className="topbar-title">{meta.title}</span>
            <span className="topbar-subtitle">{meta.subtitle}</span>
          </div>
          <div className="topbar-right">
            <button className="btn btn-primary" onClick={() => navigate('/work-orders/new')}>
              + New Work Order
            </button>
          </div>
        </header>
        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
