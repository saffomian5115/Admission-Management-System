import { useState, useEffect } from 'react'
import { IconRecords, IconRefresh, IconInbox, IconEdit, IconTrash, IconSave, IconChart, IconPrinter } from '../components/Icons'
import PrintPreview from '../components/PrintPreview'

function StudentRecords() {
  const [students, setStudents] = useState([])
  const [filteredStudents, setFilteredStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState('all')
  const [editingStudent, setEditingStudent] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [toast, setToast] = useState(null)
  const [saving, setSaving] = useState(false)
  const [printPreviewStudent, setPrintPreviewStudent] = useState(null)
  const [printInstructions, setPrintInstructions] = useState([])
  const [printDocuments, setPrintDocuments] = useState([])

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '', father_name: '', cnic: '', whatsapp_no: '', call_no: '',
    address: '', previous_institute: '', major_subjects: '', previous_program: '',
    admission_program_id: '', marks_9th: '', marks_10th: '', marks_11th: '', marks_12th: '',
    result_available: true
  })
  const [editCampus, setEditCampus] = useState('punjab')
  const [programs, setPrograms] = useState([])
  const [interPrograms, setInterPrograms] = useState([])

  useEffect(() => {
    loadStudents()
  }, [])

  const loadInterPrograms = async () => {
    const res = await window.api.programs.getAll('inter')
    if (res.success) {
      setInterPrograms(res.data)
    }
  }

  const loadStudents = async () => {
    setLoading(true)
    try {
      const res = await window.api.students.getAll({})
      if (res.success) {
        setStudents(res.data)
        setFilteredStudents(res.data)
      }
    } catch (err) {
      console.error('Failed to load students:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let result = [...students]
    if (levelFilter !== 'all') {
      result = result.filter((s) => s.level === levelFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.cnic.toLowerCase().includes(q) ||
          (s.call_no && s.call_no.toLowerCase().includes(q)) ||
          (s.whatsapp_no && s.whatsapp_no.toLowerCase().includes(q))
      )
    }
    setFilteredStudents(result)
  }, [search, levelFilter, students])

  const handleEdit = async (student) => {
    const res = await window.api.programs.getAll(student.level)
    if (res.success) setPrograms(res.data)
    // Also load inter programs for BS students' previous program
    await loadInterPrograms()

    // Determine result_available based on which marks are filled
    const has10thOr12th = student.level === 'inter'
      ? (student.marks_10th !== null && student.marks_10th !== undefined)
      : (student.marks_12th !== null && student.marks_12th !== undefined)

    // Determine campus from student's program
    const selectedProgram = res.data?.find(p => p.id === student.admission_program_id)
    const campus = !selectedProgram || selectedProgram.institute_type === 'punjab' || selectedProgram.institute_type === 'both'
      ? 'punjab'
      : 'riahs'
    setEditCampus(campus)

    setEditingStudent(student)
    setEditForm({
      name: student.name,
      father_name: student.father_name,
      cnic: student.cnic,
      whatsapp_no: student.whatsapp_no || '',
      call_no: student.call_no || '',
      address: student.address,
      previous_institute: student.previous_institute,
      major_subjects: student.major_subjects,
      previous_program: student.previous_program,
      admission_program_id: student.admission_program_id || '',
      marks_9th: student.marks_9th || '',
      marks_10th: student.marks_10th || '',
      marks_11th: student.marks_11th || '',
      marks_12th: student.marks_12th || '',
      result_available: has10thOr12th
    })
    setShowEditModal(true)
  }

  const handleEditSave = async () => {
    setSaving(true)
    try {
      const data = {
        level: editingStudent.level,
        ...editForm,
        admission_program_id: parseInt(editForm.admission_program_id)
      }
      const res = await window.api.students.update(editingStudent.id, data)
      if (res.success) {
        showToast('✅ Student updated successfully!', 'success')
        setShowEditModal(false)
        loadStudents()
      } else {
        showToast(`❌ Error: ${res.error}`, 'error')
      }
    } catch (err) {
      showToast(`❌ Error: ${err.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteClick = (student) => {
    setDeleteTarget(student)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    try {
      const res = await window.api.students.delete(deleteTarget.id)
      if (res.success) {
        showToast('🗑️ Record deleted successfully!', 'success')
        setShowDeleteModal(false)
        setDeleteTarget(null)
        loadStudents()
      } else {
        showToast(`❌ Error: ${res.error}`, 'error')
      }
    } catch (err) {
      showToast(`❌ Error: ${err.message}`, 'error')
    }
  }

  const handleExportExcel = async () => {
    try {
      const res = await window.api.students.exportExcel()
      if (res.success) {
        showToast(`✅ Exported ${res.count} records to Excel!`)
      } else if (res.error !== 'Cancelled') {
        showToast(`❌ Export failed: ${res.error}`)
      }
    } catch (err) {
      showToast(`❌ Export failed: ${err.message}`)
    }
  }

  const showToast = (message, type = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <>
      <div className="page-header">
        <h2><IconRecords size={20} color="#1a1a2e" style={{ verticalAlign: 'middle', marginRight: 6 }} /> Student Records</h2>
        <div className="header-actions">
          <button className="btn btn-secondary btn-sm" onClick={handleExportExcel}><IconPrinter color="#555" style={{ verticalAlign: 'middle', marginRight: 4 }} /> Export Excel</button>
          <button className="btn btn-secondary btn-sm" onClick={loadStudents}><IconRefresh color="#555" style={{ verticalAlign: 'middle', marginRight: 4 }} /> Refresh</button>
        </div>
      </div>
      <div className="page-body">
        {toast && (
          <div className="toast-container">
            <div className={`toast ${toast.type}`}>{toast.message}</div>
          </div>
        )}

        {/* Filter Bar */}
        <div className="card" style={{ padding: '14px 20px' }}>
          <div className="filter-bar">
            <input
              type="text"
              placeholder="Search by name, CNIC, or contact..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
              <option value="all">All Levels</option>
              <option value="inter">Inter</option>
              <option value="bs">BS</option>
            </select>
            <span style={{ fontSize: 13, color: '#888' }}>
              {filteredStudents.length} record(s) found
            </span>
          </div>
        </div>

        {/* Students Table */}
        <div className="card">
          {loading ? (
            <div className="loading">
              <span className="spinner" />
              Loading records...
            </div>
          ) : filteredStudents.length > 0 ? (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Father Name</th>
                    <th>CNIC</th>
                    <th>Contact</th>
                    <th>Program</th>
                    <th>Level</th>
                    <th>Fee</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((s, idx) => (
                    <tr key={s.id}>
                      <td>{idx + 1}</td>
                      <td><strong>{s.name}</strong></td>
                      <td>{s.father_name}</td>
                      <td>{s.cnic}</td>
                      <td>{s.call_no || s.whatsapp_no || '-'}</td>
                      <td>{s.program_name || '-'}</td>
                      <td>
                        <span className={`badge ${s.level === 'inter' ? 'badge-inter' : 'badge-bs'}`}>
                          {s.level.toUpperCase()}
                        </span>
                      </td>
                      <td><strong>Rs. {s.fee?.toLocaleString()}</strong></td>
                      <td style={{ fontSize: 12 }}>{s.created_at}</td>
                      <td>
                        <div className="actions-cell">
                          <button className="icon-btn" onClick={() => handleEdit(s)} title="Edit">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                            </svg>
                          </button>
                          <button className="icon-btn" onClick={async () => {
                            const instructionsKey = s.level === 'inter' ? 'print_instructions_inter' : 'print_instructions_bs'
                            const [studentRes, settingsRes, docsRes] = await Promise.all([
                              window.api.students.getById(s.id),
                              window.api.settings.get(instructionsKey),
                              window.api.settings.get(s.level === 'inter' ? 'documents_inter' : 'documents_bs')
                            ])
                            if (studentRes.success) {
                              setPrintInstructions(settingsRes.success ? settingsRes.data : [])
                              setPrintDocuments(docsRes.success ? docsRes.data : [])
                              setPrintPreviewStudent(studentRes.data)
                            }
                          }} title="Print">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="6 9 6 2 18 2 18 9"/>
                              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                              <rect x="6" y="14" width="12" height="8"/>
                            </svg>
                          </button>
                          <button className="icon-btn" onClick={() => handleDeleteClick(s)} title="Delete">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon"><IconInbox size={40} color="#999" /></div>
              <p>No records found.</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ minWidth: 600, maxWidth: 700 }}>
            <h3><IconEdit size={16} color="#333" style={{ verticalAlign: 'middle', marginRight: 6 }} /> Edit Student Record</h3>
            <div style={{ maxHeight: 500, overflowY: 'auto', paddingRight: 8 }}>
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Father's Name</label>
                  <input type="text" value={editForm.father_name} onChange={(e) => setEditForm({ ...editForm, father_name: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>CNIC / B-Form</label>
                  <input type="text" value={editForm.cnic} onChange={(e) => setEditForm({ ...editForm, cnic: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Previous Program</label>
                  {editingStudent?.level === 'inter' ? (
                    <select value={editForm.previous_program} onChange={(e) => setEditForm({ ...editForm, previous_program: e.target.value })}>
                      <option value="science">Science</option>
                      <option value="arts">Arts</option>
                    </select>
                  ) : (
                    <select value={editForm.previous_program} onChange={(e) => setEditForm({ ...editForm, previous_program: e.target.value })}>
                      <option value="">-- Select Previous Program --</option>
                      {interPrograms.map((p) => (
                        <option key={p.id} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              <div className="form-row three-col">
                <div className="form-group">
                  <label>WhatsApp No.</label>
                  <input type="text" value={editForm.whatsapp_no} onChange={(e) => setEditForm({ ...editForm, whatsapp_no: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Call / SIM No.</label>
                  <input type="text" value={editForm.call_no} onChange={(e) => setEditForm({ ...editForm, call_no: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Address</label>
                  <textarea value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Previous Institute</label>
                  <input type="text" value={editForm.previous_institute} onChange={(e) => setEditForm({ ...editForm, previous_institute: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Major Subjects</label>
                  <input type="text" value={editForm.major_subjects} onChange={(e) => setEditForm({ ...editForm, major_subjects: e.target.value })} />
                </div>
                {/* Campus selector for BS students in edit modal */}
                {editingStudent?.level === 'bs' && (
                  <div className="form-group">
                    <label>Campus</label>
                    <div className="campus-toggle">
                      <button
                        type="button"
                        className={`campus-btn ${editCampus === 'punjab' ? 'active' : ''}`}
                        onClick={() => {
                          setEditCampus('punjab')
                          setEditForm(prev => ({ ...prev, admission_program_id: '' }))
                        }}
                      >
                        🏛️ Punjab College
                      </button>
                      <button
                        type="button"
                        className={`campus-btn ${editCampus === 'riahs' ? 'active' : ''}`}
                        onClick={() => {
                          setEditCampus('riahs')
                          setEditForm(prev => ({ ...prev, admission_program_id: '' }))
                        }}
                      >
                        🏥 RIAHS
                      </button>
                    </div>
                  </div>
                )}
                <div className="form-group">
                  <label>Admission Program</label>
                  <select value={editForm.admission_program_id} onChange={(e) => setEditForm({ ...editForm, admission_program_id: e.target.value })}>
                    <option value="">-- Select --</option>
                    {(editingStudent?.level === 'bs'
                      ? programs.filter(p => {
                          if (editCampus === 'punjab') return p.institute_type === 'punjab' || p.institute_type === 'both'
                          if (editCampus === 'riahs') return p.institute_type === 'regional' || p.institute_type === 'both'
                          return true
                        })
                      : programs
                    ).map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              {/* Marks Section */}
              <div className="marks-section">
                <div className="marks-section-title">📊 Marks Information</div>
                <div className="marks-row">
                  <div className="checkbox-group">
                    <input
                      type="checkbox"
                      id="edit_result_available"
                      checked={editForm.result_available}
                      onChange={(e) => {
                        const checked = e.target.checked
                        if (!checked) {
                          const fieldToClear = editingStudent?.level === 'inter' ? 'marks_10th' : 'marks_12th'
                          setEditForm(prev => ({ ...prev, result_available: checked, [fieldToClear]: '' }))
                        } else {
                          const fieldToClear = editingStudent?.level === 'inter' ? 'marks_9th' : 'marks_11th'
                          setEditForm(prev => ({ ...prev, result_available: checked, [fieldToClear]: '' }))
                        }
                      }}
                    />
                    <label htmlFor="edit_result_available">{editingStudent?.level === 'inter' ? '10th' : '12th'} Result Available?</label>
                  </div>
                  <div className="marks-input-group">
                    {editForm.result_available ? (
                      <div className="form-group">
                        <label className="compact-label">{editingStudent?.level === 'inter' ? '10th Marks' : '12th Marks'} <span className="field-hint">(out of 1100)</span></label>
                        <input type="number" value={editingStudent?.level === 'inter' ? editForm.marks_10th : editForm.marks_12th} onChange={(e) => { const field = editingStudent?.level === 'inter' ? 'marks_10th' : 'marks_12th'; setEditForm({ ...editForm, [field]: e.target.value }) }} placeholder="Enter marks (out of 1100)" min="0" max="1100" />
                      </div>
                    ) : (
                      <div className="form-group">
                        <label className="compact-label">{editingStudent?.level === 'inter' ? '9th Marks' : '11th Marks'} <span className="field-hint">(out of 550)</span></label>
                        <input type="number" value={editingStudent?.level === 'inter' ? editForm.marks_9th : editForm.marks_11th} onChange={(e) => { const field = editingStudent?.level === 'inter' ? 'marks_9th' : 'marks_11th'; setEditForm({ ...editForm, [field]: e.target.value }) }} placeholder="Enter marks (out of 550)" min="0" max="550" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="btn-group">
              <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleEditSave} disabled={saving}>
                {saving ? 'Saving...' : <><IconSave color="#fff" size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Save Changes</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3><IconTrash size={18} color="#333" style={{ verticalAlign: 'middle', marginRight: 6 }} /> Delete Record</h3>
            <p>
              Are you sure you want to delete the record of <strong>{deleteTarget?.name}</strong>?
              This action cannot be undone.
            </p>
            <div className="btn-group">
              <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDeleteConfirm}><IconTrash color="#fff" size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Delete</button>
            </div>
          </div>
        </div>
      )}
      {/* Print Preview Modal */}
      {printPreviewStudent && (
        <PrintPreview
          student={printPreviewStudent}
          printInstructions={printInstructions}
          documents={printDocuments}
          onClose={() => setPrintPreviewStudent(null)}
        />
      )}
    </>
  )
}

export default StudentRecords
