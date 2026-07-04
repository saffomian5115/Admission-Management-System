import { HashRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import NewAdmission from './pages/NewAdmission'
import StudentRecords from './pages/StudentRecords'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Messages from './pages/Messages'

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="new-admission" element={<NewAdmission />} />
          <Route path="records" element={<StudentRecords />} />
          <Route path="messages" element={<Messages />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default App
