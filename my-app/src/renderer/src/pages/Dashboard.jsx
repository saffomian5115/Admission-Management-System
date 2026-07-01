import { useState, useEffect } from 'react'
import { IconDashboard, IconUsers, IconCalendar, IconGraduation, IconBook, IconInbox } from '../components/Icons'

function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [recentStudents, setRecentStudents] = useState([])

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      const [statsRes, studentsRes] = await Promise.all([
        window.api.reports.dashboard(),
        window.api.students.getAll({})
      ])

      if (statsRes.success) setStats(statsRes.data)
      if (studentsRes.success) {
        setRecentStudents(studentsRes.data.slice(0, 5))
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <>
        <div className="page-header">
          <h2>Dashboard</h2>
        </div>
        <div className="page-body">
          <div className="loading">
            <span className="spinner" />
            Loading dashboard...
          </div>
        </div>
      </>
    )
  }

  const statCards = [
    { label: 'Total Admissions', value: stats?.totalStudents || 0, icon: <IconUsers color="currentColor" />, color: 'blue' },
    { label: "Today's Admissions", value: stats?.todayAdmissions || 0, icon: <IconCalendar color="currentColor" />, color: 'green' },
    { label: 'Inter Students', value: stats?.interStudents || 0, icon: <IconGraduation color="currentColor" />, color: 'orange' },
    { label: 'BS Students', value: stats?.bsStudents || 0, icon: <IconBook color="currentColor" />, color: 'purple' },
  ]

  return (
    <>
      <div className="page-header">
        <h2><IconDashboard size={20} color="#1a1a2e" style={{ verticalAlign: 'middle', marginRight: 6 }} /> Dashboard</h2>
      </div>
      <div className="page-body">
        <div className="stats-grid">
          {statCards.map((card) => (
            <div key={card.label} className="stat-card">
              <div className={`stat-icon ${card.color}`}>{card.icon}</div>
              <div className="stat-info">
                <h3>{card.value}</h3>
                <p>{card.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-title">Recent Admissions</div>
          {recentStudents.length > 0 ? (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Father Name</th>
                    <th>Program</th>
                    <th>Level</th>
                    <th>Fee</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentStudents.map((s) => (
                    <tr key={s.id}>
                      <td>{s.name}</td>
                      <td>{s.father_name}</td>
                      <td>{s.program_name || '-'}</td>
                      <td><span className={`badge ${s.level === 'inter' ? 'badge-inter' : 'badge-bs'}`}>{s.level.toUpperCase()}</span></td>
                      <td>Rs. {s.fee?.toLocaleString()}</td>
                      <td>{s.created_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon"><IconInbox size={40} color="#999" /></div>
              <p>No admissions yet. Start by adding a new student!</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default Dashboard
