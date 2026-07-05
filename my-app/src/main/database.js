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
      cnic TEXT DEFAULT '',
      whatsapp_no TEXT DEFAULT '',
      call_no TEXT DEFAULT '',
      address TEXT NOT NULL,
      previous_institute TEXT NOT NULL,
      major_subjects TEXT NOT NULL,
      previous_program TEXT NOT NULL DEFAULT '',
      admission_program_id INTEGER,
      marks_9th INTEGER,
      marks_10th INTEGER,
      marks_11th INTEGER,
      marks_12th INTEGER,
      total_marks INTEGER DEFAULT 0,
      obtained_marks INTEGER DEFAULT 0,
      percentage REAL DEFAULT 0,
      fee REAL DEFAULT 0,
      fee_breakdown TEXT DEFAULT '{}',
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

  // Migration: handle old CHECK constraint on previous_program & add fee_breakdown if missing (if table already existed with old schema)
  try {
    const tableInfo = db.prepare("PRAGMA table_info('students')").all()
    const cnicCol = tableInfo.find(col => col.name === 'cnic')
    const feeBreakdownCol = tableInfo.find(col => col.name === 'fee_breakdown')
    
    if (cnicCol && cnicCol.notnull === 1) {
      // Old schema (cnic was NOT NULL) - recreate the table
      db.exec(`
        PRAGMA foreign_keys = OFF;
        CREATE TABLE students_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          level TEXT NOT NULL CHECK(level IN ('inter', 'bs')),
          name TEXT NOT NULL,
          father_name TEXT NOT NULL,
          cnic TEXT DEFAULT '',
          whatsapp_no TEXT DEFAULT '',
          call_no TEXT DEFAULT '',
          address TEXT NOT NULL,
          previous_institute TEXT NOT NULL,
          major_subjects TEXT NOT NULL,
          previous_program TEXT NOT NULL DEFAULT '',
          admission_program_id INTEGER,
          marks_9th INTEGER,
          marks_10th INTEGER,
          marks_11th INTEGER,
          marks_12th INTEGER,
          total_marks INTEGER DEFAULT 0,
          obtained_marks INTEGER DEFAULT 0,
          percentage REAL DEFAULT 0,
          fee REAL DEFAULT 0,
          fee_breakdown TEXT DEFAULT '{}',
          documents_checklist TEXT DEFAULT '[]',
          created_at DATETIME DEFAULT (datetime('now', 'localtime')),
          updated_at DATETIME DEFAULT (datetime('now', 'localtime')),
          FOREIGN KEY (admission_program_id) REFERENCES programs(id)
        );
        INSERT INTO students_new SELECT * FROM students;
        DROP TABLE students;
        ALTER TABLE students_new RENAME TO students;
        PRAGMA foreign_keys = ON;
      `)
    } else if (!feeBreakdownCol) {
      // Newer schema exists but fee_breakdown column is missing - add it
      db.exec("ALTER TABLE students ADD COLUMN fee_breakdown TEXT DEFAULT '{}'")
    }
  } catch (e) {
    // Migration might fail if columns don't match, but that's ok
    console.error('Migration error (non-fatal):', e.message)
  }

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
      key: 'inter_admission_fee',
      value: JSON.stringify(5000)
    },
    {
      key: 'inter_annual_fund',
      value: JSON.stringify(2000)
    },
    {
      key: 'bs_admission_fee',
      value: JSON.stringify(3000)
    },
    {
      key: 'bs_inhouse_exam_fee',
      value: JSON.stringify(1000)
    },
    {
      key: 'bs_semester_fee',
      value: JSON.stringify(50000)
    },
    {
      key: 'documents_inter',
      value: JSON.stringify([
        { name: '10th Result Card Copy (if have), otherwise 9th Result Card Copy and 10th Roll Number Slip Copy', quantity: 1 },
        { name: 'Photographs (Passport Size, Blue Background) Without Attestation', quantity: 4 },
        { name: 'Photocopy of CNIC or Bay Form of Student', quantity: 1 },
        { name: 'Photocopy of CNIC of Father/Guardian', quantity: 1 }
      ])
    },
    {
      key: 'documents_bs',
      value: JSON.stringify([
        { name: 'Photocopy of 10th Result Card', quantity: 1 },
        { name: 'Photocopy of 2nd Year Result Card', quantity: 2 },
        { name: 'Photographs (Passport Size, Blue Background)', quantity: 8 },
        { name: 'Photocopy of CNIC/Bay Form of Student', quantity: 2 },
        { name: 'Photocopy of CNIC of Father/Guardian', quantity: 1 },
        { name: 'NOC Required (in case of any other than BISE Multan)', quantity: 1 }
      ])
    },
    {
      key: 'print_instructions_inter',
      value: JSON.stringify(
        'Dues, once paid, are not refundable/ adjustable in any case.\nCollege fees will be revised with a 10% increment.'
      )
    },
    {
      key: 'print_instructions_bs',
      value: JSON.stringify(
        'Prospectus / Admission Form price: Rs.6000\nUniversity Registration fee is separately charged according to UNI Schedule only in 1st Semester.\nUniversity Examination fee each semester is separate according to UNI Schedule.\nIn House Exam fee each Semester separately charged Rs.2000/- (may vary according to applicable Policy)\nDues, once paid, are not refundable/ adjustable in any case.\nSemester Fee may change in next semesters according to Credit Hours / Head Office policy.\nSemester full fee must be clear before Mid Term Exam'
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

  // Migration: ensure all Inter programs exist (total 6)
  const interProgramNames = ['F.Sc Pre-Medical', 'F.Sc Pre-Engineering', 'ICS', 'I.Com', 'DIT', 'F.A (IT)']
  const insertInterProgram = db.prepare(
    "INSERT OR IGNORE INTO programs (name, level, institute_type, institute_name) VALUES (?, 'inter', 'punjab', 'Punjab College Mian Channu')"
  )
  for (const progName of interProgramNames) {
    const existing = db.prepare("SELECT id FROM programs WHERE name = ? AND level = 'inter'").get(progName)
    if (!existing) {
      insertInterProgram.run(progName)
    }
  }

  // Migration: rename old RIAHS programs to proper names FIRST (before inserting new names to avoid duplicates)
  const riahsNamings = {
    'HND': 'BS HND',
    'Biotechnology': 'BS Biotechnology',
    'Zoology': 'BS Zoology',
    'English': 'BS English',
    'AI': 'BS AI',
    'CS': 'BSCS',
    'IT': 'BSIT',
    'SE': 'BS SE'
  }
  for (const [oldName, newName] of Object.entries(riahsNamings)) {
    db.prepare("UPDATE programs SET name = ? WHERE name = ? AND level = 'bs' AND institute_type = 'regional'").run(newName, oldName)
  }

  // Migration: ensure all new RIAHS BS program names exist (INSERT OR IGNORE skips if rename already created them)
  const riahsProgramNames = [
    'BS MLT', 'BS HND', 'BS Biotechnology', 'BS Zoology', 'BS English',
    'BS AI', 'BSCS', 'BSIT', 'BS SE', 'ADS-CS'
  ]
  const insertRiahsProgram = db.prepare(
    "INSERT OR IGNORE INTO programs (name, level, institute_type, institute_name) VALUES (?, 'bs', 'regional', 'Regional Institute of Allied Health Science')"
  )
  for (const progName of riahsProgramNames) {
    insertRiahsProgram.run(progName)
  }

  // Update existing BS programs (B.S. Computer Science & B.S. Business Administration) to have institute_type = 'both'
  db.prepare("UPDATE programs SET institute_type = 'both' WHERE level = 'bs' AND institute_type = 'punjab'").run()

  // Migration: update existing documents_inter and documents_bs to new format
  const oldDocsInter = db.prepare("SELECT value FROM settings WHERE key = 'documents_inter'").get()
  if (oldDocsInter) {
    const oldVal = JSON.parse(oldDocsInter.value)
    // Check if it's the old string format (not {name, quantity} objects)
    if (oldVal.length > 0 && typeof oldVal[0] === 'string') {
      db.prepare(`
        UPDATE settings SET value = ?, updated_at = datetime('now', 'localtime')
        WHERE key = 'documents_inter'
      `).run(JSON.stringify([
        { name: '10th Result Card Copy (if have), otherwise 9th Result Card Copy and 10th Roll Number Slip Copy', quantity: 1 },
        { name: 'Photographs (Passport Size, Blue Background) Without Attestation', quantity: 4 },
        { name: 'Photocopy of CNIC or Bay Form of Student', quantity: 1 },
        { name: 'Photocopy of CNIC of Father/Guardian', quantity: 1 }
      ]))
    }
  }

  const oldDocsBs = db.prepare("SELECT value FROM settings WHERE key = 'documents_bs'").get()
  if (oldDocsBs) {
    const oldVal = JSON.parse(oldDocsBs.value)
    if (oldVal.length > 0 && typeof oldVal[0] === 'string') {
      db.prepare(`
        UPDATE settings SET value = ?, updated_at = datetime('now', 'localtime')
        WHERE key = 'documents_bs'
      `).run(JSON.stringify([
        { name: 'Photocopy of 10th Result Card', quantity: 1 },
        { name: 'Photocopy of 2nd Year Result Card', quantity: 2 },
        { name: 'Photographs (Passport Size, Blue Background)', quantity: 8 },
        { name: 'Photocopy of CNIC/Bay Form of Student', quantity: 2 },
        { name: 'Photocopy of CNIC of Father/Guardian', quantity: 1 },
        { name: 'NOC Required (in case of any other than BISE Multan)', quantity: 1 }
      ]))
    }
  }

  // Migration: rename old Punjab College BS programs to have ADP prefix FIRST (before inserting new names to avoid duplicates)
  const adpNamings = {
    'Artificial Intelligence': 'ADP Artificial Intelligence',
    'Cyber Security': 'ADP Cyber Security',
    'Software Engineering': 'ADP Software Engineering',
    'Data Science': 'ADP Data Science',
    'Computer Science': 'ADP Computer Science',
    'Business Administration': 'ADP Business Administration',
    'Business Analytics': 'ADP Business Analytics',
    'Accounting and Finance': 'ADP Accounting and Finance',
    'Culinary Arts': 'ADP Culinary Arts',
    'Biotechnology': 'ADP Biotechnology',
    'Psychology': 'ADP Psychology',
    'Biochemistry': 'ADP Biochemistry',
    'Chemistry': 'ADP Chemistry',
    'Zoology': 'ADP Zoology',
    'Botany': 'ADP Botany',
    'Physics': 'ADP Physics',
    'Mathematics': 'ADP Mathematics',
    'English': 'ADP English',
    'B.S. Computer Science': 'ADP Computer Science',
    'B.S. Business Administration': 'ADP Business Administration'
  }
  for (const [oldName, newName] of Object.entries(adpNamings)) {
    db.prepare("UPDATE programs SET name = ? WHERE name = ? AND level = 'bs' AND (institute_type = 'punjab' OR institute_type = 'both')").run(newName, oldName)
  }

  // Also update 'both' type programs to 'punjab' since RIAHS now has its own separate programs
  db.prepare("UPDATE programs SET institute_type = 'punjab' WHERE name LIKE 'ADP %' AND level = 'bs' AND institute_type = 'both'").run()

  // Migration: ensure Punjab College ADP BS programs exist (INSERT OR IGNORE skips if rename already created them)
  const adpProgramNames = [
    'ADP Artificial Intelligence', 'ADP Cyber Security', 'ADP Software Engineering', 'ADP Data Science',
    'ADP Computer Science', 'ADP Business Administration', 'ADP Business Analytics', 'ADP Accounting and Finance',
    'ADP Culinary Arts', 'ADP Biotechnology', 'ADP Psychology', 'ADP Biochemistry', 'ADP Chemistry',
    'ADP Zoology', 'ADP Botany', 'ADP Physics', 'ADP Mathematics', 'ADP English'
  ]
  const insertAdpProgram = db.prepare(
    "INSERT OR IGNORE INTO programs (name, level, institute_type, institute_name) VALUES (?, 'bs', 'punjab', 'Punjab College Mian Channu')"
  )
  for (const progName of adpProgramNames) {
    insertAdpProgram.run(progName)
  }

  // Migration: remove duplicate programs (keep lowest ID) and add UNIQUE(name, level) constraint
  try {
    // Find duplicate programs (same name + level)
    const duplicates = db.prepare(`
      SELECT name, level, COUNT(*) as cnt
      FROM programs
      GROUP BY name, level
      HAVING cnt > 1
    `).all()

    if (duplicates.length > 0) {
      console.log('Found duplicate programs, cleaning up...')
      const deleteDupe = db.prepare('DELETE FROM programs WHERE id = ?')
      for (const dup of duplicates) {
        // Get all IDs for this name+level, ordered by ID ascending
        const rows = db.prepare(
          'SELECT id FROM programs WHERE name = ? AND level = ? ORDER BY id'
        ).all(dup.name, dup.level)
        // Keep the first (lowest ID — preserves foreign key references), delete the rest
        for (let i = 1; i < rows.length; i++) {
          deleteDupe.run(rows[i].id)
        }
      }
    }

    // Add UNIQUE constraint on (name, level) by recreating the table
    // Check if constraint already exists (origin='u' means created by UNIQUE constraint)
    const hasUnique = db.prepare(`
      SELECT COUNT(*) as cnt FROM pragma_index_list('programs') 
      WHERE origin = 'u'
    `).get().cnt > 0

    if (!hasUnique) {
      db.exec(`
        PRAGMA foreign_keys = OFF;
        CREATE TABLE programs_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          level TEXT NOT NULL CHECK(level IN ('inter', 'bs')),
          institute_type TEXT NOT NULL CHECK(institute_type IN ('punjab', 'regional', 'both')),
          institute_name TEXT NOT NULL DEFAULT '',
          is_active INTEGER NOT NULL DEFAULT 1,
          UNIQUE(name, level)
        );
        INSERT INTO programs_new SELECT * FROM programs;
        DROP TABLE programs;
        ALTER TABLE programs_new RENAME TO programs;
        PRAGMA foreign_keys = ON;
      `)
    }
  } catch (e) {
    console.error('Migration error (non-fatal):', e.message)
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
      ['DIT', 'inter', 'punjab', 'Punjab College Mian Channu'],
      ['F.A (IT)', 'inter', 'punjab', 'Punjab College Mian Channu'],
      ['ADP Computer Science', 'bs', 'punjab', 'Punjab College Mian Channu'],
      ['ADP Business Administration', 'bs', 'punjab', 'Punjab College Mian Channu'],
      ['ADP Artificial Intelligence', 'bs', 'punjab', 'Punjab College Mian Channu'],
      ['ADP Cyber Security', 'bs', 'punjab', 'Punjab College Mian Channu'],
      ['ADP Software Engineering', 'bs', 'punjab', 'Punjab College Mian Channu'],
      ['ADP Data Science', 'bs', 'punjab', 'Punjab College Mian Channu'],
      ['ADP Business Analytics', 'bs', 'punjab', 'Punjab College Mian Channu'],
      ['ADP Accounting and Finance', 'bs', 'punjab', 'Punjab College Mian Channu'],
      ['ADP Culinary Arts', 'bs', 'punjab', 'Punjab College Mian Channu'],
      ['ADP Psychology', 'bs', 'punjab', 'Punjab College Mian Channu'],
      ['ADP Biochemistry', 'bs', 'punjab', 'Punjab College Mian Channu'],
      ['ADP Chemistry', 'bs', 'punjab', 'Punjab College Mian Channu'],
      ['ADP Zoology', 'bs', 'punjab', 'Punjab College Mian Channu'],
      ['ADP Botany', 'bs', 'punjab', 'Punjab College Mian Channu'],
      ['ADP Physics', 'bs', 'punjab', 'Punjab College Mian Channu'],
      ['ADP Mathematics', 'bs', 'punjab', 'Punjab College Mian Channu'],
      ['ADP Biotechnology', 'bs', 'punjab', 'Punjab College Mian Channu'],
      ['ADP English', 'bs', 'punjab', 'Punjab College Mian Channu']
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

  const students = db.prepare(query).all(...params)
  // Parse JSON fields
  return students.map(s => ({
    ...s,
    fee_breakdown: typeof s.fee_breakdown === 'string' ? JSON.parse(s.fee_breakdown) : (s.fee_breakdown || {}),
    documents_checklist: typeof s.documents_checklist === 'string' ? JSON.parse(s.documents_checklist) : (s.documents_checklist || [])
  }))
}

export function getStudentById(id) {
  const db = getDatabase()
  const student = db.prepare(`
    SELECT s.*, p.name as program_name, p.institute_type, p.institute_name
    FROM students s
    LEFT JOIN programs p ON s.admission_program_id = p.id
    WHERE s.id = ?
  `).get(id)
  if (!student) return null
  return {
    ...student,
    fee_breakdown: typeof student.fee_breakdown === 'string' ? JSON.parse(student.fee_breakdown) : (student.fee_breakdown || {}),
    documents_checklist: typeof student.documents_checklist === 'string' ? JSON.parse(student.documents_checklist) : (student.documents_checklist || [])
  }
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
      totalMarks = 1100
    } else if (data.marks_9th) {
      marksFields.push('marks_9th')
      totalMarks = 550
    }
  } else {
    if (data.marks_12th) {
      marksFields.push('marks_12th')
      totalMarks = 1100
    } else if (data.marks_11th) {
      marksFields.push('marks_11th')
      totalMarks = 550
    }
  }

  if (marksFields.length > 0) {
    const field = marksFields[0]
    obtainedMarks = data[field] || 0
  }

  const percentage = totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0

  // Get program name for BS semester fee calculation
  let programName = ''
  if (data.admission_program_id) {
    const prog = db.prepare('SELECT name FROM programs WHERE id = ?').get(data.admission_program_id)
    if (prog) programName = prog.name
  }

  // Calculate fee — use custom fee if provided, otherwise auto-calculate
  let fee, feeBreakdown
  if (data.fee !== undefined && data.fee !== null) {
    fee = parseFloat(data.fee) || 0
    feeBreakdown = JSON.stringify(data.fee_breakdown || {})
  } else {
    const feeResult = calculateFee(data.level, percentage, programName)
    fee = feeResult.total
    feeBreakdown = JSON.stringify(feeResult.components)
  }

  const stmt = db.prepare(`
    INSERT INTO students (
      level, name, father_name, cnic, whatsapp_no, call_no,
      address, previous_institute, major_subjects, previous_program,
      admission_program_id, marks_9th, marks_10th, marks_11th, marks_12th,
      total_marks, obtained_marks, percentage, fee, fee_breakdown, documents_checklist
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    feeBreakdown,
    JSON.stringify(data.documents_checklist || [])
  )

  return { id: result.lastInsertRowid, fee, percentage, totalMarks, obtainedMarks, feeBreakdown }
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
      totalMarks = 1100
    } else if (data.marks_9th) {
      marksFields.push('marks_9th')
      totalMarks = 550
    }
  } else {
    if (data.marks_12th) {
      marksFields.push('marks_12th')
      totalMarks = 1100
    } else if (data.marks_11th) {
      marksFields.push('marks_11th')
      totalMarks = 550
    }
  }

  if (marksFields.length > 0) {
    const field = marksFields[0]
    obtainedMarks = data[field] || 0
  }

  const percentage = totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0

  // Get program name for BS semester fee calculation
  let programName = ''
  if (data.admission_program_id) {
    const prog = db.prepare('SELECT name FROM programs WHERE id = ?').get(data.admission_program_id)
    if (prog) programName = prog.name
  }

  // Calculate fee — use custom fee if provided, otherwise auto-calculate
  let fee, feeBreakdown
  if (data.fee !== undefined && data.fee !== null) {
    fee = parseFloat(data.fee) || 0
    feeBreakdown = JSON.stringify(data.fee_breakdown || {})
  } else {
    const feeResult = calculateFee(data.level, percentage, programName)
    fee = feeResult.total
    feeBreakdown = JSON.stringify(feeResult.components)
  }

  const stmt = db.prepare(`
    UPDATE students SET
      level = ?, name = ?, father_name = ?, cnic = ?, whatsapp_no = ?,
      call_no = ?, address = ?, previous_institute = ?, major_subjects = ?,
      previous_program = ?, admission_program_id = ?,
      marks_9th = ?, marks_10th = ?, marks_11th = ?, marks_12th = ?,
      total_marks = ?, obtained_marks = ?, percentage = ?, fee = ?,
      fee_breakdown = ?, documents_checklist = ?, updated_at = datetime('now', 'localtime')
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
    feeBreakdown,
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

export function calculateFee(level, percentage, programName = '') {
  const db = getDatabase()

  if (level === 'inter') {
    // Inter: Admission Fee + Annual Fund + Tuition Fee (marks-based)
    const admissionSetting = db.prepare("SELECT value FROM settings WHERE key = 'inter_admission_fee'").get()
    const annualSetting = db.prepare("SELECT value FROM settings WHERE key = 'inter_annual_fund'").get()
    const slabsSetting = db.prepare("SELECT value FROM settings WHERE key = 'fee_slabs'").get()

    const admissionFee = admissionSetting ? JSON.parse(admissionSetting.value) : 0
    const annualFund = annualSetting ? JSON.parse(annualSetting.value) : 0

    let tuitionFee = 0
    if (slabsSetting) {
      const slabs = JSON.parse(slabsSetting.value)
      slabs.sort((a, b) => a.min - b.min)
      for (const slab of slabs) {
        if (percentage >= slab.min && percentage <= slab.max) {
          tuitionFee = slab.fee
          break
        }
      }
      if (tuitionFee === 0 && slabs.length > 0) {
        tuitionFee = slabs[slabs.length - 1].fee
      }
    }

    return {
      total: admissionFee + annualFund + tuitionFee,
      components: {
        admission_fee: admissionFee,
        annual_fund: annualFund,
        tuition_fee: tuitionFee
      }
    }
  } else {
    // BS: Admission Fee + In-House Exam Fee + Semester Fee (single for all programs)
    const admissionSetting = db.prepare("SELECT value FROM settings WHERE key = 'bs_admission_fee'").get()
    const examSetting = db.prepare("SELECT value FROM settings WHERE key = 'bs_inhouse_exam_fee'").get()
    const semFeeSetting = db.prepare("SELECT value FROM settings WHERE key = 'bs_semester_fee'").get()

    const admissionFee = admissionSetting ? JSON.parse(admissionSetting.value) : 0
    const examFee = examSetting ? JSON.parse(examSetting.value) : 0
    const semesterFee = semFeeSetting ? JSON.parse(semFeeSetting.value) : 50000

    return {
      total: admissionFee + examFee + semesterFee,
      components: {
        admission_fee: admissionFee,
        inhouse_exam_fee: examFee,
        semester_fee: semesterFee
      }
    }
  }
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
  // Check if program with same name and level already exists
  const existing = db.prepare('SELECT id FROM programs WHERE name = ? AND level = ?').get(data.name, data.level)
  if (existing) {
    throw new Error(`Program "${data.name}" already exists for ${data.level.toUpperCase()} level`)
  }
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

export function getMessageLogs(studentId = null) {
  const db = getDatabase()
  if (studentId) {
    return db.prepare(`
      SELECT ml.*, s.name as student_name
      FROM message_logs ml
      LEFT JOIN (SELECT id, name FROM students) s ON ml.student_id = s.id
      WHERE ml.student_id = ?
      ORDER BY ml.created_at DESC
    `).all(studentId)
  }
  return db.prepare(`
    SELECT ml.*, s.name as student_name
    FROM message_logs ml
    LEFT JOIN (SELECT id, name FROM students) s ON ml.student_id = s.id
    ORDER BY ml.created_at DESC
    LIMIT 100
  `).all()
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
    'Program': s.program_name || 'N/A',      'Previous Program': s.previous_program === 'science' ? 'Science' : s.previous_program === 'arts' ? 'Arts' : s.previous_program || '',
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
