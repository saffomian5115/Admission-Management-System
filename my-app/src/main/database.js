import Database from 'better-sqlite3'
import { join } from 'path'
import { app } from 'electron'
import * as XLSX from 'xlsx'
import { copyFileSync } from 'fs'

let db = null

export function getDatabase() {
  if (db) return db

  const dbPath = join(app.getPath('userData'), 'admission.db')
  db = new Database(dbPath)

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  return db
}

export function initializeDatabase() {
  const db = getDatabase()

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS programs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      level TEXT NOT NULL CHECK(level IN ('inter', 'bs')),
      institute_type TEXT NOT NULL CHECK(institute_type IN ('punjab', 'regional', 'both')),
      institute_name TEXT NOT NULL DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT NOT NULL CHECK(level IN ('inter', 'bs')),
      name TEXT NOT NULL,
      father_name TEXT NOT NULL,
      cnic TEXT NOT NULL,
      whatsapp_no TEXT DEFAULT '',
      call_no TEXT DEFAULT '',
      address TEXT NOT NULL,
      previous_institute TEXT NOT NULL,
      major_subjects TEXT NOT NULL,
      previous_program TEXT NOT NULL CHECK(previous_program IN ('science', 'arts')),
      admission_program_id INTEGER,
      marks_9th INTEGER,
      marks_10th INTEGER,
      marks_11th INTEGER,
      marks_12th INTEGER,
      total_marks INTEGER DEFAULT 0,
      obtained_marks INTEGER DEFAULT 0,
      percentage REAL DEFAULT 0,
      fee REAL DEFAULT 0,
      documents_checklist TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT (datetime('now', 'localtime')),
      updated_at DATETIME DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (admission_program_id) REFERENCES programs(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS message_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('sms', 'whatsapp')),
      recipient TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'sent', 'failed')),
      error TEXT DEFAULT '',
      created_at DATETIME DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    );
  `)

  // Seed default settings if not exist
  const defaultSettings = [
    {
      key: 'fee_slabs',
      value: JSON.stringify([
        { min: 90, max: 100, fee: 5000 },
        { min: 80, max: 89, fee: 8000 },
        { min: 70, max: 79, fee: 12000 },
        { min: 60, max: 69, fee: 15000 },
        { min: 0, max: 59, fee: 20000 }
      ])
    },
    {
      key: 'documents_inter',
      value: JSON.stringify([
        'Matric Certificate',
        'CNIC / B-Form Copy',
        '2 Passport Size Photos',
        'Domicile Copy'
      ])
    },
    {
      key: 'documents_bs',
      value: JSON.stringify([
        'Intermediate Certificate',
        'CNIC / B-Form Copy',
        '2 Passport Size Photos',
        'Domicile Copy',
        'Previous Marks Sheet'
      ])
    },
    {
      key: 'print_instructions',
      value: JSON.stringify(
        'This is a computer-generated document. No signature required.\nPlease report to the institute within 7 days with all original documents.'
      )
    },
    {
      key: 'message_template',
      value: JSON.stringify(
        'Dear [Name], your admission at [Institute] has been confirmed. Fee: Rs.[Fee]. Please visit the institute for further details. Regards, Punjab College Mian Channu.'
      )
    }
  ]

  const insertSetting = db.prepare(
    'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)'
  )

  for (const setting of defaultSettings) {
    insertSetting.run(setting.key, setting.value)
  }

  // Seed default programs if empty
  const programCount = db.prepare('SELECT COUNT(*) as count FROM programs').get()
  if (programCount.count === 0) {
    const insertProgram = db.prepare(
      'INSERT INTO programs (name, level, institute_type, institute_name) VALUES (?, ?, ?, ?)'
    )

    const defaultPrograms = [
      ['F.Sc Pre-Medical', 'inter', 'punjab', 'Punjab College Mian Channu'],
      ['F.Sc Pre-Engineering', 'inter', 'punjab', 'Punjab College Mian Channu'],
      ['ICS', 'inter', 'punjab', 'Punjab College Mian Channu'],
      ['I.Com', 'inter', 'punjab', 'Punjab College Mian Channu'],
      ['B.S. Computer Science', 'bs', 'both', 'Punjab College Mian Channu & Regional Institute'],
      ['B.S. Business Administration', 'bs', 'both', 'Punjab College Mian Channu & Regional Institute']
    ]

    for (const prog of defaultPrograms) {
      insertProgram.run(...prog)
    }
  }

  return db
}

// ─── Student CRUD ───

export function getAllStudents(filters = {}) {
  const db = getDatabase()
  const conditions = []
  const params = []

  if (filters.level && filters.level !== 'all') {
    conditions.push('s.level = ?')
    params.push(filters.level)
  }

  if (filters.search) {
    conditions.push('(s.name LIKE ? OR s.cnic LIKE ? OR s.call_no LIKE ? OR s.whatsapp_no LIKE ?)')
    const searchTerm = `%${filters.search}%`
    params.push(searchTerm, searchTerm, searchTerm, searchTerm)
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''

  const query = `
    SELECT s.*, p.name as program_name, p.institute_type, p.institute_name
    FROM students s
    LEFT JOIN programs p ON s.admission_program_id = p.id
    ${whereClause}
    ORDER BY s.created_at DESC
  `

  return db.prepare(query).all(...params)
}

export function getStudentById(id) {
  const db = getDatabase()
  return db.prepare(`
    SELECT s.*, p.name as program_name, p.institute_type, p.institute_name
    FROM students s
    LEFT JOIN programs p ON s.admission_program_id = p.id
    WHERE s.id = ?
  `).get(id)
}

export function createStudent(data) {
  const db = getDatabase()

  // Calculate marks
  let totalMarks = 0
  let obtainedMarks = 0
  let marksFields = []

  if (data.level === 'inter') {
    if (data.marks_10th) {
      marksFields.push('marks_10th')
    } else if (data.marks_9th) {
      marksFields.push('marks_9th')
    }
  } else {
    if (data.marks_12th) {
      marksFields.push('marks_12th')
    } else if (data.marks_11th) {
      marksFields.push('marks_11th')
    }
  }

  // For simplicity, use 1100 as total marks for all
  totalMarks = 1100
  if (marksFields.length > 0) {
    const field = marksFields[0]
    obtainedMarks = data[field] || 0
  }

  const percentage = totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0

  // Calculate fee based on slabs
  const fee = calculateFee(percentage)

  const stmt = db.prepare(`
    INSERT INTO students (
      level, name, father_name, cnic, whatsapp_no, call_no,
      address, previous_institute, major_subjects, previous_program,
      admission_program_id, marks_9th, marks_10th, marks_11th, marks_12th,
      total_marks, obtained_marks, percentage, fee, documents_checklist
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const result = stmt.run(
    data.level,
    data.name,
    data.father_name,
    data.cnic,
    data.whatsapp_no || '',
    data.call_no || '',
    data.address,
    data.previous_institute,
    data.major_subjects,
    data.previous_program,
    data.admission_program_id,
    data.marks_9th || null,
    data.marks_10th || null,
    data.marks_11th || null,
    data.marks_12th || null,
    totalMarks,
    obtainedMarks,
    percentage,
    fee,
    JSON.stringify(data.documents_checklist || [])
  )

  return { id: result.lastInsertRowid, fee, percentage, totalMarks, obtainedMarks }
}

