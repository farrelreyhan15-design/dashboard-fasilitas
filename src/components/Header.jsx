import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth, NAMA_PERAN } from '../context/AuthContext.jsx'
import Lonceng from './Lonceng.jsx'

// Mengambil huruf depan nama, contoh "Farrel Reyhan" -> "FR"
function inisial(nama) {
  return nama
    .split(' ')
    .map((kata) => kata[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

// Judul halaman + notifikasi + profil pengguna yang sedang login + tombol keluar
export default function Header({ judul, subjudul }) {
  const { pengguna, logout } = useAuth()
  const navigate = useNavigate()

  async function keluar() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold">{judul}</h1>
        <p className="text-slate-600 mt-1">{subjudul}</p>
      </div>

      <div className="flex items-center gap-3">
        <Lonceng />

        <div className="flex items-center gap-3 pl-3 border-l border-line">
          <span className="size-11 rounded-full bg-primary text-white grid place-items-center font-bold">
            {inisial(pengguna.nama)}
          </span>
          <div className="leading-tight">
            <p className="font-bold">{pengguna.nama}</p>
            <p className="text-sm text-slate-600">{NAMA_PERAN[pengguna.peran]}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={keluar}
          className="inline-flex items-center gap-2 min-h-11 px-3.5 rounded-xl border border-line bg-white text-sm font-semibold hover:bg-slate-50"
        >
          <LogOut size={18} />
          <span className="hidden sm:inline">Keluar</span>
        </button>
      </div>
    </header>
  )
}
