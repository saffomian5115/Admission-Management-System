import { NavLink, Outlet } from 'react-router-dom'
import { IconDashboard, IconAdmission, IconRecords, IconReports, IconSettings, IconBook } from './Icons'

const navItems = [
  { path: '/', icon: <IconDashboard color="#fff" />, label: 'Dashboard' },
  { path: '/new-admission', icon: <IconAdmission color="#fff" />, label: 'New Admission' },
  { path: '/records', icon: <IconRecords color="#fff" />, label: 'Student Records' },
  { path: '/reports', icon: <IconReports color="#fff" />, label: 'Reports' },
  { path: '/settings', icon: <IconSettings color="#fff" />, label: 'Settings' }
]

function Layout() {
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1><IconBook color="#fff" size={20} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Admission System</h1>
          <p>Management Portal v1.0</p>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
          Admission Management System
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