export function updateStudent(id, data) {
  const db = getDatabase()

  // Recalculate marks and fee
  let totalMarks = 0
  let obtainedMarks = 0
  let marksFields = []

  if (data.level === 'inter') {
    if (data.marks_10th) {
      marksFields.push('marks_10th')
    } else if (data.marks_9th) {
      marksFields.push('marks_9th')
    }
  } else {
    if (data.marks_12th) {
      marksFields.push('marks_12th')
    } else if (data.marks_11th) {
      marksFields.push('marks_11th')
    }
  }

  totalMarks = 1100
  if (marksFields.length > 0) {
    const field = marksFields[0]
    obtainedMarks = data[field] || 0
  }

  const percentage = totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0
  const fee = calculateFee(percentage)

  const stmt = db.prepare(`
    UPDATE students SET
      level = ?, name = ?, father_name = ?, cnic = ?, whatsapp_no = ?,
      call_no = ?, address = ?, previous_institute = ?, major_subjects = ?,
      previous_program = ?, admission_program_id = ?,
      marks_9th = ?, marks_10th = ?, marks_11th = ?, marks_12th = ?,
      total_marks = ?, obtained_marks = ?, percentage = ?, fee = ?,
      documents_checklist = ?, updated_at = datetime('now', 'localtime')
    WHERE id = ?
  `)

  stmt.run(
    data.level,
    data.name,
    data.father_name,
    data.cnic,
    data.whatsapp_no || '',
    data.call_no || '',
    data.address,
    data.previous_institute,
    data.major_subjects,
    data.previous_program,
    data.admission_program_id,
    data.marks_9th || null,
    data.marks_10th || null,
    data.marks_11th || null,
    data.marks_12th || null,
    totalMarks,
    obtainedMarks,
    percentage,
    fee,
    JSON.stringify(data.documents_checklist || []),
    id
  )

  return { id, fee, percentage, totalMarks, obtainedMarks }
}

