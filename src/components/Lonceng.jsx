import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  CheckCircle2,
  ClipboardCheck,
  DoorClosed,
  DoorOpen,
  SearchCheck,
  Trash2,
  Wrench,
  XCircle,
} from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useData } from '../context/DataContext.jsx'

// Ikon dan warna untuk setiap jenis notifikasi
function gaya(n) {
  switch (n.jenis) {
    case 'temuan':
      return { Ikon: AlertTriangle, warna: 'bg-bad-soft text-bad-ink' }
    case 'tugas':
      return { Ikon: ClipboardCheck, warna: 'bg-primary-soft text-primary' }
    case 'verifikasi':
      return { Ikon: SearchCheck, warna: 'bg-primary-soft text-primary' }
    case 'diproses':
      return { Ikon: Wrench, warna: 'bg-warn-soft text-warn-ink' }
    case 'selesai':
      return { Ikon: CheckCircle2, warna: 'bg-ok-soft text-ok-ink' }
    case 'ditolak':
      return { Ikon: XCircle, warna: 'bg-slate-100 text-slate-600' }
    default:
      // jenis 'ruangan': merah bila tidak dapat digunakan, hijau bila kembali dapat digunakan
      return n.judul.includes('kembali')
        ? { Ikon: DoorOpen, warna: 'bg-ok-soft text-ok-ink' }
        : { Ikon: DoorClosed, warna: 'bg-bad-soft text-bad-ink' }
  }
}

