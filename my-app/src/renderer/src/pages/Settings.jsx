import { useState, useEffect } from 'react'
import { IconSettings, IconDollar, IconFile, IconPrinter, IconMessage, IconBook, IconTrash, IconPlus, IconClose, IconSave, IconRefresh, IconChart } from '../components/Icons'

function Settings() {
  const [activeTab, setActiveTab] = useState('fees')
  const [settings, setSettings] = useState({})
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  // Fee slabs state
  const [feeSlabs, setFeeSlabs] = useState([])
  const [interAdmissionFee, setInterAdmissionFee] = useState(5000)
  const [interAnnualFund, setInterAnnualFund] = useState(2000)
  const [bsAdmissionFee, setBsAdmissionFee] = useState(3000)
  const [bsInhouseExamFee, setBsInhouseExamFee] = useState(1000)
  const [bsSemesterFee, setBsSemesterFee] = useState(50000)
  const [documentsInter, setDocumentsInter] = useState([])
  const [documentsBs, setDocumentsBs] = useState([])
  const [printInstructionsInter, setPrintInstructionsInter] = useState('')
  const [printInstructionsBs, setPrintInstructionsBs] = useState('')
  const [messageTemplate, setMessageTemplate] = useState('')
  const [dbFilePath, setDbFilePath] = useState('')

  // New program form
  const [newProgram, setNewProgram] = useState({
    name: '', level: 'inter', institute_type: 'punjab'
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [settingsRes, programsRes] = await Promise.all([
        window.api.settings.getAll(),
        window.api.programs.getAll()
      ])

      if (settingsRes.success) {
        setSettings(settingsRes.data)
        setFeeSlabs(settingsRes.data.fee_slabs || [])
        setInterAdmissionFee(settingsRes.data.inter_admission_fee ?? 5000)
        setInterAnnualFund(settingsRes.data.inter_annual_fund ?? 2000)
        setBsAdmissionFee(settingsRes.data.bs_admission_fee ?? 3000)
        setBsInhouseExamFee(settingsRes.data.bs_inhouse_exam_fee ?? 1000)
        setBsSemesterFee(settingsRes.data.bs_semester_fee ?? 50000)
        setDocumentsInter((settingsRes.data.documents_inter || []).map(d => normalizeDoc(d)))
        setDocumentsBs((settingsRes.data.documents_bs || []).map(d => normalizeDoc(d)))
        setPrintInstructionsInter(
          settingsRes.data.print_instructions_inter
            ? (Array.isArray(settingsRes.data.print_instructions_inter)
              ? settingsRes.data.print_instructions_inter.join('\n')
              : settingsRes.data.print_instructions_inter)
            : ''
        )
        setPrintInstructionsBs(
          settingsRes.data.print_instructions_bs
            ? (Array.isArray(settingsRes.data.print_instructions_bs)
              ? settingsRes.data.print_instructions_bs.join('\n')
              : settingsRes.data.print_instructions_bs)
            : ''
        )
        setMessageTemplate(
          settingsRes.data.message_template || ''
        )
      }

      if (programsRes.success) {
        setPrograms(programsRes.data)
      }

      // Get database file path for backup info
      const dbRes = await window.api.database.getFilePath()
      if (dbRes.success) {
        setDbFilePath(dbRes.data)
      }
    } catch (err) {
      console.error('Failed to load settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const showToast = (message, type) => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleSaveFeeSlabs = async () => {
    setSaving(true)
    try {
      await window.api.settings.update('fee_slabs', feeSlabs)
      await window.api.settings.update('inter_admission_fee', parseFloat(interAdmissionFee) || 0)
      await window.api.settings.update('inter_annual_fund', parseFloat(interAnnualFund) || 0)
      await window.api.settings.update('bs_admission_fee', parseFloat(bsAdmissionFee) || 0)
      await window.api.settings.update('bs_inhouse_exam_fee', parseFloat(bsInhouseExamFee) || 0)
      await window.api.settings.update('bs_semester_fee', parseFloat(bsSemesterFee) || 0)
      showToast('✅ All fee settings saved!', 'success')
    } catch (err) {
      showToast(`❌ Error: ${err.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveDocuments = async () => {
    setSaving(true)
    try {
      await window.api.settings.update('documents_inter', documentsInter)
      await window.api.settings.update('documents_bs', documentsBs)
      showToast('✅ Document checklists saved!', 'success')
    } catch (err) {
      showToast(`❌ Error: ${err.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSavePrint = async () => {
    setSaving(true)
    try {
      await window.api.settings.update('print_instructions_inter', printInstructionsInter)
      await window.api.settings.update('print_instructions_bs', printInstructionsBs)
      showToast('✅ Print instructions saved!', 'success')
    } catch (err) {
      showToast(`❌ Error: ${err.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveMessage = async () => {
    setSaving(true)
    try {
      await window.api.settings.update('message_template', messageTemplate)
      showToast('✅ Message template saved!', 'success')
    } catch (err) {
      showToast(`❌ Error: ${err.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleAddProgram = async () => {
    if (!newProgram.name.trim()) return
    setSaving(true)
    try {
      const res = await window.api.programs.create(newProgram)
      if (res.success) {
        showToast('✅ Program added!', 'success')
        setNewProgram({ name: '', level: 'inter', institute_type: 'punjab' })
        const programsRes = await window.api.programs.getAll()
        if (programsRes.success) setPrograms(programsRes.data)
      } else {
        showToast(`❌ Error: ${res.error}`, 'error')
      }
    } catch (err) {
      showToast(`❌ Error: ${err.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteProgram = async (id) => {
    try {
      const res = await window.api.programs.delete(id)
      if (res.success) {
        showToast('🗑️ Program deleted!', 'success')
        const programsRes = await window.api.programs.getAll()
        if (programsRes.success) setPrograms(programsRes.data)
      }
    } catch (err) {
      showToast(`❌ Error: ${err.message}`, 'error')
    }
  }

  const updateSlab = (index, field, value) => {
    const updated = [...feeSlabs]
    updated[index] = { ...updated[index], [field]: value === '' ? '' : parseFloat(value) }
    setFeeSlabs(updated)
  }

  const addSlab = () => {
    setFeeSlabs([...feeSlabs, { min: 0, max: 100, fee: 0 }])
  }

  const removeSlab = (index) => {
    setFeeSlabs(feeSlabs.filter((_, i) => i !== index))
  }

  const normalizeDoc = (doc) => {
    if (typeof doc === 'string') return { name: doc, quantity: 1 }
    return { name: doc.name || '', quantity: doc.quantity || 1 }
  }

  const addDocument = (list, setter) => {
    setter([...list, { name: '', quantity: 1 }])
  }

  const updateDocumentName = (list, setter, index, value) => {
    const updated = [...list]
    updated[index] = { ...normalizeDoc(updated[index]), name: value }
    setter(updated)
  }

  const updateDocumentQty = (list, setter, index, value) => {
    const updated = [...list]
    updated[index] = { ...normalizeDoc(updated[index]), quantity: parseInt(value) || 1 }
    setter(updated)
  }

  const removeDocument = (list, setter, index) => {
    setter(list.filter((_, i) => i !== index))
  }

  if (loading) {
    return (
      <>
        <div className="page-header">
          <h2><IconSettings size={20} color="#1a1a2e" style={{ verticalAlign: 'middle', marginRight: 6 }} /> Settings</h2>
        </div>
        <div className="page-body">
          <div className="loading">
            <span className="spinner" />
            Loading settings...
          </div>
        </div>
      </>
    )
  }

  const tabs = [
    { id: 'fees', label: <><IconDollar color="currentColor" style={{ verticalAlign: 'middle', marginRight: 4 }} /> Fee Slabs</> },
    { id: 'documents', label: <><IconFile color="currentColor" style={{ verticalAlign: 'middle', marginRight: 4 }} /> Documents</> },
    { id: 'print', label: <><IconPrinter color="currentColor" style={{ verticalAlign: 'middle', marginRight: 4 }} /> Print Settings</> },
    { id: 'message', label: <><IconMessage color="currentColor" style={{ verticalAlign: 'middle', marginRight: 4 }} /> Message Template</> },
    { id: 'programs', label: <><IconBook color="currentColor" style={{ verticalAlign: 'middle', marginRight: 4 }} /> Programs</> },
    { id: 'backup', label: <><IconRefresh color="currentColor" style={{ verticalAlign: 'middle', marginRight: 4 }} /> Backup</> }
  ]

  return (
    <>
      <div className="page-header">
        <h2>⚙️ Settings</h2>
      </div>
      <div className="page-body">
        {toast && (
          <div className="toast-container">
            <div className={`toast ${toast.type}`}>{toast.message}</div>
          </div>
        )}

        {/* Tabs */}
        <div className="card" style={{ padding: '10px 16px', marginBottom: 16 }}>
          <div className="filter-bar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Fee Configuration */}
        {activeTab === 'fees' && (
          <div className="card">
            <div className="card-title"><IconDollar size={16} color="#1a1a2e" style={{ verticalAlign: 'middle', marginRight: 6 }} /> Fee Configuration</div>

            {/* Inter Fee Section */}
            <div style={{ padding: '16px', background: '#f8f9fa', borderRadius: 8, marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', marginBottom: 12 }}>🎓 Inter Fee Structure</h3>
              <div className="form-row" style={{ marginBottom: 12 }}>
                <div className="form-group">
                  <label>Admission Fee (Rs.)</label>
                  <input
                    type="number"
                    value={interAdmissionFee}
                    onChange={(e) => setInterAdmissionFee(e.target.value)}
                    style={{ padding: '8px 12px', border: '1.5px solid #ddd', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }}
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>Annual Fund (Rs.)</label>
                  <input
                    type="number"
                    value={interAnnualFund}
                    onChange={(e) => setInterAnnualFund(e.target.value)}
                    style={{ padding: '8px 12px', border: '1.5px solid #ddd', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }}
                    min="0"
                  />
                </div>
              </div>
              <p style={{ fontSize: 13, color: '#888', marginBottom: 10 }}>
                <strong>Tuition Fee Slabs</strong> — based on percentage marks (checked in order):
              </p>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Min %</th>
                      <th>Max %</th>
                      <th>Tuition Fee (Rs.)</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feeSlabs.map((slab, idx) => (
                      <tr key={idx}>
                        <td>
                          <input
                            type="number"
                            value={slab.min}
                            onChange={(e) => updateSlab(idx, 'min', e.target.value)}
                            style={{ width: 70, padding: '6px 8px', border: '1px solid #ddd', borderRadius: 4, fontFamily: 'inherit' }}
                            min="0"
                            max="100"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={slab.max}
                            onChange={(e) => updateSlab(idx, 'max', e.target.value)}
                            style={{ width: 70, padding: '6px 8px', border: '1px solid #ddd', borderRadius: 4, fontFamily: 'inherit' }}
                            min="0"
                            max="100"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={slab.fee}
                            onChange={(e) => updateSlab(idx, 'fee', e.target.value)}
                            style={{ width: 100, padding: '6px 8px', border: '1px solid #ddd', borderRadius: 4, fontFamily: 'inherit' }}
                            min="0"
                          />
                        </td>
                        <td>
                          <button className="icon-btn" onClick={() => removeSlab(idx)} title="Remove"><IconTrash size={14} color="#e53935" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={addSlab} style={{ marginTop: 8 }}>
                <IconPlus size={14} color="#555" style={{ verticalAlign: 'middle', marginRight: 4 }} /> Add Slab
              </button>
            </div>

            {/* BS Fee Section */}
            <div style={{ padding: '16px', background: '#f3e5f5', borderRadius: 8, marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', marginBottom: 12 }}>📘 BS Fee Structure</h3>
              <p style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>
                BS fees are fixed (no marks-based calculation).
              </p>
              <div className="form-row" style={{ marginBottom: 12 }}>
                <div className="form-group">
                  <label>Admission Fee (Rs.)</label>
                  <input
                    type="number"
                    value={bsAdmissionFee}
                    onChange={(e) => setBsAdmissionFee(e.target.value)}
                    style={{ padding: '8px 12px', border: '1.5px solid #ddd', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }}
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>In-House Exam Fee (per sem, Rs.)</label>
                  <input
                    type="number"
                    value={bsInhouseExamFee}
                    onChange={(e) => setBsInhouseExamFee(e.target.value)}
                    style={{ padding: '8px 12px', border: '1.5px solid #ddd', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }}
                    min="0"
                  />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label>Semester Fee (Rs.)</label>
                <input
                  type="number"
                  value={bsSemesterFee}
                  onChange={(e) => setBsSemesterFee(e.target.value)}
                  style={{ padding: '8px 12px', border: '1.5px solid #ddd', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }}
                  min="0"
                />
                <span className="field-hint">Applied to all BS programs uniformly</span>
              </div>
            </div>

            <div className="btn-group" style={{ marginTop: 12 }}>
              <button className="btn btn-primary" onClick={handleSaveFeeSlabs} disabled={saving}>
                {saving ? 'Saving...' : <><IconSave color="#fff" size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Save All Fee Settings</>}
              </button>
            </div>
          </div>
        )}

        {/* Documents */}
        {activeTab === 'documents' && (
          <div className="card">
            <div className="card-title"><IconFile size={16} color="#1a1a2e" style={{ verticalAlign: 'middle', marginRight: 6 }} /> Document Checklists</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div className="settings-section">
                <h3>Inter Admission Documents</h3>
                <p style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>Enter document name and required quantity.</p>
                <div className="settings-list">
                  {documentsInter.map((doc, idx) => {
                    const d = normalizeDoc(doc)
                    return (
                      <div key={idx} className="settings-item doc-item">
                        <span className="item-index">{idx + 1}</span>
                        <div className="doc-fields">
                          <input
                            type="text"
                            className="doc-name-input"
                            value={d.name}
                            onChange={(e) => updateDocumentName(documentsInter, setDocumentsInter, idx, e.target.value)}
                            placeholder="Document name"
                          />
                          <input
                            type="number"
                            className="doc-qty-input"
                            value={d.quantity}
                            onChange={(e) => updateDocumentQty(documentsInter, setDocumentsInter, idx, e.target.value)}
                            min="1"
                            max="99"
                            title="Qty"
                          />
                        </div>
                        <button className="icon-btn" onClick={() => removeDocument(documentsInter, setDocumentsInter, idx)} title="Remove"><IconClose size={14} color="#e53935" /></button>
                      </div>
                    )
                  })}
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => addDocument(documentsInter, setDocumentsInter)} style={{ marginTop: 8 }}>
                  <IconPlus color="#555" size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Add Document
                </button>
              </div>
              <div className="settings-section">
                <h3>BS Admission Documents</h3>
                <p style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>Enter document name and required quantity.</p>
                <div className="settings-list">
                  {documentsBs.map((doc, idx) => {
                    const d = normalizeDoc(doc)
                    return (
                      <div key={idx} className="settings-item doc-item">
                        <span className="item-index">{idx + 1}</span>
                        <div className="doc-fields">
                          <input
                            type="text"
                            className="doc-name-input"
                            value={d.name}
                            onChange={(e) => updateDocumentName(documentsBs, setDocumentsBs, idx, e.target.value)}
                            placeholder="Document name"
                          />
                          <input
                            type="number"
                            className="doc-qty-input"
                            value={d.quantity}
                            onChange={(e) => updateDocumentQty(documentsBs, setDocumentsBs, idx, e.target.value)}
                            min="1"
                            max="99"
                            title="Qty"
                          />
                        </div>
                        <button className="icon-btn" onClick={() => removeDocument(documentsBs, setDocumentsBs, idx)} title="Remove"><IconClose size={14} color="#e53935" /></button>
                      </div>
                    )
                  })}
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => addDocument(documentsBs, setDocumentsBs)} style={{ marginTop: 8 }}>
                  <IconPlus color="#555" size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Add Document
                </button>
              </div>
            </div>
            <div className="btn-group">
              <button className="btn btn-primary" onClick={handleSaveDocuments} disabled={saving}>
                {saving ? 'Saving...' : <><IconSave color="#fff" size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Save Documents</>}
              </button>
            </div>
          </div>
        )}

        {/* Print Settings */}
        {activeTab === 'print' && (
          <div className="card">
            <div className="card-title"><IconPrinter size={16} color="#1a1a2e" style={{ verticalAlign: 'middle', marginRight: 6 }} /> Print Settings</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div className="settings-section">
                <h3>🎓 Inter Instructions</h3>
                <p style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>End instructions shown at bottom of Inter admission print.</p>
                <div className="form-group full-width" style={{ marginBottom: 16 }}>
                  <textarea
                    value={printInstructionsInter}
                    onChange={(e) => setPrintInstructionsInter(e.target.value)}
                    rows={4}
                    placeholder="Enter instructions for Inter admissions..."
                  />
                </div>
              </div>
              <div className="settings-section">
                <h3>📘 BS Instructions</h3>
                <p style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>End instructions shown at bottom of BS admission print.</p>
                <div className="form-group full-width" style={{ marginBottom: 16 }}>
                  <textarea
                    value={printInstructionsBs}
                    onChange={(e) => setPrintInstructionsBs(e.target.value)}
                    rows={4}
                    placeholder="Enter instructions for BS admissions..."
                  />
                </div>
              </div>
            </div>
            <div className="btn-group">
              <button className="btn btn-primary" onClick={handleSavePrint} disabled={saving}>
                {saving ? 'Saving...' : <><IconSave color="#fff" size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Save Print Settings</>}
              </button>
            </div>
          </div>
        )}

        {/* Message Template */}
        {activeTab === 'message' && (
          <div className="card">
            <div className="card-title"><IconMessage size={16} color="#1a1a2e" style={{ verticalAlign: 'middle', marginRight: 6 }} /> Message Template</div>
            <p style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>
              Available placeholders: <code>{'[Name]'}</code>, <code>{'[Institute]'}</code>, <code>{'[Fee]'}</code>
            </p>
            <div className="form-group full-width" style={{ marginBottom: 16 }}>
              <label>SMS / WhatsApp Message Template</label>
              <textarea
                value={messageTemplate}
                onChange={(e) => setMessageTemplate(e.target.value)}
                rows={5}
                placeholder="Dear [Name], your admission at [Institute] has been confirmed. Fee: Rs.[Fee]. Please visit the institute for further details."
              />
            </div>
            <div className="btn-group">
              <button className="btn btn-primary" onClick={handleSaveMessage} disabled={saving}>
                {saving ? 'Saving...' : <><IconSave color="#fff" size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Save Template</>}
              </button>
            </div>
          </div>
        )}

        {/* Database Backup */}
        {activeTab === 'backup' && (
          <div className="card">
            <div className="card-title"><IconRefresh size={16} color="#1a1a2e" style={{ verticalAlign: 'middle', marginRight: 6 }} /> Database Backup</div>
            <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
              Create a backup of your entire database. The backup file will contain all student records, programs, settings, and other data.
            </p>
            <div style={{ padding: '16px', background: '#f8f9fa', borderRadius: 8, marginBottom: 16 }}>
              <h4 style={{ marginBottom: 8, fontSize: 14, fontWeight: 600 }}>Backup Now</h4>
              <p style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
                Click the button below to save a backup of your database to your preferred location.
              </p>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  try {
                    const res = await window.api.database.backup()
                    if (res.success) {
                      showToast('✅ Database backup created successfully!')
                    } else if (res.error !== 'Cancelled') {
                      showToast(`❌ Backup failed: ${res.error}`)
                    }
                  } catch (err) {
                    showToast(`❌ Backup failed: ${err.message}`)
                  }
                }}
              >
                <IconSave color="#fff" size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Create Backup
              </button>
            </div>
            <div style={{ padding: '16px', background: '#fff8e1', borderRadius: 8, border: '1px solid #ffe082' }}>
              <h4 style={{ marginBottom: 8, fontSize: 14, fontWeight: 600, color: '#f57f17' }}>⚠️ Restore Note</h4>
              <p style={{ fontSize: 13, color: '#666' }}>
                To restore a backup, close the application and replace the current database file with your backup file. The database is located at: <code style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: 3, fontSize: 12 }}>{dbFilePath}</code>
              </p>
            </div>
          </div>
        )}

        {/* Programs Management */}
        {activeTab === 'programs' && (
          <div className="card">
            <div className="card-title"><IconBook size={16} color="#1a1a2e" style={{ verticalAlign: 'middle', marginRight: 6 }} /> Admission Programs</div>

            {/* Add Program Form */}
            <div style={{ padding: '12px', background: '#f8f9fa', borderRadius: 8, marginBottom: 16 }}>
              <h4 style={{ marginBottom: 10, fontSize: 14, fontWeight: 600 }}>Add New Program</h4>
              <div className="form-row">
                <div className="form-group">
                  <label>Program Name</label>
                  <input
                    type="text"
                    value={newProgram.name}
                    onChange={(e) => setNewProgram({ ...newProgram, name: e.target.value })}
                    placeholder="e.g. F.Sc Pre-Medical"
                  />
                </div>
                <div className="form-group">
                  <label>Level</label>
                  <select value={newProgram.level} onChange={(e) => setNewProgram({ ...newProgram, level: e.target.value })}>
                    <option value="inter">Inter</option>
                    <option value="bs">BS</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Institute Type</label>
                  <select value={newProgram.institute_type} onChange={(e) => setNewProgram({ ...newProgram, institute_type: e.target.value })}>
                    <option value="punjab">Punjab College</option>
                    <option value="regional">Regional Institute</option>
                    <option value="both">Both</option>
                  </select>
                </div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={handleAddProgram} disabled={saving}>
                {saving ? 'Adding...' : <><IconPlus color="#fff" size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Add Program</>}
              </button>
            </div>

            {/* Programs List */}
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Level</th>
                    <th>Institute Type</th>
                    <th>Active</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {programs.map((p, idx) => (
                    <tr key={p.id}>
                      <td>{idx + 1}</td>
                      <td><strong>{p.name}</strong></td>
                      <td><span className={`badge ${p.level === 'inter' ? 'badge-inter' : 'badge-bs'}`}>{p.level.toUpperCase()}</span></td>
                      <td style={{ textTransform: 'capitalize' }}>{p.institute_type}</td>
                      <td>
                        <span className={`badge ${p.is_active ? 'badge-success' : ''}`}>
                          {p.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <button className="icon-btn" onClick={() => handleDeleteProgram(p.id)} title="Delete"><IconTrash size={14} color="#e53935" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default Settings
