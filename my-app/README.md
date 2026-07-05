<div align="center">
  <img src="./resources/icon.png" alt="PGC Logo" width="120" />
  <h1 align="center">🎓 PGC Admission Management System</h1>
  <p align="center">
    A comprehensive desktop application for managing student admissions at <strong>Punjab College Mian Channu</strong>
  </p>
  <p align="center">
    <strong>پنجاب کالج میان چنوں</strong> — داخلہ مینجمنٹ سسٹم
  </p>
  <p align="center">
    <img src="https://img.shields.io/badge/Electron-39+-47848F?logo=electron&logoColor=white" alt="Electron" />
    <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React" />
    <img src="https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white" alt="Vite" />
    <img src="https://img.shields.io/badge/SQLite-003B57?logo=sqlite&logoColor=white" alt="SQLite" />
    <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="Platform" />
  </p>
</div>

---

## 📋 Overview

**PGC Admission Management System** is a full-featured **Electron desktop application** built to streamline the admission process at Punjab College Mian Channu. It handles both **Inter (Intermediate)** and **BS (Bachelor's)** admissions across **Punjab College** and **RIAHS (Regional Institute of Allied Health Science & Higher Education)** campuses.

The system automates fee calculation based on student marks, generates printable admission slips, manages required document checklists, tracks WhatsApp messaging, and provides insightful reports — all running locally on your machine with zero internet dependency (except WhatsApp messaging).

---

## ✨ Features

### 📊 Dashboard
- Real-time statistics: total admissions, today's admissions, Inter/BS student counts
- Recent admissions list with key details
- Visual summary of institutional activity

### 🆕 New Admission
- **Dual Level Support**: Inter (F.Sc, ICS, I.Com, DIT, etc.) & BS (ADP programs)
- **Dual Campus Support**: Punjab College & RIAHS
- **Smart Fee Calculation**:
  - Inter: Marks-based tuition fee slabs with configurable brackets
  - BS: Fixed fee structure (Admission + Exam + Semester fees)
- **Live Fee Preview**: Real-time fee breakdown as you enter marks
- **Editable Fee Components**: Adjust individual fee components before saving
- **Validation**: Required field checks, contact number validation, marks range validation
- **Save + Print**: Save record and immediately print admission slip
- **Auto Form Reset**: Clean slate after each successful admission

### 📝 Student Records
- Searchable, filterable table of all admitted students
- **Edit Records**: Update student information anytime
- **Delete Records**: Remove with confirmation prompt
- **Export to Excel**: One-click export of all records to `.xlsx` format
- **Print Admission Slip**: Reprint slips from records
- **Level Filter**: Filter by Inter or BS students

### 💬 Messages
- **Single WhatsApp Messaging**: Open WhatsApp Web with pre-filled student message
- **Message History**: View all sent messages per student
- **Quick Send**: Enter to send, Shift+Enter for new line
- **Bulk Messaging UI**: Select multiple students (requires WhatsApp Business API)
- **Message Templates**: Configurable templates with placeholders (`[Name]`, `[Institute]`, `[Fee]`)

### 📈 Reports
- **Area-wise Report**: View admissions grouped by student address/city
- **Program-wise Report**: View admissions grouped by program
- **Date Range Filtering**: Filter reports by custom date ranges
- **Level Filter**: Inter, BS, or All
- **Percentage Calculation**: Automatic student count and percentage breakdowns

### ⚙️ Settings
- **Fee Configuration**:
  - Inter: Admission Fee, Annual Fund, and marks-based tuition slabs
  - BS: Admission Fee, In-House Exam Fee, and Semester Fee
- **Document Checklists**: Configure required documents for both Inter and BS (name & quantity)
- **Print Settings**: Customizable instructions displayed on printed admission slips
- **Message Templates**: Configurable WhatsApp/SMS message templates
- **Programs Management**: Add, edit, or delete admission programs
  - Inter programs: F.Sc Pre-Medical, F.Sc Pre-Engineering, ICS, I.Com, DIT, F.A (IT)
  - BS programs: ADP Computer Science, Business Administration, AI, Cybersecurity, and more
  - RIAHS programs: BS MLT, BS HND, BS Biotechnology, and more
- **Database Backup**: One-click backup of the entire SQLite database

### 🖨️ Print Preview
- A4-format admission confirmation slip
- Displays student personal info, admission details, fee breakdown
- Required documents checklist
- Customizable instructions
- Signature section (Student/Parent & Admission Incharge)
- Print directly or close and return

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| **[Electron 39](https://www.electronjs.org/)** | Desktop application framework |
| **[React 19](https://react.dev/)** | UI library |
| **[Vite 7](https://vitejs.dev/)** | Build tool & HMR |
| **[React Router 7](https://reactrouter.com/)** | Client-side routing (HashRouter) |
| **[better-sqlite3](https://github.com/WiseLibs/better-sqlite3)** | Local SQLite database |
| **[electron-vite](https://electron-vite.org/)** | Electron + Vite integration |
| **[electron-builder](https://www.electron.build/)** | Cross-platform packaging |
| **[XLSX](https://sheetjs.com/)** | Excel export functionality |
| **[Twilio](https://www.twilio.com/)** | SMS API (available for integration) |

---

## 🚀 Getting Started

### Prerequisites

- **[Node.js](https://nodejs.org/)** (v18 or later)
- **npm** (comes with Node.js)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/pgc-admission-system.git
cd pgc-admission-system/my-app

# Install dependencies
npm install
```

### Development

```bash
# Start the application in development mode (with hot reload)
npm run dev
```

### Build for Production

```bash
# Build for your current platform
npm run build && electron-builder

# Or use platform-specific commands:
npm run build:win     # Windows installer
npm run build:mac     # macOS DMG
npm run build:linux   # Linux AppImage
```

### Lint & Format

```bash
npm run lint        # Run ESLint
npm run format      # Format code with Prettier
```

---

## 📂 Project Structure

```
my-app/
├── resources/
│   └── icon.png                  # Application icon
├── src/
│   ├── main/
│   │   ├── index.js              # Electron main process
│   │   ├── database.js           # SQLite database setup, CRUD, reports
│   │   └── ipc.js                # IPC handler registrations
│   ├── preload/
│   │   └── index.js              # Context bridge (exposes API to renderer)
│   └── renderer/
│       ├── index.html            # HTML entry point
│       └── src/
│           ├── main.jsx           # React entry point
│           ├── App.jsx            # Router configuration
│           ├── assets/
│           │   ├── base.css       # Base styles
│           │   ├── main.css       # Application styles
│           │   └── punjabcollege.png  # Campus logo
│           ├── components/
│           │   ├── Layout.jsx     # App shell with sidebar navigation
│           │   ├── Icons.jsx      # SVG icon components
│           │   └── PrintPreview.jsx  # A4-format print modal
│           └── pages/
│               ├── Dashboard.jsx      # Stats overview
│               ├── NewAdmission.jsx    # Admission form
│               ├── StudentRecords.jsx  # Student CRUD table
│               ├── Messages.jsx        # WhatsApp messaging
│               ├── Reports.jsx         # Area/program-wise reports
│               └── Settings.jsx        # All configurable settings
├── electron-builder.yml          # Build configuration
├── electron.vite.config.mjs      # Vite configuration
├── package.json                  # Dependencies and scripts
└── README.md                     # This file
```

---

## 💾 Database

The application uses **SQLite** via `better-sqlite3` for local data storage. The database file (`admission.db`) is automatically created in the user's app data directory on first launch.

**Tables:**
- `students` — All admitted student records
- `programs` — Admission programs (Inter & BS)
- `settings` — Application configuration (fee slabs, documents, templates)
- `message_logs` — WhatsApp/SMS message history

**Backup:** Use the Settings → Backup tab to create a database backup anytime.

---

## 🔌 IPC API Reference

The renderer process communicates with the main process via Electron IPC. The following APIs are exposed through `window.api`:

### Students
| Method | Description |
|---|---|
| `api.students.getAll(filters)` | Get all students (with optional filters) |
| `api.students.getById(id)` | Get student by ID |
| `api.students.create(data)` | Create new student record |
| `api.students.update(id, data)` | Update existing student |
| `api.students.delete(id)` | Delete student record |
| `api.students.exportExcel()` | Export all students to Excel file |

### Programs
| Method | Description |
|---|---|
| `api.programs.getAll(level)` | Get all programs (optional level filter) |
| `api.programs.create(data)` | Create new program |
| `api.programs.update(id, data)` | Update program |
| `api.programs.delete(id)` | Delete program |

### Settings
| Method | Description |
|---|---|
| `api.settings.getAll()` | Get all settings |
| `api.settings.get(key)` | Get setting by key |
| `api.settings.update(key, value)` | Update setting |

### Reports
| Method | Description |
|---|---|
| `api.reports.areaWise(filters)` | Get area-wise report |
| `api.reports.programWise(filters)` | Get program-wise report |
| `api.reports.dashboard()` | Get dashboard statistics |

### Messages
| Method | Description |
|---|---|
| `api.messages.getLogs(studentId?)` | Get message logs |
| `api.messages.log(data)` | Log a sent message |

### Database
| Method | Description |
|---|---|
| `api.database.backup()` | Create database backup |
| `api.database.getFilePath()` | Get database file path |

---

## 🧪 Fee Calculation Logic

### Inter Students
```
Total Fee = Admission Fee + Annual Fund + Tuition Fee
```
- **Tuition Fee**: Determined by percentage marks using configurable slabs (e.g., 90-100% → Rs. 5,000)
- **Marks used**: 10th class marks (if available), otherwise 9th class marks

### BS Students
```
Total Fee = Admission Fee + In-House Exam Fee + Semester Fee
```
- All BS programs have a uniform fixed fee structure (configurable in Settings)

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is developed for **Punjab College Mian Channu** internal use.

---

## 👨‍💻 Developer

**Sarfraz** — IT Department, Punjab College Mian Channu

<div align="center">
  <br />
  <p>
    <strong>PGC Admission Management System</strong><br />
    © 2025 Sarfraz. All rights reserved.
  </p>
</div>