export function deleteStudent(id) {
  const db = getDatabase()
  return db.prepare('DELETE FROM students WHERE id = ?').run(id)
}

// ─── Fee Calculation ───

export function calculateFee(percentage) {
  const db = getDatabase()
  const setting = db.prepare("SELECT value FROM settings WHERE key = 'fee_slabs'").get()
  if (!setting) return 0

  const slabs = JSON.parse(setting.value)
  // Slabs sorted by min asc
  slabs.sort((a, b) => a.min - b.min)

  for (const slab of slabs) {
    if (percentage >= slab.min && percentage <= slab.max) {
      return slab.fee
    }
  }

  // Fallback: highest slab
  return slabs.length > 0 ? slabs[slabs.length - 1].fee : 0
}

// ─── Programs CRUD ───

export function getPrograms(level = null) {
  const db = getDatabase()
  if (level) {
    return db.prepare('SELECT * FROM programs WHERE level = ? AND is_active = 1 ORDER BY name').all(level)
  }
  return db.prepare('SELECT * FROM programs WHERE is_active = 1 ORDER BY name').all()
}

export function createProgram(data) {
  const db = getDatabase()
  const stmt = db.prepare(
    'INSERT INTO programs (name, level, institute_type, institute_name) VALUES (?, ?, ?, ?)'
  )
  return stmt.run(data.name, data.level, data.institute_type, data.institute_name || '')
}

export function updateProgram(id, data) {
  const db = getDatabase()
  const stmt = db.prepare(
    'UPDATE programs SET name = ?, level = ?, institute_type = ?, institute_name = ?, is_active = ? WHERE id = ?'
  )
  return stmt.run(data.name, data.level, data.institute_type, data.institute_name || '', data.is_active ?? 1, id)
}

export function deleteProgram(id) {
  const db = getDatabase()
  return db.prepare('DELETE FROM programs WHERE id = ?').run(id)
}

// ─── Settings CRUD ───

export function getSetting(key) {
  const db = getDatabase()
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key)
  return row ? JSON.parse(row.value) : null
}

export function getAllSettings() {
  const db = getDatabase()
  const rows = db.prepare('SELECT key, value FROM settings').all()
  const settings = {}
  for (const row of rows) {
    settings[row.key] = JSON.parse(row.value)
  }
  return settings
}

export function updateSetting(key, value) {
  const db = getDatabase()
  const stmt = db.prepare(
    "UPDATE settings SET value = ?, updated_at = datetime('now', 'localtime') WHERE key = ?"
  )
  return stmt.run(JSON.stringify(value), key)
}

// ─── Reports ───

