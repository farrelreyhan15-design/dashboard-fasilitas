import { NavLink } from 'react-router-dom'
import {
  Building2, Home, LayoutList, Briefcase, Activity, Wrench, ClipboardCheck, FileText, Settings, X,
} from 'lucide-react'

// Daftar menu di sidebar. Menambah menu = menambah satu baris di sini.
const MENU = [
  { ke: '/', label: 'Dashboard', ikon: Home },
  { ke: '/ruangan', label: 'Data Ruangan', ikon: LayoutList },
  { ke: '/fasilitas', label: 'Data Fasilitas', ikon: Briefcase },
  { ke: '/monitoring', label: 'Monitoring', ikon: Activity, lencana: 'Real-Time', samaDengan: '/' },
  { ke: '/pemeliharaan', label: 'Pemeliharaan', ikon: Wrench },
  { ke: '/rapid-inspection', label: 'Rapid Inspection', ikon: ClipboardCheck },
  { ke: '/laporan', label: 'Laporan', ikon: FileText },
  { ke: '/pengaturan', label: 'Pengaturan', ikon: Settings },
]

export default function Sidebar({ terbuka, tutup }) {
  return (
    <>
      {/* Latar gelap di belakang menu saat dibuka di HP */}
      {terbuka && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={tutup} />}

      <nav
        aria-label="Menu utama"
        className={`fixed lg:static z-40 inset-y-0 left-0 w-64 shrink-0 bg-navy text-white
          px-3.5 py-6 flex flex-col gap-7 transition-transform
          ${terbuka ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:min-h-screen`}
      >
        <div className="flex items-center gap-3 px-2 pb-5 border-b border-white/10">
          <Building2 size={36} strokeWidth={1.6} />
          <span className="text-xl font-bold leading-tight">
            Facility
            <br />
            Monitoring
          </span>
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={tutup}
            className="ml-auto size-10 grid place-items-center rounded-lg hover:bg-navy-soft lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <ul className="flex flex-col gap-1">
          {MENU.map(({ ke, label, ikon: Ikon, lencana, samaDengan }) => (
            <li key={label}>
              <NavLink
                to={samaDengan ?? ke}
                end
                onClick={tutup}
                className={({ isActive }) =>
                  `flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-[15px] transition-colors
                  ${isActive && !samaDengan ? 'bg-blue-600 font-semibold' : 'text-slate-200 hover:bg-navy-soft'}`
                }
              >
                <Ikon size={20} />
                {label}
                {lencana && (
                  <span className="ml-auto text-[11px] font-bold px-2 py-0.5 rounded-md bg-green-700">{lencana}</span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="mt-auto p-3.5 rounded-xl bg-navy-soft">
          <p className="text-xs text-slate-300">Lokasi dipantau</p>
          <p className="text-sm font-semibold">Gedung 4 · UISI</p>
        </div>
      </nav>
    </>
  )
}
