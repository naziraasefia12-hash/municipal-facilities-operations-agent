import { NavLink } from 'react-router-dom'

const NAV = [
  { to: '/', label: 'Dashboard', exact: true },
  { to: '/work-orders', label: 'Work Orders' },
  { to: '/work-orders/new', label: 'New Work Order' },
]

const NAV2 = [
  { to: '/buildings', label: 'Buildings' },
  { to: '/teams', label: 'Teams' },
]

const NAV3 = [
  { to: '/analytics', label: 'Analytics' },
  { to: '/audit-log', label: 'Audit Log' },
]

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-unit">Municipal</div>
        <div className="sidebar-brand-name">Facilities Operations</div>
      </div>

      <nav className="sidebar-nav">
        {NAV.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
          >
            {item.label}
          </NavLink>
        ))}

        <div className="sidebar-nav-divider" />

        {NAV2.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
          >
            {item.label}
          </NavLink>
        ))}

        <div className="sidebar-nav-divider" />

        {NAV3.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
          >
            {item.label}
          </NavLink>
        ))}

        <div className="sidebar-nav-divider" />

        <NavLink
          to="/agent-test"
          className={({ isActive }) => `sidebar-nav-item tool ${isActive ? 'active' : ''}`}
        >
          Agent Test
        </NavLink>
      </nav>

      <div className="sidebar-foot">
        <span>v1.0.0</span>
      </div>
    </aside>
  )
}
