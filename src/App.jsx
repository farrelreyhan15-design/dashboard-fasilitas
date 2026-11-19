import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import DataRuangan from './pages/DataRuangan.jsx'
import DataFasilitas from './pages/DataFasilitas.jsx'
import SegeraHadir from './pages/SegeraHadir.jsx'
import Login from './pages/Login.jsx'
import { useAuth } from './context/AuthContext.jsx'

// Penjaga halaman: kalau belum login, arahkan ke halaman login
function WajibLogin({ children }) {
  const { pengguna } = useAuth()
  return pengguna ? children : <Navigate to="/login" replace />
}

// Daftar halaman (route). Menambah halaman baru = menambah satu baris <Route>.
export default function App() {
  return (
    <Routes>
      {/* Halaman yang bisa dibuka tanpa login */}
      <Route path="/login" element={<Login />} />

      {/* Semua halaman di bawah ini wajib login dulu */}
      <Route
        element={
          <WajibLogin>
            <Layout />
          </WajibLogin>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/ruangan" element={<DataRuangan />} />
        <Route path="/fasilitas" element={<DataFasilitas />} />
        <Route path="/pemeliharaan" element={<SegeraHadir judul="Pemeliharaan" />} />
        <Route path="/rapid-inspection" element={<SegeraHadir judul="Rapid Inspection" />} />
        <Route path="/laporan" element={<SegeraHadir judul="Laporan" />} />
        <Route path="/pengaturan" element={<SegeraHadir judul="Pengaturan" />} />
        <Route path="*" element={<SegeraHadir judul="Halaman tidak ditemukan" />} />
      </Route>
    </Routes>
  )
}