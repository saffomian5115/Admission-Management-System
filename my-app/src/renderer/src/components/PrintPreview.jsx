import { useEffect, useRef } from 'react'
import { IconPrinter, IconClose } from './Icons'
import logoImg from '../assets/punjabcollege.png'

function PrintPreview({ student, printInstructions, documents, onClose }) {
  const printRef = useRef(null)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handlePrint = () => {
    window.print()
  }

  const marksLabel = () => {
    if (student.level === 'inter') {
      if (student.marks_10th) return `10th Marks: ${student.marks_10th} / 1100`
      if (student.marks_9th) return `9th Marks: ${student.marks_9th} / 550`
    } else {
      if (student.marks_12th) return `12th Marks: ${student.marks_12th} / 1100`
      if (student.marks_11th) return `11th Marks: ${student.marks_11th} / 550`
    }
    return 'N/A'
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return new Date().toLocaleDateString('en-PK')
    try {
      return new Date(dateStr).toLocaleDateString('en-PK', {
        year: 'numeric', month: 'long', day: 'numeric'
      })
    } catch {
      return dateStr
    }
  }

  const instructions = Array.isArray(printInstructions)
    ? printInstructions
    : (printInstructions ? printInstructions.split('\n').filter(Boolean) : [])

  const normalizeDoc = (doc) => {
    if (typeof doc === 'string') return { name: doc, quantity: 1 }
    return { name: doc.name || '', quantity: doc.quantity || 1 }
  }

  const docList = (documents || []).map(d => normalizeDoc(d))

  return (
    <div className="print-preview-overlay">
      <div className="print-preview-toolbar">
        <span className="print-preview-title">Print Preview</span>
        <div className="print-preview-actions">
          <button className="btn btn-primary btn-sm" onClick={handlePrint}>
            <IconPrinter color="#fff" size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Print
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            <IconClose color="#555" size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Close
          </button>
        </div>
      </div>
      <div className="print-preview-scroll">
        <div className="print-preview-sheet" ref={printRef}>
          {/* A4 Sheet Content */}
          <div className="print-header">
            <div className="print-header-content">
              <img src={logoImg} alt="Punjab College" className="print-logo" />
              <div className="print-header-text">
                <h1>Punjab College Mian Channu</h1>
                <p>Admission Confirmation Slip</p>
              </div>
            </div>
          </div>

          <div className="print-ref-row">
            <span><strong>Admission No:</strong> {student.id?.toString().padStart(4, '0')}</span>
            <span><strong>Date:</strong> {formatDate(student.created_at)}</span>
          </div>

          <div className="print-two-col-section">
            <div className="print-two-col-left">
              <h3>Personal Information</h3>
              <div className="print-row">
                <span className="print-label">Student Name</span>
                <span className="print-value">{student.name}</span>
              </div>
              <div className="print-row">
                <span className="print-label">Father's Name</span>
                <span className="print-value">{student.father_name}</span>
              </div>
              <div className="print-row">
                <span className="print-label">CNIC / B-Form</span>
                <span className="print-value">{student.cnic}</span>
              </div>
              <div className="print-row">
                <span className="print-label">Contact</span>
                <span className="print-value">{[student.call_no, student.whatsapp_no].filter(Boolean).join(' / ') || 'N/A'}</span>
              </div>
              <div className="print-row">
                <span className="print-label">Address</span>
                <span className="print-value">{student.address}</span>
              </div>
            </div>
            <div className="print-two-col-divider"></div>
            <div className="print-two-col-right">
              <h3>Admission Details</h3>
              <div className="print-row">
                <span className="print-label">Level</span>
                <span className="print-value">{student.level === 'inter' ? 'Inter' : 'BS'}</span>
              </div>
              <div className="print-row">
                <span className="print-label">Program</span>
                <span className="print-value">{student.program_name || 'N/A'}</span>
              </div>
              <div className="print-row">
                <span className="print-label">Previous Program</span>
                <span className="print-value">{student.previous_program === 'science' ? 'Science' : 'Arts'}</span>
              </div>
              <div className="print-row">
                <span className="print-label">Previous Institute</span>
                <span className="print-value">{student.previous_institute}</span>
              </div>
              <div className="print-row">
                <span className="print-label">Major Subjects</span>
                <span className="print-value">{student.major_subjects}</span>
              </div>
            </div>
          </div>

          <div className="print-section">
            <h3>Academic & Fee Details</h3>
            <div className="print-row">
              <span className="print-label">Marks</span>
              <span className="print-value">{marksLabel()}</span>
            </div>
            {student.percentage > 0 && (
              <div className="print-row">
                <span className="print-label">Percentage</span>
                <span className="print-value">{student.percentage.toFixed(1)}%</span>
              </div>
            )}
            <div className="print-row print-fee-row">
              <span className="print-label">Admission Fee</span>
              <span className="print-value print-fee-value">Rs. {student.fee?.toLocaleString() || '0'}</span>
            </div>
          </div>

          {docList.length > 0 && (
            <div className="print-section">
              <h3>Required Documents</h3>
              <table className="print-docs-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Document</th>
                    <th>Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {docList.map((doc, idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td>{doc.name}</td>
                      <td>{doc.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {instructions.length > 0 && (
            <div className="print-section print-instructions-section">
              <h3>Instructions</h3>
              <ul className="print-instructions-list">
                {instructions.map((inst, i) => (
                  <li key={i}>{inst}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="print-footer">
            <p>Developed by Sarfraz (IT department)</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PrintPreview
