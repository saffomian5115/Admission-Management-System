import { useState, useEffect } from 'react'
import { IconReports, IconGlobe, IconBook, IconSearch, IconChart } from '../components/Icons'

function Reports() {
  const [activeTab, setActiveTab] = useState('area')
  const [level, setLevel] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [areaReport, setAreaReport] = useState([])
  const [programReport, setProgramReport] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadReport()
  }, [activeTab])

  const loadReport = async () => {
    setLoading(true)
    const filters = {}
    if (level !== 'all') filters.level = level
    if (fromDate) filters.fromDate = fromDate
    if (toDate) filters.toDate = toDate

    try {
      if (activeTab === 'area') {
        const res = await window.api.reports.areaWise(filters)
        if (res.success) setAreaReport(res.data)
      } else {
        const res = await window.api.reports.programWise(filters)
        if (res.success) setProgramReport(res.data)
      }
    } catch (err) {
      console.error('Failed to load report:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleFilter = () => {
    loadReport()
  }

  const totalCount = activeTab === 'area'
    ? areaReport.reduce((sum, r) => sum + r.student_count, 0)
    : programReport.reduce((sum, r) => sum + r.student_count, 0)

  return (
    <>
      <div className="page-header">
        <h2><IconReports size={20} color="#1a1a2e" style={{ verticalAlign: 'middle', marginRight: 6 }} /> Reports</h2>
      </div>
      <div className="page-body">
        {/* Tabs */}
        <div className="card" style={{ padding: '14px 20px' }}>
          <div className="filter-bar">
            <button
              className={`btn ${activeTab === 'area' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              onClick={() => setActiveTab('area')}
            >
              <IconGlobe color="currentColor" style={{ verticalAlign: 'middle', marginRight: 4 }} /> Area-wise Report
            </button>
            <button
              className={`btn ${activeTab === 'program' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              onClick={() => setActiveTab('program')}
            >
              <IconBook color="currentColor" style={{ verticalAlign: 'middle', marginRight: 4 }} /> Program-wise Report
            </button>
            <span style={{ borderLeft: '1px solid #ddd', height: 24, margin: '0 8px' }} />
            <select value={level} onChange={(e) => setLevel(e.target.value)}>
              <option value="all">All Levels</option>
              <option value="inter">Inter</option>
              <option value="bs">BS</option>
            </select>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} placeholder="From" />
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} placeholder="To" />
            <button className="btn btn-primary btn-sm" onClick={handleFilter}><IconSearch color="#fff" size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Apply Filters</button>
          </div>
        </div>

        {/* Report Summary */}
        <div className="card">
          <div className="card-title">
            {activeTab === 'area' ? <><IconGlobe size={16} color="#1a1a2e" style={{ verticalAlign: 'middle', marginRight: 6 }} /> Area-wise Report</> : <><IconBook size={16} color="#1a1a2e" style={{ verticalAlign: 'middle', marginRight: 6 }} /> Program-wise Report</>}
          </div>
          <div className="report-summary">
            <div className="report-card">
              <h4>Total {activeTab === 'area' ? 'Areas' : 'Programs'}</h4>
              <div className="value">
                {activeTab === 'area' ? areaReport.length : programReport.length}
              </div>
            </div>
            <div className="report-card">
              <h4>Total Students</h4>
              <div className="value">{totalCount}</div>
            </div>
          </div>

          {loading ? (
            <div className="loading">
              <span className="spinner" />
              Loading report...
            </div>
          ) : activeTab === 'area' && areaReport.length > 0 ? (
            <div className="table-container" style={{ marginTop: 16 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Area / City</th>
                    <th>Student Count</th>
                    <th>Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {areaReport.map((r, idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td><strong>{r.area}</strong></td>
                      <td>{r.student_count}</td>
                      <td>
                        {totalCount > 0
                          ? ((r.student_count / totalCount) * 100).toFixed(1) + '%'
                          : '0%'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'program' && programReport.length > 0 ? (
            <div className="table-container" style={{ marginTop: 16 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Program</th>
                    <th>Level</th>
                    <th>Student Count</th>
                    <th>Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {programReport.map((r, idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td><strong>{r.program_name || 'N/A'}</strong></td>
                      <td>
                        <span className={`badge ${r.level === 'inter' ? 'badge-inter' : 'badge-bs'}`}>
                          {r.level?.toUpperCase()}
                        </span>
                      </td>
                      <td>{r.student_count}</td>
                      <td>
                        {totalCount > 0
                          ? ((r.student_count / totalCount) * 100).toFixed(1) + '%'
                          : '0%'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state" style={{ paddingTop: 30 }}>
              <div className="empty-icon"><IconChart size={40} color="#999" /></div>
              <p>No data available for the selected filters.</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default Reports
