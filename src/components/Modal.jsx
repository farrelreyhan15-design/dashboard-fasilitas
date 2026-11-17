import { X } from 'lucide-react'

// Jendela pop-up untuk form (Tambah Ruangan, Tambah Fasilitas)
export default function Modal({ judul, keterangan, tutup, children, footer }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-start justify-center p-4 sm:p-12 overflow-y-auto">
      <div role="dialog" aria-modal="true" aria-label={judul} className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl">
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-line">
          <div>
            <h2 className="text-xl font-extrabold">{judul}</h2>
            {keterangan && <p className="text-sm text-muted mt-0.5">{keterangan}</p>}
          </div>
          <button
            type="button"
            aria-label="Tutup"
            onClick={tutup}
            className="size-10 shrink-0 grid place-items-center rounded-xl border border-line hover:bg-slate-50"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-line">{footer}</div>
      </div>
    </div>
  )
}

// Gaya yang dipakai ulang untuk input dan tombol
export const gayaInput =
  'w-full min-h-11 px-3 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary'
export const gayaLabel = 'flex flex-col gap-1.5 text-[13px] font-semibold'
export const tombolUtama =
  'inline-flex items-center justify-center gap-2 min-h-11 px-5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark'
export const tombolKedua =
  'inline-flex items-center justify-center gap-2 min-h-11 px-5 rounded-xl border border-slate-300 bg-white text-sm font-semibold hover:bg-slate-50'
