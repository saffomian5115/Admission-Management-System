import { useState, useEffect, useRef } from 'react'
import { IconMessage, IconSearch, IconSend, IconWhatsApp, IconBulk, IconRefresh, IconInbox } from '../components/Icons'

function Messages() {
  const [students, setStudents] = useState([])
  const [filteredStudents, setFilteredStudents] = useState([])
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [search, setSearch] = useState('')
  const [messageText, setMessageText] = useState('')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [messageLogs, setMessageLogs] = useState([])
  const [sending, setSending] = useState(false)
  const [mode, setMode] = useState('single') // 'single' | 'bulk'
  const [selectedForBulk, setSelectedForBulk] = useState([])
  const chatEndRef = useRef(null)

  useEffect(() => {
    loadStudents()
    loadMessageLogs()
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messageLogs])

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

  const loadMessageLogs = async (studentId = null) => {
    try {
      const res = await window.api.messages.getLogs(studentId)
      if (res.success) {
        setMessageLogs(res.data || [])
      }
    } catch (err) {
      console.error('Failed to load message logs:', err)
    }
  }

  useEffect(() => {
    if (search.trim()) {
      const q = search.toLowerCase()
      setFilteredStudents(
        students.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.cnic.toLowerCase().includes(q) ||
            (s.whatsapp_no && s.whatsapp_no.toLowerCase().includes(q)) ||
            (s.call_no && s.call_no.toLowerCase().includes(q))
        )
      )
    } else {
      setFilteredStudents(students)
    }
  }, [search, students])

  const showToast = (message, type = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleSelectStudent = (student) => {
    setSelectedStudent(student)
    setMessageText('')
    loadMessageLogs(student.id)
  }

  const formatPhone = (phone) => {
    // Remove any non-digit characters
    let cleaned = phone.replace(/\D/g, '')
    // If starts with 0, replace with 92 (Pakistan code)
    if (cleaned.startsWith('0')) {
      cleaned = '92' + cleaned.slice(1)
    }
    // If doesn't start with 92, add it
    if (!cleaned.startsWith('92')) {
      cleaned = '92' + cleaned
    }
    return cleaned
  }

  const handleSendSingle = async () => {
    if (!selectedStudent || !messageText.trim()) return
    setSending(true)

    const phone = selectedStudent.whatsapp_no || selectedStudent.call_no
    if (!phone) {
      showToast('❌ No contact number available for this student', 'error')
      setSending(false)
      return
    }

    const formattedPhone = formatPhone(phone)
    const encodedMsg = encodeURIComponent(messageText.trim())
    const waUrl = `https://wa.me/${formattedPhone}?text=${encodedMsg}`

    try {
      // Log the message
      await window.api.messages.log({
        studentId: selectedStudent.id,
        type: 'whatsapp',
        recipient: formattedPhone,
        message: messageText.trim(),
        status: 'sent'
      })

      // Open WhatsApp Web
      window.open(waUrl, '_blank')

      showToast('✅ WhatsApp opened for sending!', 'success')
      setMessageText('')
      loadMessageLogs(selectedStudent.id)
    } catch (err) {
      showToast(`❌ Error: ${err.message}`, 'error')
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (mode === 'single') {
        handleSendSingle()
      }
    }
  }

  const toggleBulkSelect = (student) => {
    setSelectedForBulk((prev) =>
      prev.some((s) => s.id === student.id)
        ? prev.filter((s) => s.id !== student.id)
        : [...prev, student]
    )
  }

  const toggleSelectAll = () => {
    if (selectedForBulk.length === filteredStudents.length) {
      setSelectedForBulk([])
    } else {
      setSelectedForBulk([...filteredStudents])
    }
  }

  const handleBulkSend = () => {
    // Placeholder — WhatsApp Business API required
    showToast('ℹ️ WhatsApp Business API required for bulk messaging', 'info')
  }

  const formatTime = (dateStr) => {
    if (!dateStr) return ''
    try {
      const d = new Date(dateStr)
      return d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })
    } catch {
      return dateStr
    }
  }

  const getSentCount = () => {
    return messageLogs.filter((l) => l.student_id === selectedStudent?.id).length
  }

  return (
    <>
      <div className="page-header">
        <h2>
          <IconMessage size={20} color="#1a1a2e" style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Messages
        </h2>
        <div className="header-actions">
          <button className={`btn ${mode === 'single' ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setMode('single')}>
            <IconWhatsApp color={mode === 'single' ? '#fff' : '#555'} size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Single
          </button>
          <button className={`btn ${mode === 'bulk' ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setMode('bulk')}>
            <IconBulk color={mode === 'bulk' ? '#fff' : '#555'} size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Bulk
          </button>
          <button className="btn btn-secondary btn-sm" onClick={loadStudents}>
            <IconRefresh color="#555" size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Refresh
          </button>
        </div>
      </div>

      <div className="page-body" style={{ padding: 0, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 70px)' }}>
        {toast && (
          <div className="toast-container">
            <div className={`toast ${toast.type}`}>{toast.message}</div>
          </div>
        )}

        <div className="messages-layout">
          {/* Left Panel — Student List */}
          <div className="messages-sidebar">
            <div className="messages-search">
              <IconSearch size={14} color="#999" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search students..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {mode === 'bulk' && (
              <div className="bulk-select-all">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedForBulk.length === filteredStudents.length && filteredStudents.length > 0}
                    onChange={toggleSelectAll}
                  />
                  <span>Select All ({filteredStudents.length} students)</span>
                </label>
              </div>
            )}

            <div className="messages-student-list">
              {loading ? (
                <div className="loading"><span className="spinner" /> Loading...</div>
              ) : filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    className={`messages-student-item ${selectedStudent?.id === student.id && mode === 'single' ? 'active' : ''}`}
                    onClick={() => {
                      if (mode === 'single') handleSelectStudent(student)
                      if (mode === 'bulk') toggleBulkSelect(student)
                    }}
                  >
                    {mode === 'bulk' && (
                      <input
                        type="checkbox"
                        checked={selectedForBulk.some((s) => s.id === student.id)}
                        onChange={() => toggleBulkSelect(student)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                    <div className="student-avatar">
                      {student.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="student-info">
                      <div className="student-name">{student.name}</div>
                      <div className="student-subtitle">
                        {student.program_name || student.level?.toUpperCase() || ''}
                        {student.whatsapp_no && <span className="wa-badge">📱</span>}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state" style={{ padding: 40 }}>
                  <div className="empty-icon"><IconInbox size={32} color="#999" /></div>
                  <p>No students found</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel — Chat Area */}
          <div className="messages-chat-area">
            {mode === 'single' ? (
              selectedStudent ? (
                <>
                  {/* Chat Header */}
                  <div className="chat-header">
                    <div className="student-avatar large">
                      {selectedStudent.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="chat-header-info">
                      <div className="chat-header-name">{selectedStudent.name}</div>
                      <div className="chat-header-sub">
                        {selectedStudent.program_name || selectedStudent.level?.toUpperCase() || ''}
                        {selectedStudent.whatsapp_no && ` · ${selectedStudent.whatsapp_no}`}
                        {selectedStudent.call_no && !selectedStudent.whatsapp_no && ` · ${selectedStudent.call_no}`}
                      </div>
                    </div>
                    <div className="chat-header-actions">
                      <button
                        className="btn btn-success btn-sm"
                        onClick={handleSendSingle}
                        disabled={sending || !messageText.trim()}
                        title="Send via WhatsApp Web"
                      >
                        {sending ? (
                          <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, marginRight: 0 }} /> Sending...</>
                        ) : (
                          <><IconWhatsApp color="#fff" size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Send on WhatsApp</>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Message Log */}
                  <div className="chat-messages">
                    {messageLogs.filter((l) => l.student_id === selectedStudent.id).length > 0 ? (
                      messageLogs
                        .filter((l) => l.student_id === selectedStudent.id)
                        .map((log) => (
                          <div key={log.id} className={`chat-message ${log.type === 'whatsapp' ? 'sent' : ''}`}>
                            <div className="message-bubble">
                              <p>{log.message}</p>
                              <div className="message-meta">
                                <span className="message-time">{formatTime(log.created_at)}</span>
                                <span className={`message-status ${log.status}`}>
                                  {log.status === 'sent' ? '✓ Sent' : log.status === 'failed' ? '✗ Failed' : '⏳ Pending'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                    ) : (
                      <div className="chat-empty">
                        <div className="chat-empty-icon">💬</div>
                        <p>No messages sent yet</p>
                        <p className="chat-empty-hint">Type a message and click Send to start</p>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Message Input */}
                  <div className="chat-input-area">
                    <textarea
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type your message here... (Enter to send, Shift+Enter for new line)"
                      rows={2}
                      disabled={sending}
                    />
                    <button
                      className="btn btn-primary"
                      onClick={handleSendSingle}
                      disabled={sending || !messageText.trim()}
                      title="Send (Enter)"
                    >
                      <IconSend color="#fff" size={16} />
                    </button>
                  </div>
                </>
              ) : (
                <div className="chat-no-selection">
                  <div className="chat-no-selection-icon">💬</div>
                  <h3>Select a student</h3>
                  <p>Choose a student from the left panel to send a WhatsApp message</p>
                  <ul className="chat-features-list">
                    <li>✓ Open WhatsApp Web directly with pre-filled message</li>
                    <li>✓ Auto-detect student's WhatsApp number</li>
                    <li>✓ View message history for each student</li>
                    <li>✓ Press Enter to send quickly</li>
                  </ul>
                </div>
              )
            ) : (
              /* Bulk Mode */
              <div className="chat-no-selection">
                <div className="chat-no-selection-icon">📨</div>
                <h3>Bulk Messaging</h3>
                <p>Select multiple students from the left panel and send a message to all of them at once.</p>

                {selectedForBulk.length > 0 && (
                  <div className="bulk-form">
                    <div className="bulk-stats">
                      <strong>{selectedForBulk.length}</strong> student(s) selected
                    </div>
                    <textarea
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Type your bulk message here..."
                      rows={3}
                      className="bulk-textarea"
                    />
                    <button
                      className="btn btn-success btn-sm"
                      onClick={handleBulkSend}
                      disabled={!messageText.trim()}
                    >
                      <IconBulk color="#fff" size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Send Bulk Message
                    </button>
                    <div className="bulk-api-notice">
                      <IconBulk size={20} color="#f57f17" />
                      <div>
                        <strong>WhatsApp Business API required</strong>
                        <p>Bulk messaging requires WhatsApp Business API integration. This feature is not yet active.</p>
                        <p className="buy-api-text">Buy API to make it functional.</p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedForBulk.length === 0 && (
                  <ul className="chat-features-list">
                    <li>✓ Select multiple students from the left panel using checkboxes</li>
                    <li>✗ Bulk send requires WhatsApp Business API</li>
                    <li>🔒 Buy API to enable bulk messaging</li>
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default Messages
