import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import DataRuangan from './pages/DataRuangan.jsx'
import DataFasilitas from './pages/DataFasilitas.jsx'
import SegeraHadir from './pages/SegeraHadir.jsx'

// Daftar halaman (route). Menambah halaman baru = menambah satu baris <Route>.
export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
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
