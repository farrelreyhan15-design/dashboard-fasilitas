import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar.jsx'

// Kerangka semua halaman: sidebar di kiri, isi halaman di kanan.
export default function Layout() {
  const [menuTerbuka, setMenuTerbuka] = useState(false)

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar terbuka={menuTerbuka} tutup={() => setMenuTerbuka(false)} />

      <div className="flex-1 min-w-0">
        {/* Tombol menu hanya muncul di layar kecil (HP) */}
        <div className="lg:hidden flex items-center gap-3 bg-navy text-white px-4 py-3">
          <button
            type="button"
            aria-label="Buka menu"
            onClick={() => setMenuTerbuka(true)}
            className="size-11 grid place-items-center rounded-lg hover:bg-navy-soft"
          >
            <Menu size={22} />
          </button>
          <span className="font-bold">Facility Monitoring</span>
        </div>

        <main className="p-4 sm:p-6 lg:p-7 flex flex-col gap-5">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