// "baru saja", "5 menit lalu", "3 jam lalu", "2 hari lalu", atau tanggal
function waktuRelatif(iso) {
  const detik = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (detik < 60) return 'baru saja'
  if (detik < 3600) return `${Math.floor(detik / 60)} menit lalu`
  if (detik < 86400) return `${Math.floor(detik / 3600)} jam lalu`
  if (detik < 7 * 86400) return `${Math.floor(detik / 86400)} hari lalu`
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Tombol lonceng + panel daftar notifikasi milik pengguna yang login
export default function Lonceng() {
  const { pengguna } = useAuth()
  const { muatUlang } = useData()
  const navigate = useNavigate()
  const [daftar, setDaftar] = useState([])
  const [terbuka, setTerbuka] = useState(false)
  const [galat, setGalat] = useState('')
  const wadah = useRef(null)
  const idPengguna = pengguna?.id

  const belumDibaca = daftar.filter((n) => !n.dibaca).length

  async function muat() {
    const { data, error } = await supabase
      .from('notifikasi')
      .select('*')
      .eq('penerima_id', idPengguna)
      .order('dibuat_pada', { ascending: false })
      .limit(30)
    setGalat(error ? 'Notifikasi gagal dimuat.' : '')
    if (data) setDaftar(data)
  }

  // Muat saat login, lalu dengarkan notifikasi baru secara langsung (Realtime)
  useEffect(() => {
    if (!idPengguna) return
    muat()

    const kanal = supabase
      .channel(`notifikasi-${idPengguna}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifikasi', filter: `penerima_id=eq.${idPengguna}` },
        (perubahan) => {
          setDaftar((lama) => [perubahan.new, ...lama.filter((n) => n.id !== perubahan.new.id)].slice(0, 30))
          muatUlang?.() // data di halaman ikut diperbarui tanpa reload
        },
      )
      .subscribe()

    // Cadangan: muat ulang saat tab browser kembali dibuka
    function saatTerlihat() {
      if (document.visibilityState === 'visible') muat()
    }
    document.addEventListener('visibilitychange', saatTerlihat)

    return () => {
      supabase.removeChannel(kanal)
      document.removeEventListener('visibilitychange', saatTerlihat)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idPengguna])

  // Tutup panel bila klik di luar atau tekan Esc
  useEffect(() => {
    if (!terbuka) return
    function klikLuar(e) {
      if (wadah.current && !wadah.current.contains(e.target)) setTerbuka(false)
    }
    function tombol(e) {
      if (e.key === 'Escape') setTerbuka(false)
    }
    document.addEventListener('mousedown', klikLuar)
    document.addEventListener('keydown', tombol)
    return () => {
      document.removeEventListener('mousedown', klikLuar)
      document.removeEventListener('keydown', tombol)
    }
  }, [terbuka])

  function bukaTutup() {
    if (!terbuka) muat()
    setTerbuka(!terbuka)
  }

  async function buka(n) {
    setTerbuka(false)
    if (!n.dibaca) {
      setDaftar((lama) => lama.map((x) => (x.id === n.id ? { ...x, dibaca: true } : x)))
      await supabase.from('notifikasi').update({ dibaca: true }).eq('id', n.id)
    }
    muatUlang?.()
    if (n.tautan) navigate(n.tautan)
  }

  async function tandaiSemua() {
    setDaftar((lama) => lama.map((x) => ({ ...x, dibaca: true })))
    await supabase.from('notifikasi').update({ dibaca: true }).eq('penerima_id', idPengguna).eq('dibaca', false)
  }

  async function hapusDibaca() {
    setDaftar((lama) => lama.filter((x) => !x.dibaca))
    await supabase.from('notifikasi').delete().eq('penerima_id', idPengguna).eq('dibaca', true)
  }

  return (
    <div ref={wadah} className="relative">
      <button
        type="button"
        onClick={bukaTutup}
        aria-label={belumDibaca ? `Notifikasi, ${belumDibaca} belum dibaca` : 'Notifikasi'}
        aria-expanded={terbuka}
        className={`relative size-11 grid place-items-center rounded-xl border bg-white hover:bg-slate-50 ${
          terbuka ? 'border-primary text-primary' : 'border-line'
        }`}
      >
        <Bell size={20} />
        {belumDibaca > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 grid place-items-center rounded-full bg-bad text-white text-[11px] font-bold ring-2 ring-white">
            {belumDibaca > 9 ? '9+' : belumDibaca}
          </span>
        )}
      </button>

      {terbuka && (
        <div className="fixed inset-x-3 top-16 z-40 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 rounded-2xl border border-line bg-white shadow-xl overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-line">
            <div>
              <p className="font-bold">Notifikasi</p>
              <p className="text-xs text-slate-500">
                {belumDibaca ? `${belumDibaca} belum dibaca` : 'Semua sudah dibaca'}
              </p>
            </div>
            {belumDibaca > 0 && (
              <button
                type="button"
                onClick={tandaiSemua}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-primary hover:bg-primary-soft"
              >
                <CheckCheck size={15} /> Tandai semua dibaca
              </button>
            )}
          </div>

          <div className="max-h-[min(26rem,calc(100vh-10rem))] overflow-y-auto">
            {galat && <p className="px-4 py-3 text-sm text-bad-ink">{galat}</p>}
            {!galat && daftar.length === 0 && (
              <div className="px-4 py-10 text-center text-slate-500">
                <Bell size={28} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm">Belum ada notifikasi.</p>
              </div>
            )}
            {daftar.map((n) => {
              const { Ikon, warna } = gaya(n)
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => buka(n)}
                  className={`w-full flex gap-3 px-4 py-3 text-left border-b border-line last:border-b-0 hover:bg-slate-50 ${
                    n.dibaca ? '' : 'bg-primary-soft/40'
                  }`}
                >
                  <span className={`size-9 shrink-0 grid place-items-center rounded-full ${warna}`}>
                    <Ikon size={17} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className={`block text-sm ${n.dibaca ? 'font-semibold text-slate-700' : 'font-bold'}`}>
                      {n.judul}
                    </span>
                    {n.pesan && <span className="block text-sm text-slate-600 line-clamp-2">{n.pesan}</span>}
                    <span className="block text-xs text-slate-500 mt-0.5">{waktuRelatif(n.dibuat_pada)}</span>
                  </span>
                  {!n.dibaca && <span className="size-2.5 shrink-0 mt-1.5 rounded-full bg-primary" aria-label="Belum dibaca" />}
                </button>
              )
            })}
          </div>

          {daftar.some((n) => n.dibaca) && (
            <button
              type="button"
              onClick={hapusDibaca}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 border-t border-line text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              <Trash2 size={14} /> Hapus notifikasi yang sudah dibaca
            </button>
          )}
        </div>
      )}
    </div>
  )
}
