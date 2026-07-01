# 📋 Admission Management System — Requirements Specification

**Project:** Desktop Admission Management System  
**Technology:** Electron + SQLite  
**Target OS:** Windows 10 & 11 (Windows 7 dropped)  
**Printer:** A4 Page (Silent Print)  
**Version:** 1.0.0  
**Status:** ✅ Approved (Phase I)

---

## 🎯 Project Overview

Manual admission process ko digital banana hai. Currently, student data entry Excel pe hoti hai, fee manually calculate hoti hai, print nikalna padta hai, aur SMS/WhatsApp alag se bhejne padte hain. Is software me yeh sara kaam automate karna hai ek single desktop application ke through.

---

## ✅ Must-Have Features (Core)

### 1. Smart Student Admission Form

#### 1.1 Admission Level Selection
- Dropdown: **"Inter Admission"** | **"BS Admission"**
- Is selection ke hisaab se form ke fields dynamically change honge.

#### 1.2 Common Fields (Sab Levels me)
| Field | Type | Validation |
|-------|------|------------|
| Name | Text | Required |
| Father Name | Text | Required |
| CNIC / B-Form | Text | Required |
| Address | Text | Required |
| Previous Institute | Text | Required |
| Major Subjects | Text | Required |
| Previous Program | Dropdown | Science / Arts |
| Admission Program | Dropdown | Dynamic (admin se add) |

#### 1.3 Contact Numbers — Smart Fields
- **WhatsApp No.** (Optional)
- **Call/SIM No.** (Optional)
- **Validation:** Kam az kam 1 number zaroori hai (dono optional but at least 1 required).
- **Real-time WhatsApp Check:** Jese hi user WhatsApp number field se focus hataye (onBlur), system check kare ke ye number WhatsApp pe register hai ya nahi. Agar hai to green tick (✅) show ho, otherwise kuch nahi dikhega. Implementation ke liye 3rd-party API use hogi (discuss karenge).

#### 1.4 Marks Logic — Smart Conditional Fields

**Inter Admission:**
- Default: 10th Marks field show ho.
- Checkbox: **"10th Result Available?"**
  - ✅ Yes → 10th Marks field active.
  - ❌ No → 10th Marks field hide, 9th Marks field show ho.
- **Logic:** 9th ke marks se kaam chalana hai agar 10th available nahi.

**BS Admission:**
- Default: 12th Marks field show ho.
- Checkbox: **"12th Result Available?"**
  - ✅ Yes → 12th Marks field active.
  - ❌ No → 12th Marks field hide, 11th Marks field show ho.
- **Logic:** 11th ke marks se kaam chalana hai agar 12th available nahi.

#### 1.5 Fee Auto-Calculation
- Marks (percentage) ke hisaab se fee auto-calculate ho.
- **Slab System (Configurable):**
  - Admin `Settings` screen se slabs edit kar sakta hai.
  - Example: `90%+ = Rs. 5000`, `80-89% = Rs. 8000`, etc.
- Fee calculation formula hardcode nahi — database se fetch hogi.

---

### 2. Database Save (SQLite)

- Save button dabane par record SQLite database me store ho.
- **Single Table Strategy:** `students` table me `level` column hoga (`inter` / `bs`) — schema phase me finalize karenge.
- Required documents checklist bhi save hogi (jo admin settings me define karega).

---

### 3. Two Save Options

Form par **2 buttons** honge:

| Button | Action |
|--------|--------|
| **Save Only** | Data DB me save ho, print nahi niklega |
| **Save + Print** | Data DB me save ho, aur turant print trigger ho |

---

### 4. Print (Two Templates — A4 Page)

#### 4.1 Print Triggers
- Jab `Save + Print` click ho.
- Records list me se kisi bhi student ko dobara print kar sakte hain (Edit screen se).

#### 4.2 Print Layout — A4 Page Division

