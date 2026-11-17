import { Bell } from 'lucide-react'

// Judul halaman + tombol notifikasi + profil pengguna
export default function Header({ judul, subjudul }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold">{judul}</h1>
        <p className="text-slate-600 mt-1">{subjudul}</p>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="Notifikasi, 3 baru"
          className="relative size-11 grid place-items-center rounded-xl border border-line bg-white hover:bg-slate-50"
        >
          <Bell size={20} />
          <span className="absolute top-2 right-2.5 size-2.5 rounded-full bg-bad" />
        </button>
        <div className="flex items-center gap-3 pl-4 border-l border-line">
          <span className="size-11 rounded-full bg-blue-800 text-white grid place-items-center font-bold">FR</span>
          <div className="leading-tight">
            <p className="font-bold">Farrel Reyhan</p>
            <p className="text-sm text-slate-600">Sarana Prasarana</p>
          </div>
        </div>
      </div>
    </header>
  )
}
