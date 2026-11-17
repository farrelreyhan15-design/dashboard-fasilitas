import { Hammer } from 'lucide-react'
import Header from '../components/Header.jsx'

// Halaman sementara untuk menu yang belum dibuat
export default function SegeraHadir({ judul }) {
  return (
    <>
      <Header judul={judul} subjudul="Halaman ini akan dibuat pada tahap berikutnya" />
      <div className="bg-white border border-line rounded-2xl p-10 flex flex-col items-center gap-3 text-center text-muted">
        <Hammer size={40} />
        <p className="font-semibold text-ink">Sedang dalam pengembangan</p>
        <p className="text-sm max-w-md">Fitur {judul} akan disusun setelah Dashboard, Data Ruangan, dan Data Fasilitas selesai.</p>
      </div>
    </>
  )
}