| Section | Content |
|---------|---------|
| **Top** | Institute Name(s) + Logo (dynamic — program ke hisaab se) |
| **Middle** | All student data fields |
| **Middle** | Calculated Fee (bold/visible) |
| **Middle** | Required Documents Checklist (settings se fetch — max 5 items) |
| **Bottom** | End Instructions (settings se fetch — few lines) |

#### 4.3 Institute Name Logic (Dynamic)
- Jab admin **Admission Program** add karega, uske saath select karega:
  - `Institute Type:` Punjab College / Regional Institute / Both
- **Inter Admission:** Sirf "Punjab College Mian Channu" + logo print ho.
- **BS Admission:**
  - Agar program sirf Punjab College ka hai → sirf Punjab College print ho.
  - Agar program Regional Institute ka hai → sirf Regional Institute print ho.
  - Agar program dono ka hai → dono names + logos print ho.

#### 4.4 Print Preview
- Save+Print se pehle print preview dikhana optional hai (discuss karenge). Direct silent print bhi ho sakta hai.

---

### 5. Student Records List + Search + Edit + Delete

#### 5.1 Records List
- Table view me saare students dikhein (Inter + BS).
- Columns: Name, Father Name, Contact, Program, Level, Date/Time.
- Filter by Level (Inter / BS / All).

#### 5.2 Search
- By Name (partial match)
- By CNIC (exact)
- By Contact (exact)

#### 5.3 Edit
- Kisi bhi record par click → Edit screen open ho (same form with pre-filled data).
- Update karke Save karen to DB me update ho.

#### 5.4 Delete
- Delete button har record ke saath.
- Confirmation dialog: "Are you sure you want to delete this record?"
- Delete ke baad record permanently remove ho (ya soft delete — discuss karenge).

#### 5.5 Re-Print
- List me se kisi bhi student ka dobara print nikal sakte hain (button per record).

---

### 6. Per-Student Auto Message on Save (Must-Have)

- **Trigger:** Save (Save Only / Save+Print dono me) hone ke baad automatically message bhejna hai.
- **SMS:** Student ke Call/SIM number pe.
- **WhatsApp:** Student ke WhatsApp number pe (agar available ho).
- **Message Template:** Admin settings me define karega (e.g., *"Dear [Name], your admission at [Institute] has been confirmed. Fee: [Fee]. Regards..."*)
- **Technical:** Hardware (GSM modem) ya 3rd-party API (Twilio, etc.) — implementation phase me decide karenge.
- **Fallback:** Agar SMS fail ho to log me error save ho (user ko inform karein).

---

### 7. Reports (Must-Have)

#### 7.1 Area-wise Report
- Group by City / Area (address field se extract).
- Count of students per area.
- Pie chart / Bar chart optional (nice-to-have, but not mandatory).

#### 7.2 Program-wise Report
- Group by Admission Program.
- Count of students per program.
- Filter by date range.

#### 7.3 Report Filters
- Date Range (From - To)
- Level (Inter / BS / All)

---

## ⭐ Nice-to-Have Features (Optional)

| Feature | Description |
|---------|-------------|
| **Bulk SMS** | Compose message → send to all students (or filtered) |
| **Bulk WhatsApp** | Compose message → send to all students (or filtered) |
| **Excel Export** | Export data to `.xlsx` — options: Inter only, BS only, Both |
| **Auto Backup** | One-click database backup (copy `.db` file) |
| **Dashboard** | Summary cards: Total Admissions, Today's Admissions, Level-wise counts |

---

## 🗄️ Database Schema (Draft — Phase I)

