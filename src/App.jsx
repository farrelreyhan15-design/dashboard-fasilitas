import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import DataRuangan from './pages/DataRuangan.jsx'
import DataFasilitas from './pages/DataFasilitas.jsx'
import SegeraHadir from './pages/SegeraHadir.jsx'
import Laporan from './pages/Laporan.jsx'
import Pemeliharaan from './pages/Pemeliharaan.jsx'
import Login from './pages/Login.jsx'
import Pengaturan from './pages/Pengaturan.jsx'
import RapidInspection from './pages/RapidInspection.jsx'
import { useAuth } from './context/AuthContext.jsx'

// Penjaga 1: kalau belum login, arahkan ke halaman login
function WajibLogin({ children }) {
  const { pengguna } = useAuth()
  return pengguna ? children : <Navigate to="/login" replace />
}

// Penjaga 2: kalau peran tidak diizinkan, kembalikan ke Dashboard
function HanyaUntuk({ aksi, children }) {
  const { bisa } = useAuth()
  return bisa(aksi) ? children : <Navigate to="/" replace />
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
        {/* Terbuka untuk semua peran */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/ruangan" element={<DataRuangan />} />
        <Route path="/fasilitas" element={<DataFasilitas />} />

        {/* Hanya untuk peran tertentu */}
        <Route
          path="/pemeliharaan"
          element={
            <HanyaUntuk aksi="pemeliharaan">
              <Pemeliharaan />
            </HanyaUntuk>
          }
        />
        <Route
          path="/rapid-inspection"
          element={
            <HanyaUntuk aksi="rapidInspection">
              <RapidInspection />
            </HanyaUntuk>
          }
        />
        <Route
          path="/laporan"
          element={
            <HanyaUntuk aksi="laporan">
              <Laporan />
            </HanyaUntuk>
          }
        />
        <Route
          path="/pengaturan"
          element={
            <HanyaUntuk aksi="pengaturan">
              <Pengaturan />
            </HanyaUntuk>
          }
        />

        <Route path="*" element={<SegeraHadir judul="Halaman tidak ditemukan" />} />
      </Route>
    </Routes>
  )
}
