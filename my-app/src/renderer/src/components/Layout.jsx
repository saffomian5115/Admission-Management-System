import { NavLink, Outlet } from 'react-router-dom'
import { IconDashboard, IconAdmission, IconRecords, IconReports, IconSettings, IconMessage } from './Icons'
import sidebarLogo from '../assets/punjabcollege.png'

const navItems = [
  { path: '/', icon: <IconDashboard color="#fff" />, label: 'Dashboard' },
  { path: '/new-admission', icon: <IconAdmission color="#fff" />, label: 'New Admission' },
  { path: '/records', icon: <IconRecords color="#fff" />, label: 'Student Records' },
  { path: '/messages', icon: <IconMessage color="#fff" />, label: 'Messages' },
  { path: '/reports', icon: <IconReports color="#fff" />, label: 'Reports' },
  { path: '/settings', icon: <IconSettings color="#fff" />, label: 'Settings' }
]

function Layout() {
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <img src={sidebarLogo} alt="PGC Logo" className="sidebar-logo" />
          <h1>PGC Admission System</h1>
          <p>Punjab College Mian Channu</p>
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
        <div className="sidebar-footer">
          <strong>Developed by Sarfraz</strong>
          <span>(IT Department PGC)</span>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
