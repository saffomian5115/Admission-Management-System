import { useState, useEffect } from 'react'
import { IconAdmission, IconChart, IconSave, IconRefresh } from '../components/Icons'
import PrintPreview from '../components/PrintPreview'

function NewAdmission() {
  const [formData, setFormData] = useState({
    level: 'inter',
    campus: 'punjab',
    name: '',
    father_name: '',
    cnic: '',
    whatsapp_no: '',
    call_no: '',
    address: '',
    previous_institute: '',
    major_subjects: '',
    previous_program: 'science',
    admission_program_id: '',
    marks_9th: '',
    marks_10th: '',
    marks_11th: '',
    marks_12th: '',
    result_available: false
  })
  const [programs, setPrograms] = useState([])
  const [interPrograms, setInterPrograms] = useState([])
  const [fee, setFee] = useState(null)
  const [feeComponents, setFeeComponents] = useState(null)
  const [percentage, setPercentage] = useState(null)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [printPreviewStudent, setPrintPreviewStudent] = useState(null)
  const [printInstructions, setPrintInstructions] = useState([])
  const [printDocuments, setPrintDocuments] = useState([])

  // Load programs when level changes
  useEffect(() => {
    loadPrograms()
    loadInterPrograms()
  }, [formData.level])

  const loadPrograms = async () => {
    const res = await window.api.programs.getAll(formData.level)
    if (res.success) {
      setPrograms(res.data)
    }
  }

  const loadInterPrograms = async () => {
    const res = await window.api.programs.getAll('inter')
    if (res.success) {
      setInterPrograms(res.data)
    }
  }

  const handleLevelToggle = (newLevel) => {
    if (newLevel === formData.level) return
    setFormData(prev => ({
      ...prev,
      level: newLevel,
      campus: 'punjab',
      admission_program_id: '',
      previous_program: newLevel === 'inter' ? 'science' : '',
      marks_9th: '',
      marks_10th: '',
      marks_11th: '',
      marks_12th: '',
      result_available: false
    }))
    setFee(null)
    setPercentage(null)
    setErrors({})
  }

  const handleCampusChange = (newCampus) => {
    if (newCampus === formData.campus) return
    setFormData(prev => ({
      ...prev,
      campus: newCampus,
      admission_program_id: ''
    }))
  }

  // Filter programs based on selected campus (for BS level)
  const filteredPrograms = formData.level === 'bs'
    ? programs.filter(p => {
        if (formData.campus === 'punjab') return p.institute_type === 'punjab' || p.institute_type === 'both'
        if (formData.campus === 'riahs') return p.institute_type === 'regional' || p.institute_type === 'both'
        return true
      })
    : programs

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    const newValue = type === 'checkbox' ? checked : value
    setFormData((prev) => {
      return { ...prev, [name]: newValue }
    })
    // Clear error on change
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }))
    }
  }

  // Auto-calculate fee when marks-related fields change
  useEffect(() => {
    calculateFeePreview(formData)
  }, [formData.marks_9th, formData.marks_10th, formData.marks_11th, formData.marks_12th, formData.level, formData.result_available])

  const getMaxMarks = (level, isPrimary) => {
    if (level === 'inter') {
      return isPrimary ? 1100 : 550 // 10th=1100, 9th=550
    }
    return isPrimary ? 1100 : 550 // 12th=1100, 11th=550
  }

  const calculateFeePreview = async (data) => {
    let obtainedMarks = 0
    let totalMarks = 1100

    if (data.level === 'inter') {
      if (data.result_available) {
        obtainedMarks = parseInt(data.marks_10th) || 0
        totalMarks = 1100
      } else {
        obtainedMarks = parseInt(data.marks_9th) || 0
        totalMarks = 550
      }
    } else {
      if (data.result_available) {
        obtainedMarks = parseInt(data.marks_12th) || 0
        totalMarks = 1100
      } else {
        obtainedMarks = parseInt(data.marks_11th) || 0
        totalMarks = 550
      }
    }

    const pct = totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0
    setPercentage(pct)

    try {
      if (data.level === 'inter') {
        // Inter: fetch all components
        const [slabsRes, admissionRes, annualRes] = await Promise.all([
          window.api.settings.get('fee_slabs'),
          window.api.settings.get('inter_admission_fee'),
          window.api.settings.get('inter_annual_fund')
        ])

        const admissionFee = admissionRes.success ? (admissionRes.data || 0) : 0
        const annualFund = annualRes.success ? (annualRes.data || 0) : 0

        let tuitionFee = 0
        if (slabsRes.success && Array.isArray(slabsRes.data)) {
          const slabs = slabsRes.data.sort((a, b) => a.min - b.min)
          for (const slab of slabs) {
            if (pct >= slab.min && pct <= slab.max) {
              tuitionFee = slab.fee
              break
            }
          }
          if (tuitionFee === 0 && slabs.length > 0) {
            tuitionFee = slabs[slabs.length - 1].fee
          }
        }

        setFeeComponents({
          admission_fee: admissionFee,
          annual_fund: annualFund,
          tuition_fee: tuitionFee
        })
        setFee(admissionFee + annualFund + tuitionFee)
      } else {
        // BS: fetch fixed components
        const selectedProgram = programs.find(p => p.id === parseInt(data.admission_program_id))
        const programName = selectedProgram?.name || ''

        const [admissionRes, examRes, semFeeRes, semFeeItRes, itProgsRes] = await Promise.all([
          window.api.settings.get('bs_admission_fee'),
          window.api.settings.get('bs_inhouse_exam_fee'),
          window.api.settings.get('bs_semester_fee'),
          window.api.settings.get('bs_semester_fee_it'),
          window.api.settings.get('bs_it_programs')
        ])

        const admissionFee = admissionRes.success ? (admissionRes.data || 0) : 0
        const examFee = examRes.success ? (examRes.data || 0) : 0
        const defaultSemFee = semFeeRes.success ? (semFeeRes.data || 45000) : 45000
        const itSemFee = semFeeItRes.success ? (semFeeItRes.data || 50000) : 50000
        const itPrograms = itProgsRes.success ? (itProgsRes.data || ['IT', 'CS', 'SE', 'AI']) : ['IT', 'CS', 'SE', 'AI']

        const isItProgram = programName && itPrograms.some(p =>
          programName.toLowerCase() === p.toLowerCase() ||
          programName.toLowerCase().includes(p.toLowerCase())
        )
        const semesterFee = isItProgram ? itSemFee : defaultSemFee

        setFeeComponents({
          admission_fee: admissionFee,
          inhouse_exam_fee: examFee,
          semester_fee: semesterFee
        })
        setFee(admissionFee + examFee + semesterFee)
      }
    } catch (err) {
      console.error('Failed to fetch fee settings:', err)
      setFee(0)
    }
  }

  const validate = () => {
    const newErrors = {}

    if (!formData.name.trim()) newErrors.name = 'Name is required'
    if (!formData.father_name.trim()) newErrors.father_name = "Father's name is required"
    // CNIC/B-Form is optional now
    if (!formData.address.trim()) newErrors.address = 'Address is required'
    if (!formData.previous_program.trim()) newErrors.previous_program = 'Previous program is required'
    if (!formData.previous_institute.trim()) newErrors.previous_institute = 'Previous institute is required'
    if (!formData.major_subjects.trim()) newErrors.major_subjects = 'Major subjects is required'
    if (!formData.admission_program_id) newErrors.admission_program_id = 'Please select a program'

    // At least one contact required
    if (!formData.whatsapp_no.trim() && !formData.call_no.trim()) {
      newErrors.call_no = 'At least one contact number is required'
      newErrors.whatsapp_no = 'At least one contact number is required'
    }

    // Marks validation
    if (formData.level === 'inter') {
      if (formData.result_available) {
        if (!formData.marks_10th) newErrors.marks_10th = '10th marks are required'
      } else {
        if (!formData.marks_9th) newErrors.marks_9th = '9th marks are required'
      }
    } else {
      if (formData.result_available) {
        if (!formData.marks_12th) newErrors.marks_12th = '12th marks are required'
      } else {
        if (!formData.marks_11th) newErrors.marks_11th = '11th marks are required'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const showToast = (message, type) => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleSave = async (printAfter = false) => {
    if (!validate()) return

    setSaving(true)
    try {
      const data = {
        ...formData,
        admission_program_id: parseInt(formData.admission_program_id),
        marks_9th: formData.marks_9th ? parseInt(formData.marks_9th) : null,
        marks_10th: formData.marks_10th ? parseInt(formData.marks_10th) : null,
        marks_11th: formData.marks_11th ? parseInt(formData.marks_11th) : null,
        marks_12th: formData.marks_12th ? parseInt(formData.marks_12th) : null
      }

      const res = await window.api.students.create(data)

      if (res.success) {
        showToast(
          `✅ Student saved successfully! Fee: Rs.${res.data.fee?.toLocaleString()}`,
          'success'
        )

        // Reset form
        setFormData({
          level: 'inter',
          campus: 'punjab',
          name: '',
          father_name: '',
          cnic: '',
          whatsapp_no: '',
          call_no: '',
          address: '',
          previous_institute: '',
          major_subjects: '',
          previous_program: 'science',
          admission_program_id: '',
          marks_9th: '',
          marks_10th: '',
          marks_11th: '',
          marks_12th: '',
          result_available: false
        })
        setFee(null)
        setPercentage(null)

        if (printAfter) {
          // Fetch full student data for print preview
          const level = data.level
          const instructionsKey = level === 'inter' ? 'print_instructions_inter' : 'print_instructions_bs'
          const [fullRes, settingsRes, docsRes] = await Promise.all([
            window.api.students.getById(res.data.id),
            window.api.settings.get(instructionsKey),
            window.api.settings.get(level === 'inter' ? 'documents_inter' : 'documents_bs')
          ])
          if (fullRes.success) {
            setPrintInstructions(settingsRes.success ? settingsRes.data : [])
            setPrintDocuments(docsRes.success ? docsRes.data : [])
            setPrintPreviewStudent(fullRes.data)
          }
        }
      } else {
        showToast(`❌ Error: ${res.error}`, 'error')
      }
    } catch (err) {
      showToast(`❌ Error: ${err.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  const marksFieldLabel = formData.level === 'inter'
    ? {
        primary: '10th Marks',
        secondary: '9th Marks',
        primaryTotal: 'out of 1100',
        secondaryTotal: 'out of 550'
      }
    : {
        primary: '12th Marks',
        secondary: '11th Marks',
        primaryTotal: 'out of 1100',
        secondaryTotal: 'out of 550'
      }

  const currentMax = formData.result_available
    ? (formData.level === 'inter' ? 1100 : 1100)
    : (formData.level === 'inter' ? 550 : 550)

  return (
    <>
      <div className="page-header">
        <h2><IconAdmission size={20} color="#1a1a2e" style={{ verticalAlign: 'middle', marginRight: 6 }} /> New Admission</h2>
      </div>
      <div className="page-body">
        {toast && (
          <div className="toast-container">
            <div className={`toast ${toast.type}`}>{toast.message}</div>
          </div>
        )}

        {/* Level Toggle */}
        <div className="level-toggle" style={{ marginBottom: 12 }}>
          <button
            className={`toggle-btn ${formData.level === 'inter' ? 'active' : ''}`}
            onClick={() => handleLevelToggle('inter')}
          >
            <span className="toggle-icon">🎓</span> Inter
          </button>
          <button
            className={`toggle-btn ${formData.level === 'bs' ? 'active' : ''}`}
            onClick={() => handleLevelToggle('bs')}
          >
            <span className="toggle-icon">📘</span> BS
          </button>
        </div>

        <div className="form-container card compact-form">
          {/* Name + Father Name */}
          <div className="form-row">
            <div className="form-group">
              <label>Full Name <span className="required">*</span></label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={errors.name ? 'error' : ''}
                placeholder="Enter student name"
              />
              {errors.name && <span className="field-error">{errors.name}</span>}
            </div>
            <div className="form-group">
              <label>Father's Name <span className="required">*</span></label>
              <input
                type="text"
                name="father_name"
                value={formData.father_name}
                onChange={handleChange}
                className={errors.father_name ? 'error' : ''}
                placeholder="Enter father name"
              />
              {errors.father_name && <span className="field-error">{errors.father_name}</span>}
            </div>
          </div>

          {/* CNIC + (Campus for BS / Admission Program for Inter) */}
          <div className="form-row">
            <div className="form-group">
              <label>CNIC / B-Form</label>
              <input
                type="text"
                name="cnic"
                value={formData.cnic}
                onChange={handleChange}
                className={errors.cnic ? 'error' : ''}
                placeholder="XXXXX-XXXXXXX-X"
              />
              {errors.cnic && <span className="field-error">{errors.cnic}</span>}
            </div>
            {formData.level === 'bs' ? (
              <div className="form-group">
                <label>Campus <span className="required">*</span></label>
                <div className="campus-toggle">
                  <button
                    type="button"
                    className={`campus-btn ${formData.campus === 'punjab' ? 'active' : ''}`}
                    onClick={() => handleCampusChange('punjab')}
                  >
                    🏛️ Punjab College
                  </button>
                  <button
                    type="button"
                    className={`campus-btn ${formData.campus === 'riahs' ? 'active' : ''}`}
                    onClick={() => handleCampusChange('riahs')}
                  >
                    🏥 RIAHS
                  </button>
                </div>
              </div>
            ) : (
              <div className="form-group">
                <label>Admission Program <span className="required">*</span></label>
                <select
                  name="admission_program_id"
                  value={formData.admission_program_id}
                  onChange={handleChange}
                  className={errors.admission_program_id ? 'error' : ''}
                >
                  <option value="">-- Select Program --</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {errors.admission_program_id && <span className="field-error">{errors.admission_program_id}</span>}
              </div>
            )}
          </div>

          {/* For BS: Admission Program row after Campus */}
          {formData.level === 'bs' && (
            <div className="form-row">
              <div className="form-group">
                <label>Admission Program <span className="required">*</span></label>
                <select
                  name="admission_program_id"
                  value={formData.admission_program_id}
                  onChange={handleChange}
                  className={errors.admission_program_id ? 'error' : ''}
                >
                  <option value="">-- Select Program --</option>
                  {filteredPrograms.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {errors.admission_program_id && <span className="field-error">{errors.admission_program_id}</span>}
              </div>
              <div className="form-group">
                <label>Previous Program <span className="required">*</span></label>
                <select name="previous_program" value={formData.previous_program} onChange={handleChange}>
                  <option value="">-- Select Previous Program --</option>
                  {interPrograms.map((p) => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
                {errors.previous_program && <span className="field-error">{errors.previous_program}</span>}
              </div>
            </div>
          )}

          {/* Previous Program (Inter only) + Previous Institute (paired for Inter) */}
          {formData.level === 'inter' ? (
            <div className="form-row">
              <div className="form-group">
                <label>Previous Program <span className="required">*</span></label>
                <select name="previous_program" value={formData.previous_program} onChange={handleChange}>
                  <option value="science">Science</option>
                  <option value="arts">Arts</option>
                </select>
                {errors.previous_program && <span className="field-error">{errors.previous_program}</span>}
              </div>
              <div className="form-group">
                <label>Previous Institute <span className="required">*</span></label>
                <input
                  type="text"
                  name="previous_institute"
                  value={formData.previous_institute}
                  onChange={handleChange}
                  className={errors.previous_institute ? 'error' : ''}
                  placeholder="Name of previous institute"
                />
                {errors.previous_institute && <span className="field-error">{errors.previous_institute}</span>}
              </div>
            </div>
          ) : (
            <div className="form-row">
              <div className="form-group">
                <label>Previous Institute <span className="required">*</span></label>
                <input
                  type="text"
                  name="previous_institute"
                  value={formData.previous_institute}
                  onChange={handleChange}
                  className={errors.previous_institute ? 'error' : ''}
                  placeholder="Name of previous institute"
                />
                {errors.previous_institute && <span className="field-error">{errors.previous_institute}</span>}
              </div>
              <div className="form-group">
                <label>Major Subjects <span className="required">*</span></label>
                <input
                  type="text"
                  name="major_subjects"
                  value={formData.major_subjects}
                  onChange={handleChange}
                  className={errors.major_subjects ? 'error' : ''}
                  placeholder="e.g. Physics, Chemistry, Biology"
                />
                {errors.major_subjects && <span className="field-error">{errors.major_subjects}</span>}
              </div>
            </div>
          )}

          {/* Major Subjects (Inter only) + Address */}
          {formData.level === 'inter' && (
            <div className="form-row">
              <div className="form-group">
                <label>Major Subjects <span className="required">*</span></label>
                <input
                  type="text"
                  name="major_subjects"
                  value={formData.major_subjects}
                  onChange={handleChange}
                  className={errors.major_subjects ? 'error' : ''}
                  placeholder="e.g. Physics, Chemistry, Biology"
                />
                {errors.major_subjects && <span className="field-error">{errors.major_subjects}</span>}
              </div>
              <div className="form-group">
                <label>Address <span className="required">*</span></label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className={errors.address ? 'error' : ''}
                  placeholder="Enter full address"
                />
                {errors.address && <span className="field-error">{errors.address}</span>}
              </div>
            </div>
          )}

          {/* Address (BS only) + WhatsApp */}
          {formData.level === 'bs' && (
            <div className="form-row">
              <div className="form-group">
                <label>Address <span className="required">*</span></label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className={errors.address ? 'error' : ''}
                  placeholder="Enter full address"
                />
                {errors.address && <span className="field-error">{errors.address}</span>}
              </div>
              <div className="form-group">
                <label>WhatsApp No.</label>
                <input
                  type="text"
                  name="whatsapp_no"
                  value={formData.whatsapp_no}
                  onChange={handleChange}
                  className={errors.whatsapp_no ? 'error' : ''}
                  placeholder="03XX-XXXXXXX"
                />
                {errors.whatsapp_no && <span className="field-error">{errors.whatsapp_no}</span>}
              </div>
            </div>
          )}

          {/* WhatsApp (Inter only) + Call/SIM - paired together as user requested */}
          {formData.level === 'inter' && (
            <div className="form-row">
              <div className="form-group">
                <label>WhatsApp No.</label>
                <input
                  type="text"
                  name="whatsapp_no"
                  value={formData.whatsapp_no}
                  onChange={handleChange}
                  className={errors.whatsapp_no ? 'error' : ''}
                  placeholder="03XX-XXXXXXX"
                />
                {errors.whatsapp_no && <span className="field-error">{errors.whatsapp_no}</span>}
              </div>
              <div className="form-group">
                <label>Call / SIM No.</label>
                <input
                  type="text"
                  name="call_no"
                  value={formData.call_no}
                  onChange={handleChange}
                  className={errors.call_no ? 'error' : ''}
                  placeholder="03XX-XXXXXXX"
                />
                {errors.call_no && <span className="field-error">{errors.call_no}</span>}
              </div>
            </div>
          )}

          {/* Call/SIM (BS only - alone) */}
          {formData.level === 'bs' && (
            <div className="form-row">
              <div className="form-group">
                <label>Call / SIM No.</label>
                <input
                  type="text"
                  name="call_no"
                  value={formData.call_no}
                  onChange={handleChange}
                  className={errors.call_no ? 'error' : ''}
                  placeholder="03XX-XXXXXXX"
                />
                {errors.call_no && <span className="field-error">{errors.call_no}</span>}
              </div>
            </div>
          )}

          {/* Marks Section */}
          <div className="marks-section">
            <div className="marks-section-title">
              <IconChart size={14} color="#444" style={{ verticalAlign: 'middle', marginRight: 6 }} /> Marks Information
            </div>

            <div className="marks-row">
              <div className="checkbox-group">
                <input
                  type="checkbox"
                  id="result_available"
                  name="result_available"
                  checked={formData.result_available}
                  onChange={handleChange}
                />
                <label htmlFor="result_available">
                  {formData.level === 'inter' ? '10th Result Available?' : '12th Result Available?'}
                </label>
              </div>
              <div className="marks-input-group">
                {formData.result_available ? (
                  <div className="form-group">
                    <label className="compact-label">{marksFieldLabel.primary} <span className="field-hint">({marksFieldLabel.primaryTotal})</span></label>
                    <input
                      type="number"
                      name={formData.level === 'inter' ? 'marks_10th' : 'marks_12th'}
                      value={formData.level === 'inter' ? formData.marks_10th : formData.marks_12th}
                      onChange={handleChange}
                      className={(errors.marks_10th || errors.marks_12th) ? 'error' : ''}
                      placeholder={`Enter marks (out of ${currentMax})`}
                      min="0"
                      max={currentMax}
                    />
                    {(errors.marks_10th || errors.marks_12th) && (
                      <span className="field-error">{errors.marks_10th || errors.marks_12th}</span>
                    )}
                  </div>
                ) : (
                  <div className="form-group">
                    <label className="compact-label">{marksFieldLabel.secondary} <span className="field-hint">({marksFieldLabel.secondaryTotal})</span></label>
                    <input
                      type="number"
                      name={formData.level === 'inter' ? 'marks_9th' : 'marks_11th'}
                      value={formData.level === 'inter' ? formData.marks_9th : formData.marks_11th}
                      onChange={handleChange}
                      className={(errors.marks_9th || errors.marks_11th) ? 'error' : ''}
                      placeholder={`Enter marks (out of ${currentMax})`}
                      min="0"
                      max={currentMax}
                    />
                    {(errors.marks_9th || errors.marks_11th) && (
                      <span className="field-error">{errors.marks_9th || errors.marks_11th}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Fee Display */}
          {fee !== null && feeComponents && (
            <div className="fee-display" style={{ marginTop: 12, padding: '14px 18px' }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                  {formData.level === 'inter' ? '🎓 Inter Fee Breakdown' : '📘 BS Fee Breakdown'}
                </h3>
                {formData.level === 'inter' ? (
                  <div style={{ fontSize: 12, lineHeight: 1.8 }}>
                    <div>Admission Fee: <strong>Rs. {feeComponents.admission_fee?.toLocaleString()}</strong></div>
                    <div>Annual Fund: <strong>Rs. {feeComponents.annual_fund?.toLocaleString()}</strong></div>
                    <div>Tuition Fee: <strong>Rs. {feeComponents.tuition_fee?.toLocaleString()}</strong>
                      {percentage !== null && <span style={{ opacity: 0.7 }}> (based on {percentage.toFixed(1)}% marks)</span>}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, lineHeight: 1.8 }}>
                    <div>Admission Fee: <strong>Rs. {feeComponents.admission_fee?.toLocaleString()}</strong></div>
                    <div>In-House Exam Fee: <strong>Rs. {feeComponents.inhouse_exam_fee?.toLocaleString()}</strong></div>
                    <div>Semester Fee: <strong>Rs. {feeComponents.semester_fee?.toLocaleString()}</strong></div>
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right', minWidth: 120 }}>
                <div style={{ fontSize: 11, opacity: 0.8 }}>Total</div>
                <div style={{ fontSize: 24, fontWeight: 800 }}>Rs. {fee.toLocaleString()}</div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="btn-group" style={{ marginTop: 12, paddingTop: 12 }}>
            <button
              className="btn btn-primary"
              onClick={() => handleSave(false)}
              disabled={saving}
            >
              {saving ? <><span className="spinner" /> Saving...</> : <><IconSave color="#fff" size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Save Only</>}
            </button>
            <button
              className="btn btn-success"
              onClick={() => handleSave(true)}
              disabled={saving}
            >
              {saving ? <><span className="spinner" /> Saving...</> : <><IconSave color="#fff" size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Save + Print</>}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setFormData({
                  level: 'inter',
                  campus: 'punjab',
                  name: '',
                  father_name: '',
                  cnic: '',
                  whatsapp_no: '',
                  call_no: '',
                  address: '',
                  previous_institute: '',
                  major_subjects: '',
                  previous_program: 'science',
                  admission_program_id: '',
                  marks_9th: '',
                  marks_10th: '',
                  marks_11th: '',
                  marks_12th: '',
                  result_available: false
                })
                setFee(null)
                setPercentage(null)
                setErrors({})
              }}
            >
              <IconRefresh color="#555" size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Reset
            </button>
          </div>
        </div>
      </div>

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

export default NewAdmission