### Table: `students`
| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY | Auto-increment |
| `level` | TEXT | 'inter' \| 'bs' |
| `name` | TEXT | |
| `father_name` | TEXT | |
| `cnic` | TEXT | |
| `whatsapp_no` | TEXT | Optional |
| `call_no` | TEXT | Optional |
| `address` | TEXT | |
| `previous_institute` | TEXT | |
| `major_subjects` | TEXT | |
| `previous_program` | TEXT | 'science' \| 'arts' |
| `admission_program` | TEXT | (FK to `programs` table) |
| `marks_9th` | INTEGER | Nullable |
| `marks_10th` | INTEGER | Nullable |
| `marks_11th` | INTEGER | Nullable |
| `marks_12th` | INTEGER | Nullable |
| `total_marks` | INTEGER | Calculated |
| `obtained_marks` | INTEGER | Calculated |
| `percentage` | REAL | Calculated |
| `fee` | REAL | Auto-calculated |
| `documents_checklist` | TEXT | JSON array of required docs |
| `created_at` | DATETIME | Default: CURRENT_TIMESTAMP |
| `updated_at` | DATETIME | |

### Table: `programs`
| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY | |
| `name` | TEXT | Program name (e.g., "F.Sc Pre-Medical") |
| `level` | TEXT | 'inter' \| 'bs' |
| `institute_type` | TEXT | 'punjab' \| 'regional' \| 'both' |
| `institute_name` | TEXT | Display name (e.g., "Punjab College Mian Channu") |
| `is_active` | INTEGER | 1 = Active, 0 = Inactive |

### Table: `settings`
| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY | |
| `key` | TEXT | Unique setting key |
| `value` | TEXT | JSON value |
| `updated_at` | DATETIME | |

**Settings Keys:**
- `fee_slabs`: JSON array `[{min: 90, max: 100, fee: 5000}, ...]`
- `documents_inter`: JSON array `["Matric Certificate", "CNIC Copy", "2 Photos"]`
- `documents_bs`: JSON array `["Inter Certificate", "CNIC Copy", "2 Photos"]`
- `print_instructions`: Text (few lines jo print ke end me dikhe)
- `message_template`: Text (SMS/WhatsApp template)
- `whatsapp_api_url`: Text (optional — agar API use karni hai)
- `whatsapp_api_key`: Text (optional)

---

## 🖥️ Technical Constraints

| Aspect | Decision |
|--------|----------|
| **Framework** | Electron.js |
| **Database** | SQLite (local file) |
| **Target OS** | Windows 10, Windows 11 |
| **Windows 7** | ❌ Dropped (Electron 23+ doesn't support) |
| **Printer** | A4 Page (Silent Print — no dialog) |
| **Language** | JavaScript / Node.js |
| **UI Library** | HTML/CSS/JS (vanilla) or React (TBD) |
| **Printing Library** | Electron's `webContents.print()` |

---

## 🎨 UI/UX Guidelines

1. **Form:** Clean, organized, logical grouping of fields.
2. **Responsive:** Windows resolution 1366x768 minimum target.
3. **Feedback:** Toast/alert notifications for save, print, delete actions.
4. **Loading States:** Show spinner during print/save.
5. **Confirmation Dialogs:** For delete, bulk actions.

---

## 📝 Edge Cases & Validation

| Scenario | Handling |
|----------|----------|
| **No contact number provided** | Validation error: "At least one contact number required" |
| **Marks > total marks** | Validation error |
| **Duplicate CNIC** | Alert: "Student with this CNIC already exists" (optional — discuss) |
| **WhatsApp API down** | Log error, continue with save (user informed) |
| **Printer not available** | Show error: "Printer not found. Please connect printer." |
| **Save+Print but printer error** | Data saved, print failed — user can print later from list |

---

## ✅ Phase I Deliverables Checklist

- [x] Requirements document (`requirements.md`)
- [ ] Print Templates Design (Inter + BS) — HTML/CSS
- [ ] Database Schema (Finalize)
- [ ] UI Wireframes / Mockups
- [ ] Project Setup (Electron + SQLite boilerplate)

---

## 📅 Next Steps

1. Approve this `requirements.md`.
2. Design print templates (2 A4 layouts) — show to client for review.
3. Finalize database schema.
4. Start Phase II — Implementation (Backend + Frontend).

---

## ✍️ Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Client | ________ | ____/____/2026 | __________ |
| Developer | ________ | ____/____/2026 | __________ |

---

**End of Requirements Document**