export function getAreaWiseReport(filters = {}) {
  const db = getDatabase()
  const conditions = []
  const params = []

  if (filters.level && filters.level !== 'all') {
    conditions.push('level = ?')
    params.push(filters.level)
  }

  if (filters.fromDate) {
    conditions.push('date(created_at) >= date(?)')
    params.push(filters.fromDate)
  }

  if (filters.toDate) {
    conditions.push('date(created_at) <= date(?)')
    params.push(filters.toDate)
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''

  return db.prepare(`
    SELECT address as area, COUNT(*) as student_count
    FROM students
    ${whereClause}
    GROUP BY address
    ORDER BY student_count DESC
  `).all(...params)
}

export function getProgramWiseReport(filters = {}) {
  const db = getDatabase()
  const conditions = []
  const params = []

  if (filters.level && filters.level !== 'all') {
    conditions.push('s.level = ?')
    params.push(filters.level)
  }

  if (filters.fromDate) {
    conditions.push('date(s.created_at) >= date(?)')
    params.push(filters.fromDate)
  }

  if (filters.toDate) {
    conditions.push('date(s.created_at) <= date(?)')
    params.push(filters.toDate)
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''

  return db.prepare(`
    SELECT p.name as program_name, s.level, COUNT(*) as student_count
    FROM students s
    LEFT JOIN programs p ON s.admission_program_id = p.id
    ${whereClause}
    GROUP BY s.admission_program_id
    ORDER BY student_count DESC
  `).all(...params)
}

// ─── Dashboard Stats ───

export function getDashboardStats() {
  const db = getDatabase()

  return {
    totalStudents: db.prepare('SELECT COUNT(*) as count FROM students').get().count,
    todayAdmissions: db.prepare(
      "SELECT COUNT(*) as count FROM students WHERE date(created_at) = date('now', 'localtime')"
    ).get().count,
    interStudents: db.prepare("SELECT COUNT(*) as count FROM students WHERE level = 'inter'").get().count,
    bsStudents: db.prepare("SELECT COUNT(*) as count FROM students WHERE level = 'bs'").get().count,
    totalFee: db.prepare('SELECT COALESCE(SUM(fee), 0) as total FROM students').get().total
  }
}

// ─── Message Log ───

export function logMessage(studentId, type, recipient, message, status, error = '') {
  const db = getDatabase()
  return db.prepare(
    'INSERT INTO message_logs (student_id, type, recipient, message, status, error) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(studentId, type, recipient, message, status, error)
}

// ─── Excel Export ───

export function exportStudentsToExcel(filePath) {
  const students = getAllStudents()
  const rows = students.map((s, idx) => ({
    '#': idx + 1,
    'Admission No': s.id?.toString().padStart(4, '0'),
    'Student Name': s.name,
    "Father's Name": s.father_name,
    'CNIC / B-Form': s.cnic,
    'WhatsApp No': s.whatsapp_no || '',
    'Call No': s.call_no || '',
    'Address': s.address,
    'Level': s.level === 'inter' ? 'Inter' : 'BS',
    'Program': s.program_name || 'N/A',
    'Previous Program': s.previous_program === 'science' ? 'Science' : 'Arts',
    'Previous Institute': s.previous_institute,
    'Major Subjects': s.major_subjects,
    '9th Marks': s.marks_9th || '',
    '10th Marks': s.marks_10th || '',
    '11th Marks': s.marks_11th || '',
    '12th Marks': s.marks_12th || '',
    'Percentage': s.percentage ? s.percentage.toFixed(1) + '%' : '',
    'Fee (Rs.)': s.fee || 0,
    'Admission Date': s.created_at || ''
  }))
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!cols'] = [
    { wch: 5 }, { wch: 12 }, { wch: 25 }, { wch: 20 }, { wch: 18 },
    { wch: 15 }, { wch: 15 }, { wch: 30 }, { wch: 8 }, { wch: 25 },
    { wch: 18 }, { wch: 25 }, { wch: 25 }, { wch: 10 }, { wch: 11 },
    { wch: 11 }, { wch: 11 }, { wch: 12 }, { wch: 12 }, { wch: 18 }
  ]
  XLSX.utils.book_append_sheet(wb, ws, 'Students')
  XLSX.writeFile(wb, filePath)
  return { success: true, count: rows.length }
}

// ─── Database Backup ───

export function getDatabaseFilePath() {
  return join(app.getPath('userData'), 'admission.db')
}

export function backupDatabase(destPath) {
  const sourcePath = getDatabaseFilePath()
  copyFileSync(sourcePath, destPath)
  return { success: true, path: destPath }
}
