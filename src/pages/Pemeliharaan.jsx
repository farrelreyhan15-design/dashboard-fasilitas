import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Search, Filter, ChevronLeft, ChevronRight, CheckCircle2, X, Inbox, Wrench, Ban, MapPin, ScanSearch, UserRound,
  ImagePlus, ArrowRight, Package, ClipboardCheck, UserCheck, AlarmClock, CalendarClock, Hammer, Plus, Pencil, Trash2,
  Wallet, ListChecks, CalendarPlus, Repeat, MessageSquarePlus,
} from 'lucide-react'
import Header from '../components/Header.jsx'
import InfoMuat from '../components/InfoMuat.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import Modal, { gayaInput, gayaLabel, tombolUtama, tombolKedua } from '../components/Modal.jsx'
import { useData } from '../context/DataContext.jsx'
import { useAuth, NAMA_PERAN } from '../context/AuthContext.jsx'
import { DAFTAR_KAMPUS, gedungDiKampus } from '../data/konstanta.js'

const PER_HALAMAN = 8
const MAKS_FOTO = 3

// ===================== Label & warna =====================

export const STATUS_TIKET = {
  baru: { label: 'Baru', ikon: Inbox, gaya: 'bg-bad-soft text-bad-ink' },
  verifikasi: { label: 'Verifikasi', ikon: UserCheck, gaya: 'bg-violet-50 text-violet-700' },
  terverifikasi: { label: 'Terverifikasi', ikon: ClipboardCheck, gaya: 'bg-warn-soft text-warn-ink' },
  diproses: { label: 'Diproses', ikon: Wrench, gaya: 'bg-sky-50 text-sky-700' },
  selesai: { label: 'Selesai', ikon: CheckCircle2, gaya: 'bg-ok-soft text-ok-ink' },
  ditolak: { label: 'Ditolak', ikon: Ban, gaya: 'bg-slate-100 text-slate-600' },
}
const PRIORITAS = {
  tinggi: { label: 'Tinggi', gaya: 'bg-bad text-white' },
  sedang: { label: 'Sedang', gaya: 'bg-warn text-white' },
  rendah: { label: 'Rendah', gaya: 'bg-slate-200 text-slate-700' },
}
const URUT_PRIORITAS = { tinggi: 0, sedang: 1, rendah: 2 }
const JENIS_TINDAKAN = {
  perbaikan_internal: 'Perbaikan internal',
  vendor: 'Panggil vendor/teknisi luar',
  penggantian: 'Penggantian (ganti baru)',
  servis_rutin: 'Servis rutin',
}
const TERBUKA = ['baru', 'verifikasi', 'terverifikasi', 'diproses']

export function PilStatus({ status }) {
  const s = STATUS_TIKET[status] ?? STATUS_TIKET.baru
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold px-2.5 py-1 rounded-full ${s.gaya}`}>
      <s.ikon size={13} />
      {s.label}
    </span>
  )
}

function PilPrioritas({ prioritas }) {
  const p = PRIORITAS[prioritas] ?? PRIORITAS.sedang
  return <span className={`text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md ${p.gaya}`}>{p.label}</span>
}

const rupiah = (n) =>
  n === null || n === undefined ? '-' : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
const hariIni = () => {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}
const tglIndo = (ymd) => (ymd ? new Date(`${ymd}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-')
const terlambat = (l) => l.status === 'diproses' && l.targetSelesai && l.targetSelesai < hariIni()

function teksJumlah(l, f) {
  if (l.jenis === 'preventif') return `${l.jumlah} ${f?.satuan ?? 'unit'} (servis rutin)`
  const keadaan = l.kondisi === 'rusak' ? 'rusak' : 'bermasalah'
  return f ? `${l.jumlah} dari ${f.jumlah} ${f.satuan} ${keadaan}` : `${l.jumlah} unit ${keadaan}`
}

// ===================== Halaman =====================

export default function Pemeliharaan() {
  const { pengguna } = useAuth()
  const [tampilan, setTampilan] = useState('tiket')
  const sarpras = pengguna?.peran === 'sarpras'

  return (
    <>
      <Header
        judul="Pemeliharaan"
        subjudul={sarpras ? 'Tindak lanjut kerusakan sampai selesai diperbaiki, dan jadwal pemeliharaan rutin' : 'Tugas verifikasi lapangan dari Sarana Prasarana'}
      />
      <InfoMuat />
      {sarpras && (
        <div role="tablist" className="flex gap-1 p-1 rounded-xl bg-slate-200/60 self-start">
          {[['tiket', 'Tiket Kerusakan', ListChecks], ['jadwal', 'Jadwal Preventif', CalendarClock]].map(([k, l, Ikon]) => (
            <button key={k} type="button" role="tab" aria-selected={tampilan === k} onClick={() => setTampilan(k)}
              className={`min-h-10 px-4 rounded-lg text-sm font-semibold inline-flex items-center gap-2 ${tampilan === k ? 'bg-white text-primary shadow-sm' : 'text-slate-600'}`}>
              <Ikon size={16} /> {l}
            </button>
          ))}
        </div>
      )}
      {tampilan === 'jadwal' && sarpras ? <JadwalPreventif pindahKeTiket={() => setTampilan('tiket')} /> : <DaftarTiket />}
    </>
  )
}

// ===================== Daftar tiket =====================

function DaftarTiket() {
  const { ruang, fasilitas, laporan } = useData()
  const { pengguna } = useAuth()
  const sarpras = pengguna?.peran === 'sarpras'
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState(sarpras ? 'aktif' : 'tugas')
  const [cari, setCari] = useState('')
  const [gedung, setGedung] = useState('Semua')
  const [halaman, setHalaman] = useState(1)
  const [pesan, setPesan] = useState('')
  const areaDetail = useRef(null)

  const ruangById = Object.fromEntries(ruang.map((r) => [r.id, r]))
  const fasilitasById = Object.fromEntries(fasilitas.map((f) => [f.id, f]))

  // PKTL hanya melihat tiket yang pernah ditugaskan kepadanya
  const tiketSaya = sarpras ? laporan : laporan.filter((l) => l.petugasVerifikasiId === pengguna?.id)

  const TAB = sarpras
    ? [
        ['aktif', 'Aktif', (l) => TERBUKA.includes(l.status)],
        ['baru', 'Baru', (l) => l.status === 'baru'],
        ['verifikasi', 'Verifikasi', (l) => l.status === 'verifikasi'],
        ['terverifikasi', 'Terverifikasi', (l) => l.status === 'terverifikasi'],
        ['diproses', 'Diproses', (l) => l.status === 'diproses'],
        ['terlambat', 'Terlambat', terlambat],
        ['selesai', 'Selesai', (l) => l.status === 'selesai'],
        ['ditolak', 'Ditolak', (l) => l.status === 'ditolak'],
      ]
    : [
        ['tugas', 'Perlu diverifikasi', (l) => l.status === 'verifikasi'],
        ['riwayat', 'Sudah diverifikasi', (l) => l.status !== 'verifikasi'],
      ]
  const saringTab = Object.fromEntries(TAB.map(([k, , fn]) => [k, fn]))

  const tampil = tiketSaya
    .filter(saringTab[tab] ?? (() => true))
    .filter((l) => {
      const r = ruangById[l.ruangId]
      return (
        (gedung === 'Semua' || r?.gedung === gedung) &&
        `${l.namaFasilitas} ${r?.nama ?? ''} #${l.id} ${l.teknisi} ${l.pelapor}`.toLowerCase().includes(cari.toLowerCase())
      )
    })
    .sort((a, b) =>
      TERBUKA.includes(a.status) && TERBUKA.includes(b.status)
        ? URUT_PRIORITAS[a.prioritas] - URUT_PRIORITAS[b.prioritas] || new Date(a.dibuatAsli) - new Date(b.dibuatAsli)
        : new Date(b.dibuatAsli) - new Date(a.dibuatAsli),
    )

  const jumlahHalaman = Math.max(1, Math.ceil(tampil.length / PER_HALAMAN))
  const halamanAman = Math.min(halaman, jumlahHalaman)
  const awal = (halamanAman - 1) * PER_HALAMAN
  const dipilih = tiketSaya.find((l) => l.id === params.get('id')) ?? tampil[0] ?? null

  // Kartu ringkasan (Sarpras)
  const bulanIni = hariIni().slice(0, 7)
  const selesaiBulanIni = laporan.filter((l) => l.status === 'selesai' && l.selesaiAsli?.slice(0, 7) === bulanIni)
  const kartu = [
    { label: 'Baru', nilai: laporan.filter((l) => l.status === 'baru').length, ikon: Inbox, warna: 'bg-bad-soft text-bad' },
    { label: 'Menunggu Verifikasi', nilai: laporan.filter((l) => l.status === 'verifikasi').length, ikon: UserCheck, warna: 'bg-violet-50 text-violet-700' },
    { label: 'Siap Dikerjakan', nilai: laporan.filter((l) => l.status === 'terverifikasi').length, ikon: ClipboardCheck, warna: 'bg-warn-soft text-amber-700' },
    { label: 'Diproses', nilai: laporan.filter((l) => l.status === 'diproses').length, ikon: Wrench, warna: 'bg-sky-50 text-sky-700' },
    { label: 'Terlambat', nilai: laporan.filter(terlambat).length, ikon: AlarmClock, warna: 'bg-bad-soft text-bad' },
    { label: 'Selesai Bulan Ini', nilai: selesaiBulanIni.length, ikon: CheckCircle2, warna: 'bg-ok-soft text-ok' },
    { label: 'Biaya Bulan Ini', nilai: rupiah(selesaiBulanIni.reduce((n, l) => n + (l.biayaAktual ?? 0), 0)), ikon: Wallet, warna: 'bg-slate-100 text-slate-600', kecil: true },
  ]

  function pilih(id) {
    setParams({ id })
    if (window.innerWidth < 1280) setTimeout(() => areaDetail.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const daftarGedung = [...new Set(tiketSaya.map((l) => ruangById[l.ruangId]?.gedung).filter(Boolean))].sort()

  return (
    <>
      {pesan && (
        <div role="status" className="flex items-center gap-3 p-3.5 rounded-xl bg-ok-soft border border-green-200 text-ok-ink">
          <CheckCircle2 size={22} />
          <span className="flex-1 text-sm font-semibold">{pesan}</span>
          <button type="button" aria-label="Tutup pemberitahuan" onClick={() => setPesan('')} className="size-9 grid place-items-center">
            <X size={18} />
          </button>
        </div>
      )}

      {sarpras && (
        <section aria-label="Ringkasan pemeliharaan" className="grid gap-3 grid-cols-2 md:grid-cols-4 2xl:grid-cols-7">
          {kartu.map(({ label, nilai, ikon: Ikon, warna, kecil }) => (
            <div key={label} className="bg-white border border-line rounded-2xl p-3.5 flex items-center gap-3">
              <span className={`size-10 shrink-0 rounded-xl grid place-items-center ${warna}`}>
                <Ikon size={20} />
              </span>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-slate-600 leading-tight">{label}</p>
                <p className={`${kecil ? 'text-base' : 'text-2xl'} font-extrabold`}>{nilai}</p>
              </div>
            </div>
          ))}
        </section>
      )}

      <div className="grid gap-4 items-start xl:grid-cols-[minmax(0,1fr)_minmax(400px,1.15fr)]">
        <section aria-label="Daftar tiket" className="bg-white border border-line rounded-2xl p-4 flex flex-col gap-3.5 min-w-0">
          <h2 className="text-lg font-extrabold">{sarpras ? 'Tiket Kerusakan' : 'Tugas Verifikasi Saya'}</h2>

          <div role="tablist" className="flex gap-1 p-1 rounded-xl bg-slate-100 overflow-x-auto">
            {TAB.map(([kode, label, fn]) => {
              const n = tiketSaya.filter(fn).length
              return (
                <button key={kode} type="button" role="tab" aria-selected={tab === kode}
                  onClick={() => { setTab(kode); setHalaman(1) }}
                  className={`min-h-10 px-3 rounded-lg text-[13px] font-semibold whitespace-nowrap
                    ${tab === kode ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}>
                  {label} ({n})
                </button>
              )
            })}
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-2">
            <label className="relative">
              <span className="sr-only">Cari tiket</span>
              <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input className={`${gayaInput} pl-9`} value={cari} placeholder="Cari fasilitas, ruangan, teknisi…"
                onChange={(e) => { setCari(e.target.value); setHalaman(1) }} />
            </label>
            <label className="relative">
              <span className="sr-only">Filter gedung</span>
              <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <select value={gedung} className={`${gayaInput} pl-8 w-32`} onChange={(e) => { setGedung(e.target.value); setHalaman(1) }}>
                <option value="Semua">Gedung</option>
                {daftarGedung.map((g) => <option key={g}>{g}</option>)}
              </select>
            </label>
          </div>

          <ul className="flex flex-col gap-2">
            {tampil.slice(awal, awal + PER_HALAMAN).map((l) => {
              const r = ruangById[l.ruangId]
              const aktif = l.id === dipilih?.id
              return (
                <li key={l.id}>
                  <button type="button" onClick={() => pilih(l.id)} aria-current={aktif ? 'true' : undefined}
                    className={`w-full text-left p-3.5 rounded-xl border flex flex-col gap-2 ${aktif ? 'bg-primary-soft border-primary/30' : 'border-line hover:bg-slate-50'}`}>
                    <span className="flex items-start justify-between gap-2">
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-1.5">
                          {TERBUKA.includes(l.status) && <PilPrioritas prioritas={l.prioritas} />}
                          <span className="font-bold">{l.namaFasilitas}</span>
                          <span className="font-semibold text-muted">· {r?.nama}</span>
                        </span>
                        <span className="block text-xs text-muted mt-0.5">
                          #{l.id} · {l.dibuat} · {l.jenis === 'preventif' ? 'Pemeliharaan rutin' : `oleh ${l.pelapor}`}
                        </span>
                      </span>
                      <PilStatus status={l.status} />
                    </span>
                    <span className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
                      {l.kondisi && <StatusBadge status={l.kondisi} />}
                      <span>{teksJumlah(l, fasilitasById[l.fasilitasId])}</span>
                      {l.status === 'verifikasi' && <span>· verifikasi oleh {l.petugasVerifikasi}</span>}
                      {l.status === 'diproses' && l.targetSelesai && <span>· target {tglIndo(l.targetSelesai)}</span>}
                      {terlambat(l) && (
                        <span className="inline-flex items-center gap-1 font-bold text-bad-ink"><AlarmClock size={13} /> Terlambat</span>
                      )}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          {tampil.length === 0 && (
            <p className="text-sm text-muted text-center py-8">
              {sarpras
                ? 'Tidak ada tiket di sini. Temuan Bermasalah/Rusak dari Rapid Inspection otomatis masuk sebagai tiket Baru.'
                : 'Belum ada tugas verifikasi untuk Anda.'}
            </p>
          )}

          <div className="flex items-center justify-between gap-2 text-[13px] text-muted">
            <span>Menampilkan {tampil.length ? awal + 1 : 0}–{Math.min(awal + PER_HALAMAN, tampil.length)} dari {tampil.length} tiket</span>
            <div className="flex items-center gap-1">
              <button type="button" aria-label="Halaman sebelumnya" disabled={halamanAman === 1} onClick={() => setHalaman(halamanAman - 1)}
                className="size-9 grid place-items-center rounded-lg border border-line disabled:opacity-40"><ChevronLeft size={16} /></button>
              <span className="min-w-9 h-9 px-2 grid place-items-center rounded-lg bg-primary text-white font-semibold">{halamanAman}</span>
              <button type="button" aria-label="Halaman berikutnya" disabled={halamanAman === jumlahHalaman} onClick={() => setHalaman(halamanAman + 1)}
                className="size-9 grid place-items-center rounded-lg border border-line disabled:opacity-40"><ChevronRight size={16} /></button>
            </div>
          </div>
        </section>

        <div ref={areaDetail} className="scroll-mt-4 min-w-0">
          {dipilih ? (
            <DetailTiket key={dipilih.id} l={dipilih} setPesan={setPesan} />
          ) : (
            <section className="bg-white border border-line rounded-2xl p-8 text-center text-sm text-muted">Pilih tiket untuk melihat detailnya.</section>
          )}
        </div>
      </div>
    </>
  )
}

// ===================== Detail tiket =====================

function DetailTiket({ l, setPesan }) {
  const { ruang, fasilitas, unit, ambilProgres, ubahPrioritas } = useData()
  const { pengguna } = useAuth()
  const sarpras = pengguna?.peran === 'sarpras'
  const r = ruang.find((x) => x.id === l.ruangId)
  const f = fasilitas.find((x) => x.id === l.fasilitasId)
  const milikUnit = unit.filter((u) => u.fasilitasId === l.fasilitasId)
  const unitTiket = milikUnit.filter((u) => l.unitIds.includes(u.id))
  const terbuka = TERBUKA.includes(l.status)
  const petugasSaya = l.petugasVerifikasiId === pengguna?.id

  const [aksi, setAksi] = useState(null) // panel aksi yang sedang dibuka
  const [progres, setProgres] = useState(null)
  const [versi, setVersi] = useState(0)

  useEffect(() => {
    let masihTerpasang = true
    ambilProgres(l.id).then((h) => masihTerpasang && setProgres(h.data))
    return () => {
      masihTerpasang = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [l.id, l.status, versi])

  function berhasil(teks) {
    setAksi(null)
    setVersi((v) => v + 1)
    setPesan(teks)
  }

  // Tahapan
  const sudahVerifikasi = Boolean(l.diverifikasi)
  const langkah = [
    { label: 'Dilaporkan', ket: l.dibuat, selesai: true },
    { label: 'Verifikasi', ket: l.diverifikasi || (l.status === 'verifikasi' ? `oleh ${l.petugasVerifikasi}` : '-'), selesai: sudahVerifikasi },
    { label: 'Dikerjakan', ket: l.diproses || '-', selesai: ['diproses', 'selesai'].includes(l.status) },
    { label: l.status === 'ditolak' ? 'Ditolak' : 'Selesai', ket: l.selesai || '-', selesai: ['selesai', 'ditolak'].includes(l.status) },
  ]

  // Tombol aksi sesuai status
  const tombol = []
  if (sarpras && terbuka) {
    if (['baru', 'verifikasi', 'terverifikasi'].includes(l.status)) {
      tombol.push(['tugaskan', l.status === 'baru' ? 'Tugaskan Verifikasi' : 'Tugaskan Ulang', UserCheck])
      tombol.push(['verifikasi', 'Verifikasi Sendiri', ClipboardCheck])
    }
    if (l.status === 'baru' || (l.status === 'terverifikasi' && l.hasilVerifikasi !== 'bukan_kerusakan')) tombol.push(['mulai', 'Mulai Kerjakan', Hammer])
    if (l.status === 'diproses') {
      tombol.push(['progres', 'Tambah Progres', MessageSquarePlus])
      tombol.push(['selesai', 'Selesaikan', CheckCircle2])
    }
    tombol.push(['tolak', l.status === 'diproses' ? 'Batalkan' : 'Tolak', Ban])
  }

  return (
    <section aria-label={`Detail tiket ${l.id}`} className="bg-white border border-line rounded-2xl p-4 sm:p-5 flex flex-col gap-4">
      {/* Kepala */}
      <div className="flex items-start gap-3.5">
        <span className="size-13 shrink-0 rounded-xl bg-primary-soft text-primary grid place-items-center">
          {l.jenis === 'preventif' ? <Repeat size={26} /> : <Package size={26} />}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-muted">
            Tiket #{l.id} · {l.jenis === 'preventif' ? 'Pemeliharaan rutin (preventif)' : 'Perbaikan (korektif)'}
          </p>
          <p className="text-xl font-extrabold leading-tight">{l.namaFasilitas}</p>
          <p className="text-[13px] text-muted inline-flex items-center gap-1">
            <MapPin size={13} /> {r ? `${r.kampus} › ${r.gedung} › ${r.nama}` : '-'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <PilStatus status={l.status} />
          {terlambat(l) && <span className="text-xs font-bold text-bad-ink inline-flex items-center gap-1"><AlarmClock size={13} /> Terlambat</span>}
        </div>
      </div>

      {/* Tahapan */}
      <ol className="grid grid-cols-4 gap-2">
        {langkah.map((s, i) => (
          <li key={s.label} className="flex flex-col gap-1 min-w-0">
            <span className={`h-1.5 rounded-full ${s.selesai ? (l.status === 'ditolak' && i === 3 ? 'bg-slate-400' : 'bg-ok') : 'bg-slate-200'}`} />
            <span className={`text-xs font-semibold ${s.selesai ? 'text-ink' : 'text-muted'}`}>{s.label}</span>
            <span className="text-[11px] text-muted truncate">{s.ket}</span>
          </li>
        ))}
      </ol>

      {/* Info */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <dt className="text-xs text-muted">Prioritas</dt>
          <dd>
            {sarpras && terbuka ? (
              <select aria-label="Ubah prioritas" value={l.prioritas}
                onChange={async (e) => { const h = await ubahPrioritas(l.id, e.target.value); if (!h.error) setPesan(`Prioritas tiket #${l.id} diubah.`) }}
                className="h-9 px-2 rounded-lg border border-slate-300 text-sm font-semibold">
                {Object.entries(PRIORITAS).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}
              </select>
            ) : (
              <PilPrioritas prioritas={l.prioritas} />
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Kondisi fasilitas sekarang</dt>
          <dd>{f ? <StatusBadge status={f.kondisi} /> : <span className="text-muted">Fasilitas sudah dihapus</span>}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">{l.jenis === 'preventif' ? 'Cakupan' : 'Temuan'}</dt>
          <dd className="flex flex-col items-start gap-1">
            {l.kondisi && <StatusBadge status={l.kondisi} />}
            <span className="text-xs text-slate-600">{teksJumlah(l, f)}</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">{l.jenis === 'preventif' ? 'Dibuat oleh' : 'Pelapor'}</dt>
          <dd className="font-semibold">
            {l.pelapor} <span className="font-normal text-muted">({NAMA_PERAN[l.peranPelapor] ?? l.peranPelapor})</span>
            <span className="block text-xs font-normal text-muted inline-flex items-center gap-1">
              {l.sumber === 'inspeksi' ? <ScanSearch size={12} /> : l.sumber === 'jadwal' ? <CalendarClock size={12} /> : <UserRound size={12} />}
              {{ inspeksi: 'Rapid Inspection', jadwal: 'Jadwal preventif', manual: 'Laporan manual' }[l.sumber]}
            </span>
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs text-muted">{l.jenis === 'preventif' ? 'Kegiatan' : 'Keterangan temuan'}</dt>
          <dd className="font-semibold">{l.catatan || '-'}</dd>
        </div>
      </dl>
      <Galeri foto={l.foto} judul="Foto temuan" />

      {/* Verifikasi */}
      {(l.petugasVerifikasi || l.diverifikasi) && (
        <Blok judul="Verifikasi lapangan" ikon={UserCheck}>
          {l.petugasVerifikasi && <Baris label="Ditugaskan ke" nilai={`${l.petugasVerifikasi} (${l.ditugaskan})`} />}
          {l.diverifikasi && (
            <>
              <Baris label="Hasil" nilai={l.hasilVerifikasi === 'valid' ? 'Kerusakan benar ada' : 'Bukan kerusakan'} tebal />
              <Baris label="Diverifikasi" nilai={`${l.diverifikasiOleh} (${l.diverifikasi})`} />
              {unitTiket.length > 0 && <Baris label="Unit rusak" nilai={unitTiket.map((u) => u.kodeAset).join(', ')} mono />}
              <Baris label="Catatan" nilai={l.catatanVerifikasi} />
            </>
          )}
          <Galeri foto={l.fotoVerifikasi} judul="Foto verifikasi" />
          {l.hasilVerifikasi === 'bukan_kerusakan' && terbuka && sarpras && (
            <p className="text-[13px] text-warn-ink bg-warn-soft rounded-lg px-3 py-2">Hasil verifikasi menyatakan bukan kerusakan. Tolak tiket ini, atau tugaskan verifikasi ulang.</p>
          )}
        </Blok>
      )}

      {/* Rencana & hasil */}
      {l.jenisTindakan && (
        <Blok judul="Rencana tindakan" ikon={Hammer}>
          <Baris label="Jenis tindakan" nilai={JENIS_TINDAKAN[l.jenisTindakan]} />
          <Baris label="Teknisi / PJ" nilai={l.teknisi} tebal />
          <Baris label="Target selesai" nilai={tglIndo(l.targetSelesai)} />
          <Baris label="Estimasi biaya" nilai={rupiah(l.estimasiBiaya)} />
          {l.tindakLanjut && l.status === 'diproses' && <Baris label="Catatan" nilai={l.tindakLanjut} />}
        </Blok>
      )}
      {l.status === 'selesai' && (
        <Blok judul="Hasil perbaikan" ikon={CheckCircle2}>
          <Baris label="Hasil" nilai={l.hasilPerbaikan || l.tindakLanjut} tebal />
          <Baris label="Biaya aktual" nilai={rupiah(l.biayaAktual)} />
          <Baris label="Selesai" nilai={l.selesai} />
          <Galeri foto={l.fotoSesudah} judul="Foto sesudah perbaikan" />
        </Blok>
      )}
      {l.status === 'ditolak' && (
        <Blok judul="Ditolak" ikon={Ban}>
          <Baris label="Alasan" nilai={l.tindakLanjut} tebal />
          <Baris label="Oleh" nilai={`${l.penangan} (${l.selesai})`} />
        </Blok>
      )}

      {/* Riwayat progres */}
      <Blok judul="Riwayat tiket" ikon={ListChecks}>
        {progres === null && <p className="text-[13px] text-muted">Memuat…</p>}
        {progres?.length === 0 && <p className="text-[13px] text-muted">Belum ada catatan.</p>}
        <ol className="flex flex-col gap-2.5">
          {progres?.map((p) => (
            <li key={p.id} className="flex gap-2.5 text-[13px]">
              <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
              <div className="min-w-0">
                <p className="text-xs text-muted">{p.waktu} · {p.oleh}</p>
                <p>{p.catatan}</p>
                <Galeri foto={p.foto} kecil />
              </div>
            </li>
          ))}
        </ol>
      </Blok>

      {f && sarpras && (
        <Link to={`/fasilitas?ruang=${l.ruangId}`} className="self-start inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary">
          Lihat fasilitas di Data Fasilitas <ArrowRight size={15} />
        </Link>
      )}

      {/* ===== Aksi ===== */}
      {petugasSaya && !sarpras && l.status === 'verifikasi' && (
        <PanelVerifikasi l={l} f={f} milikUnit={milikUnit} berhasil={berhasil} />
      )}

      {tombol.length > 0 && (
        <div className="border-t border-line pt-4 flex flex-col gap-3.5">
          <h3 className="font-extrabold">Tindak Lanjut</h3>
          <div className="flex flex-wrap gap-2">
            {tombol.map(([kode, label, Ikon]) => (
              <button key={kode} type="button" onClick={() => setAksi(aksi === kode ? null : kode)} aria-expanded={aksi === kode}
                className={aksi === kode ? tombolUtama : kode === 'tolak' ? 'inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-xl border border-slate-300 text-slate-600 text-sm font-semibold hover:bg-slate-50' : `${tombolKedua} px-4`}>
                <Ikon size={17} /> {label}
              </button>
            ))}
          </div>
          {aksi === 'tugaskan' && <PanelTugaskan l={l} berhasil={berhasil} />}
          {aksi === 'verifikasi' && <PanelVerifikasi l={l} f={f} milikUnit={milikUnit} berhasil={berhasil} />}
          {aksi === 'mulai' && <PanelMulai l={l} f={f} berhasil={berhasil} />}
          {aksi === 'progres' && <PanelProgres l={l} berhasil={berhasil} />}
          {aksi === 'selesai' && <PanelSelesai l={l} f={f} berhasil={berhasil} />}
          {aksi === 'tolak' && <PanelTolak l={l} berhasil={berhasil} />}
        </div>
      )}
    </section>
  )
}

// ===================== Panel aksi =====================

function PanelTugaskan({ l, berhasil }) {
  const { tugaskanVerifikasi } = useData()
  const { daftarAkun } = useAuth()
  const petugas = daftarAkun.filter((a) => a.aktif && (a.peran === 'pktl' || a.peran === 'sarpras'))
  const [petugasId, setPetugasId] = useState(petugas.find((a) => a.peran === 'pktl')?.id ?? '')
  const [catatan, setCatatan] = useState('')
  const kirim = useKirim(async () => {
    if (!petugasId) return { error: 'Pilih petugas yang akan mengecek ke lapangan.' }
    return tugaskanVerifikasi(l.id, petugasId, catatan)
  }, () => berhasil(`Verifikasi tiket #${l.id} ditugaskan ke ${petugas.find((a) => a.id === petugasId)?.nama}.`))

  return (
    <Panel judul="Tugaskan verifikasi lapangan" ket="Petugas akan melihat tugas ini di menu Pemeliharaan miliknya, lalu mengecek dan menentukan unit yang rusak." kirim={kirim} tombol="Tugaskan">
      <label className={gayaLabel}>
        Petugas *
        <select className={gayaInput} value={petugasId} onChange={(e) => setPetugasId(e.target.value)}>
          <option value="">Pilih…</option>
          {petugas.map((a) => <option key={a.id} value={a.id}>{a.nama} ({NAMA_PERAN[a.peran]})</option>)}
        </select>
      </label>
      <label className={gayaLabel}>
        Instruksi (opsional)
        <input className={gayaInput} value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Contoh: cek AC mana yang tidak dingin" />
      </label>
    </Panel>
  )
}

function PanelVerifikasi({ l, f, milikUnit, berhasil }) {
  const { kirimVerifikasi } = useData()
  const perUnit = Boolean(f?.lacakPerUnit && milikUnit.length)
  const [hasil, setHasil] = useState('valid')
  const [unitDipilih, setUnitDipilih] = useState(l.unitIds)
  const [catatan, setCatatan] = useState('')
  const [foto, setFoto] = useState([])
  const kirim = useKirim(async () => {
    if (hasil === 'valid' && perUnit && unitDipilih.length === 0) return { error: `Centang unit ${l.namaFasilitas} yang rusak.` }
    if (!catatan.trim()) return { error: 'Tuliskan catatan hasil pengecekan.' }
    return kirimVerifikasi(l.id, hasil, perUnit && hasil === 'valid' ? unitDipilih : null, catatan, foto.map((x) => x.file))
  }, () => berhasil(`Hasil verifikasi tiket #${l.id} terkirim.`))

  return (
    <Panel judul="Hasil verifikasi lapangan" ket={`Laporan: ${teksJumlah(l, f)}. Cek langsung ke ${l.namaFasilitas}, lalu isi hasilnya.`} kirim={kirim} tombol="Kirim Hasil Verifikasi">
      <fieldset>
        <legend className="text-[13px] font-semibold mb-2">Hasil pengecekan *</legend>
        <div className="grid grid-cols-2 gap-2">
          {[['valid', 'Kerusakan benar ada', 'border-bad bg-bad-soft text-bad-ink'], ['bukan_kerusakan', 'Bukan kerusakan', 'border-ok bg-ok-soft text-ok-ink']].map(([k, label, gaya]) => (
            <button key={k} type="button" aria-pressed={hasil === k} onClick={() => setHasil(k)}
              className={`min-h-11 rounded-xl text-sm font-semibold ${hasil === k ? `border-2 ${gaya}` : 'border border-slate-300 text-slate-600'}`}>
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      {perUnit && hasil === 'valid' && (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-[13px] font-semibold mb-1">Unit yang rusak *</legend>
          {milikUnit.map((u) => {
            const dicentang = unitDipilih.includes(u.id)
            return (
              <label key={u.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${dicentang ? 'border-primary bg-primary-soft/50' : 'border-line'}`}>
                <input type="checkbox" className="size-5 accent-[var(--color-primary)]" checked={dicentang}
                  onChange={() => setUnitDipilih(dicentang ? unitDipilih.filter((x) => x !== u.id) : [...unitDipilih, u.id])} />
                <span className="flex-1 min-w-0 text-[13px]">
                  <span className="block font-mono font-bold">{u.kodeAset}</span>
                  <span className={u.posisi ? 'text-slate-600' : 'text-muted italic'}>{u.posisi || 'Posisi belum diisi'}</span>
                </span>
                <StatusBadge status={u.kondisi} />
              </label>
            )
          })}
        </fieldset>
      )}
      <label className={gayaLabel}>
        Catatan pengecekan *
        <textarea rows={2} className={`${gayaInput} py-2.5`} value={catatan} onChange={(e) => setCatatan(e.target.value)}
          placeholder={hasil === 'valid' ? 'Contoh: AC-02 tidak dingin, kemungkinan freon habis' : 'Contoh: proyektor normal, hanya kabel HDMI longgar'} />
      </label>
      <PilihFoto foto={foto} setFoto={setFoto} judul="Foto pengecekan (opsional)" />
    </Panel>
  )
}

function PanelMulai({ l, f, berhasil }) {
  const { mulaiPemeliharaan } = useData()
  const [data, setData] = useState({
    jenisTindakan: l.jenis === 'preventif' ? 'servis_rutin' : 'perbaikan_internal',
    teknisi: '',
    target: l.targetSelesai && l.targetSelesai >= hariIni() ? l.targetSelesai : hariIni(),
    estimasi: '',
    catatan: '',
  })
  const ubah = (k) => (e) => setData({ ...data, [k]: k === 'estimasi' ? e.target.value.replace(/\D/g, '') : e.target.value })
  const kirim = useKirim(() => mulaiPemeliharaan(l.id, data), () => berhasil(`Tiket #${l.id} mulai dikerjakan. ${l.namaFasilitas} berstatus Maintenance.`))

  return (
    <Panel judul="Rencana tindakan" ket={`Setelah disimpan, ${f?.lacakPerUnit && l.jenis === 'korektif' ? 'unit yang rusak' : l.namaFasilitas} berstatus Maintenance dan terkunci di Rapid Inspection.`} kirim={kirim} tombol="Mulai Kerjakan">
      <div className="grid sm:grid-cols-2 gap-3">
        <label className={gayaLabel}>
          Jenis tindakan *
          <select className={gayaInput} value={data.jenisTindakan} onChange={ubah('jenisTindakan')}>
            {Object.entries(JENIS_TINDAKAN).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className={gayaLabel}>
          Teknisi / penanggung jawab *
          <input className={gayaInput} value={data.teknisi} onChange={ubah('teknisi')} placeholder="Contoh: Pak Budi / CV Sejuk Abadi" />
        </label>
        <label className={gayaLabel}>
          Target selesai *
          <input type="date" min={hariIni()} className={gayaInput} value={data.target} onChange={ubah('target')} />
        </label>
        <label className={gayaLabel}>
          Estimasi biaya (opsional)
          <input inputMode="numeric" className={gayaInput} value={data.estimasi} onChange={ubah('estimasi')} placeholder="Contoh: 500000" />
          {data.estimasi && <span className="text-xs font-normal text-muted">{rupiah(Number(data.estimasi))}</span>}
        </label>
      </div>
      <label className={gayaLabel}>
        Catatan (opsional)
        <input className={gayaInput} value={data.catatan} onChange={ubah('catatan')} placeholder="Contoh: ganti kompresor, suku cadang dipesan" />
      </label>
    </Panel>
  )
}

function PanelProgres({ l, berhasil }) {
  const { tambahProgres } = useData()
  const [catatan, setCatatan] = useState('')
  const [foto, setFoto] = useState([])
  const kirim = useKirim(async () => {
    if (!catatan.trim()) return { error: 'Tuliskan catatan progres.' }
    return tambahProgres(l.id, catatan, foto.map((x) => x.file))
  }, () => berhasil(`Progres tiket #${l.id} ditambahkan.`))
  return (
    <Panel judul="Catatan progres" kirim={kirim} tombol="Simpan Progres">
      <label className={gayaLabel}>
        Progres *
        <textarea rows={2} className={`${gayaInput} py-2.5`} value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Contoh: menunggu suku cadang dari vendor" />
      </label>
      <PilihFoto foto={foto} setFoto={setFoto} judul="Foto (opsional)" />
    </Panel>
  )
}

function PanelSelesai({ l, f, berhasil }) {
  const { selesaikanPemeliharaan } = useData()
  const [hasil, setHasil] = useState('')
  const [biaya, setBiaya] = useState(l.estimasiBiaya ? String(l.estimasiBiaya) : '')
  const [foto, setFoto] = useState([])
  const kirim = useKirim(async () => {
    if (!hasil.trim()) return { error: 'Tuliskan hasil perbaikan.' }
    return selesaikanPemeliharaan(l.id, hasil, biaya, foto.map((x) => x.file))
  }, () => berhasil(`Tiket #${l.id} selesai. Kondisi ${l.namaFasilitas} kembali Baik.`))
  return (
    <Panel judul="Selesaikan pemeliharaan" ket={`Kondisi ${f?.lacakPerUnit && l.jenis === 'korektif' ? 'unit yang diperbaiki' : l.namaFasilitas} otomatis kembali Baik.`} kirim={kirim} tombol="Tandai Selesai">
      <label className={gayaLabel}>
        Hasil perbaikan *
        <textarea rows={2} className={`${gayaInput} py-2.5`} value={hasil} onChange={(e) => setHasil(e.target.value)} placeholder="Contoh: kompresor diganti, AC sudah dingin normal" />
      </label>
      <label className={`${gayaLabel} max-w-64`}>
        Biaya aktual (opsional)
        <input inputMode="numeric" className={gayaInput} value={biaya} onChange={(e) => setBiaya(e.target.value.replace(/\D/g, ''))} placeholder="Contoh: 450000" />
        {biaya && <span className="text-xs font-normal text-muted">{rupiah(Number(biaya))}</span>}
      </label>
      <PilihFoto foto={foto} setFoto={setFoto} judul="Foto sesudah perbaikan (disarankan)" />
    </Panel>
  )
}

function PanelTolak({ l, berhasil }) {
  const { tolakLaporan } = useData()
  const [alasan, setAlasan] = useState(l.hasilVerifikasi === 'bukan_kerusakan' ? l.catatanVerifikasi : '')
  const kirim = useKirim(async () => {
    if (!alasan.trim()) return { error: 'Tuliskan alasannya.' }
    return tolakLaporan(l.id, alasan)
  }, () => berhasil(`Tiket #${l.id} ${l.status === 'diproses' ? 'dibatalkan' : 'ditolak'}.`))
  return (
    <Panel judul={l.status === 'diproses' ? 'Batalkan pengerjaan' : 'Tolak tiket'}
      ket={l.status === 'diproses' ? 'Kondisi fasilitas dikembalikan ke Baik.' : 'Kondisi fasilitas tidak diubah.'} kirim={kirim} tombol={l.status === 'diproses' ? 'Batalkan Tiket' : 'Tolak Tiket'}>
      <label className={gayaLabel}>
        Alasan *
        <input className={gayaInput} value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="Contoh: bukan kerusakan, proyektor normal saat dicek" />
      </label>
    </Panel>
  )
}

// Pembantu kirim: status sibuk + pesan galat
function useKirim(aksi, setelahBerhasil) {
  const [sibuk, setSibuk] = useState(false)
  const [error, setError] = useState('')
  async function jalankan() {
    setSibuk(true)
    setError('')
    const hasil = await aksi()
    setSibuk(false)
    if (hasil?.error) return setError(hasil.error)
    setelahBerhasil()
  }
  return { jalankan, sibuk, error }
}

function Panel({ judul, ket, kirim, tombol, children }) {
  return (
    <div className="rounded-xl border border-line bg-slate-50/60 p-4 flex flex-col gap-3">
      <div>
        <p className="font-bold">{judul}</p>
        {ket && <p className="text-[13px] text-muted">{ket}</p>}
      </div>
      {children}
      {kirim.error && <p role="alert" className="p-3 rounded-xl bg-bad-soft text-bad-ink text-sm font-semibold">{kirim.error}</p>}
      <button type="button" onClick={kirim.jalankan} disabled={kirim.sibuk} className={`${tombolUtama} self-start disabled:opacity-60`}>
        {kirim.sibuk ? 'Menyimpan…' : tombol}
      </button>
    </div>
  )
}

function PilihFoto({ foto, setFoto, judul }) {
  const input = useRef(null)
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[13px] font-semibold">{judul}</p>
      <div className="flex flex-wrap gap-2">
        {foto.map((x, i) => (
          <div key={x.url} className="relative size-20 rounded-lg overflow-hidden border border-line">
            <img src={x.url} alt={`Foto ${i + 1}`} className="size-full object-cover" />
            <button type="button" aria-label={`Hapus foto ${i + 1}`} onClick={() => { URL.revokeObjectURL(x.url); setFoto(foto.filter((_, j) => j !== i)) }}
              className="absolute top-0.5 right-0.5 size-7 grid place-items-center rounded-full bg-slate-900/70 text-white"><X size={14} /></button>
          </div>
        ))}
        {foto.length < MAKS_FOTO && (
          <button type="button" onClick={() => input.current?.click()} aria-label="Tambah foto"
            className="size-20 rounded-lg border-2 border-dashed border-slate-300 text-muted hover:border-primary hover:text-primary grid place-items-center">
            <ImagePlus size={22} />
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => {
          const dipilih = [...e.target.files].filter((x) => x.type.startsWith('image/'))
          setFoto([...foto, ...dipilih.slice(0, MAKS_FOTO - foto.length).map((file) => ({ file, url: URL.createObjectURL(file) }))])
          e.target.value = ''
        }} />
    </div>
  )
}

function Blok({ judul, ikon: Ikon, children }) {
  return (
    <div className="rounded-xl border border-line p-3.5 flex flex-col gap-2">
      <p className="text-[13px] font-bold inline-flex items-center gap-1.5"><Ikon size={15} className="text-primary" /> {judul}</p>
      {children}
    </div>
  )
}

function Baris({ label, nilai, tebal, mono }) {
  return (
    <p className="text-[13px] grid grid-cols-[120px_1fr] gap-2">
      <span className="text-muted">{label}</span>
      <span className={`${tebal ? 'font-semibold' : ''} ${mono ? 'font-mono' : ''}`}>{nilai || '-'}</span>
    </p>
  )
}

function Galeri({ foto, judul, kecil }) {
  if (!foto?.length) return null
  return (
    <div className="flex flex-col gap-1.5">
      {judul && <p className="text-xs text-muted">{judul}</p>}
      <div className="flex flex-wrap gap-2">
        {foto.map((url, n) => (
          <a key={url} href={url} target="_blank" rel="noreferrer" aria-label={`Buka foto ${n + 1}`}>
            <img src={url} alt="" className={`${kecil ? 'size-12' : 'size-20'} rounded-lg object-cover border border-line`} />
          </a>
        ))}
      </div>
    </div>
  )
}

// ===================== Jadwal preventif =====================

function statusJadwal(j, tiketBerjalan) {
  if (!j.aktif) return { label: 'Nonaktif', gaya: 'bg-slate-100 text-slate-500' }
  if (tiketBerjalan) return { label: 'Sedang dikerjakan', gaya: 'bg-sky-50 text-sky-700' }
  const sisa = Math.round((new Date(`${j.berikutnya}T00:00:00`) - new Date(`${hariIni()}T00:00:00`)) / 86400000)
  if (sisa < 0) return { label: `Lewat ${-sisa} hari`, gaya: 'bg-bad-soft text-bad-ink', jatuhTempo: true }
  if (sisa === 0) return { label: 'Jatuh tempo hari ini', gaya: 'bg-bad-soft text-bad-ink', jatuhTempo: true }
  if (sisa <= 7) return { label: `${sisa} hari lagi`, gaya: 'bg-warn-soft text-warn-ink', jatuhTempo: true }
  return { label: `${sisa} hari lagi`, gaya: 'bg-ok-soft text-ok-ink' }
}

function JadwalPreventif({ pindahKeTiket }) {
  const { ruang, fasilitas, jadwal, laporan, buatTiketPreventif, hapusJadwal } = useData()
  const [, setParams] = useSearchParams()
  const [gedung, setGedung] = useState('Semua')
  const [form, setForm] = useState(null) // null | 'baru' | objek jadwal
  const [pesan, setPesan] = useState('')
  const [error, setError] = useState('')

  const ruangById = Object.fromEntries(ruang.map((r) => [r.id, r]))
  const fasilitasById = Object.fromEntries(fasilitas.map((f) => [f.id, f]))
  const tiketBerjalan = (j) => laporan.find((l) => l.jadwalId === j.id && TERBUKA.includes(l.status))

  const daftar = jadwal
    .filter((j) => fasilitasById[j.fasilitasId])
    .filter((j) => gedung === 'Semua' || ruangById[fasilitasById[j.fasilitasId].ruangId]?.gedung === gedung)
    .sort((a, b) => (a.aktif === b.aktif ? a.berikutnya.localeCompare(b.berikutnya) : a.aktif ? -1 : 1))
  const daftarGedung = [...new Set(jadwal.map((j) => ruangById[fasilitasById[j.fasilitasId]?.ruangId]?.gedung).filter(Boolean))].sort()

  async function buatTiket(j) {
    setError('')
    const hasil = await buatTiketPreventif(j.id)
    if (hasil.error) return setError(hasil.error)
    setParams({ id: hasil.id })
    pindahKeTiket()
  }

  async function hapus(j) {
    if (!window.confirm(`Hapus jadwal "${j.kegiatan}" untuk ${fasilitasById[j.fasilitasId]?.nama}?`)) return
    const hasil = await hapusJadwal(j.id)
    if (hasil.error) return setError(hasil.error)
    setPesan('Jadwal dihapus.')
  }

  return (
    <section aria-label="Jadwal pemeliharaan preventif" className="bg-white border border-line rounded-2xl p-4 flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div>
          <h2 className="text-lg font-extrabold">Jadwal Pemeliharaan Preventif</h2>
          <p className="text-[13px] text-muted">Pemeliharaan rutin sebelum terjadi kerusakan, misalnya servis AC setiap 3 bulan.</p>
        </div>
        <div className="flex gap-2">
          <select aria-label="Filter gedung" value={gedung} onChange={(e) => setGedung(e.target.value)} className={`${gayaInput} w-32`}>
            <option value="Semua">Gedung</option>
            {daftarGedung.map((g) => <option key={g}>{g}</option>)}
          </select>
          <button type="button" onClick={() => setForm('baru')} className={`${tombolUtama} whitespace-nowrap`}>
            <CalendarPlus size={18} /> Tambah Jadwal
          </button>
        </div>
      </div>

      {pesan && <p role="status" className="p-3 rounded-xl bg-ok-soft text-ok-ink text-sm font-semibold">{pesan}</p>}
      {error && <p role="alert" className="p-3 rounded-xl bg-bad-soft text-bad-ink text-sm font-semibold">{error}</p>}

      <div className="overflow-x-auto -mx-4 px-4">
        <table className="w-full min-w-[760px] text-sm border-collapse">
          <thead>
            <tr className="text-left text-slate-600 text-[13px] border-b border-line">
              {['Fasilitas', 'Kegiatan', 'Setiap', 'Terakhir', 'Berikutnya', 'Status', ''].map((h) => (
                <th key={h} className="py-2.5 pr-3 font-bold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {daftar.map((j) => {
              const f = fasilitasById[j.fasilitasId]
              const r = ruangById[f.ruangId]
              const berjalan = tiketBerjalan(j)
              const s = statusJadwal(j, berjalan)
              return (
                <tr key={j.id} className="border-b border-slate-100">
                  <td className="py-2.5 pr-3">
                    <span className="block font-bold">{f.nama}</span>
                    <span className="block text-xs text-muted">{r?.nama} · {f.kodeAset}</span>
                  </td>
                  <td className="py-2.5 pr-3">{j.kegiatan}{j.catatan && <span className="block text-xs text-muted">{j.catatan}</span>}</td>
                  <td className="py-2.5 pr-3 whitespace-nowrap">{j.intervalHari} hari</td>
                  <td className="py-2.5 pr-3 whitespace-nowrap">{tglIndo(j.terakhir)}</td>
                  <td className="py-2.5 pr-3 whitespace-nowrap font-semibold">{tglIndo(j.berikutnya)}</td>
                  <td className="py-2.5 pr-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${s.gaya}`}>{s.label}</span>
                  </td>
                  <td className="py-2 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 justify-end">
                      {berjalan ? (
                        <button type="button" onClick={() => { setParams({ id: berjalan.id }); pindahKeTiket() }} className="text-xs font-semibold text-primary min-h-9 px-2">
                          Tiket #{berjalan.id}
                        </button>
                      ) : (
                        j.aktif && (
                          <button type="button" onClick={() => buatTiket(j)}
                            className={`inline-flex items-center gap-1 min-h-9 px-3 rounded-lg text-xs font-semibold ${s.jatuhTempo ? 'bg-primary text-white' : 'border border-slate-300 text-slate-700'}`}>
                            <Plus size={14} /> Buat Tiket
                          </button>
                        )
                      )}
                      <button type="button" aria-label={`Ubah jadwal ${j.kegiatan} ${f.nama} ${r?.nama}`} onClick={() => setForm(j)}
                        className="size-9 grid place-items-center rounded-lg border border-slate-200 hover:bg-slate-50"><Pencil size={15} /></button>
                      <button type="button" aria-label={`Hapus jadwal ${j.kegiatan} ${f.nama} ${r?.nama}`} onClick={() => hapus(j)}
                        className="size-9 grid place-items-center rounded-lg border border-red-200 text-red-700 hover:bg-red-50"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {daftar.length === 0 && (
              <tr><td colSpan={7} className="py-8 text-center text-muted">Belum ada jadwal. Klik &quot;Tambah Jadwal&quot;, misalnya servis AC setiap 90 hari untuk semua AC di Gedung 4.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">
        &quot;Buat Tiket&quot; membuat tiket pemeliharaan rutin di tab Tiket Kerusakan. Saat tiket itu diselesaikan, tanggal berikutnya otomatis dihitung ulang dari hari penyelesaian.
      </p>

      {form && <FormJadwal jadwalLama={form === 'baru' ? null : form} tutup={() => setForm(null)} berhasil={(t) => { setForm(null); setPesan(t) }} />}
    </section>
  )
}

function FormJadwal({ jadwalLama, tutup, berhasil }) {
  const { ruang, fasilitas, tambahJadwal, ubahJadwal } = useData()
  const [data, setData] = useState({
    kegiatan: jadwalLama?.kegiatan ?? 'Servis rutin',
    intervalHari: String(jadwalLama?.intervalHari ?? 90),
    berikutnya: jadwalLama?.berikutnya ?? hariIni(),
    catatan: jadwalLama?.catatan ?? '',
    aktif: jadwalLama?.aktif ?? true,
  })
  const [kampus, setKampus] = useState('Kampus A')
  const [gedung, setGedung] = useState('')
  const [ruangId, setRuangId] = useState('Semua')
  const [namaFasilitas, setNamaFasilitas] = useState('')
  const [error, setError] = useState('')
  const [menyimpan, setMenyimpan] = useState(false)

  const ubah = (k) => (e) => setData({ ...data, [k]: k === 'intervalHari' ? e.target.value.replace(/\D/g, '') : e.target.value })

  // Fasilitas sasaran: semua fasilitas bernama sama di gedung/ruangan terpilih
  const ruangSasaran = ruang.filter((r) => r.kampus === kampus && r.gedung === gedung && (ruangId === 'Semua' || r.id === ruangId))
  const idRuangSasaran = new Set(ruangSasaran.map((r) => r.id))
  const daftarNama = [...new Set(fasilitas.filter((f) => idRuangSasaran.has(f.ruangId)).map((f) => f.nama))].sort()
  const sasaran = fasilitas.filter((f) => idRuangSasaran.has(f.ruangId) && f.nama === namaFasilitas)

  async function kirim() {
    if (!data.kegiatan.trim()) return setError('Isi nama kegiatan.')
    if (!(Number(data.intervalHari) > 0)) return setError('Isi interval dalam hari.')
    if (!data.berikutnya) return setError('Isi tanggal pelaksanaan berikutnya.')
    if (!jadwalLama && sasaran.length === 0) return setError('Pilih gedung dan jenis fasilitas yang akan dijadwalkan.')
    setMenyimpan(true)
    const hasil = jadwalLama ? await ubahJadwal(jadwalLama.id, data) : await tambahJadwal(sasaran.map((f) => f.id), data)
    setMenyimpan(false)
    if (hasil.error) return setError(hasil.error)
    berhasil(jadwalLama ? 'Jadwal diperbarui.' : `Jadwal "${data.kegiatan.trim()}" dibuat untuk ${sasaran.length} ${namaFasilitas}.`)
  }

  return (
    <Modal
      judul={jadwalLama ? 'Ubah Jadwal Preventif' : 'Tambah Jadwal Preventif'}
      keterangan={jadwalLama ? `${fasilitas.find((f) => f.id === jadwalLama.fasilitasId)?.nama ?? ''}` : 'Satu jadwal dibuat untuk setiap fasilitas terpilih'}
      tutup={tutup}
      footer={
        <>
          <button type="button" onClick={tutup} className={tombolKedua}>Batal</button>
          <button type="button" onClick={kirim} disabled={menyimpan} className={`${tombolUtama} disabled:opacity-60`}>{menyimpan ? 'Menyimpan…' : 'Simpan Jadwal'}</button>
        </>
      }
    >
      <div className="grid gap-4">
        {!jadwalLama && (
          <>
            <div className="grid grid-cols-3 gap-2.5">
              <label className={gayaLabel}>
                Kampus
                <select className={gayaInput} value={kampus} onChange={(e) => { setKampus(e.target.value); setGedung(''); setRuangId('Semua'); setNamaFasilitas('') }}>
                  {DAFTAR_KAMPUS.map((k) => <option key={k}>{k}</option>)}
                </select>
              </label>
              <label className={gayaLabel}>
                Gedung *
                <select className={gayaInput} value={gedung} onChange={(e) => { setGedung(e.target.value); setRuangId('Semua'); setNamaFasilitas('') }}>
                  <option value="">Pilih…</option>
                  {gedungDiKampus(ruang, kampus).map((g) => <option key={g}>{g}</option>)}
                </select>
              </label>
              <label className={gayaLabel}>
                Ruangan
                <select className={gayaInput} value={ruangId} disabled={!gedung} onChange={(e) => { setRuangId(e.target.value); setNamaFasilitas('') }}>
                  <option value="Semua">Semua ruangan</option>
                  {ruang.filter((r) => r.kampus === kampus && r.gedung === gedung).map((r) => <option key={r.id} value={r.id}>{r.nama}</option>)}
                </select>
              </label>
            </div>
            <label className={gayaLabel}>
              Jenis fasilitas *
              <select className={gayaInput} value={namaFasilitas} disabled={!gedung} onChange={(e) => setNamaFasilitas(e.target.value)}>
                <option value="">Pilih…</option>
                {daftarNama.map((n) => <option key={n}>{n}</option>)}
              </select>
              {namaFasilitas && <span className="text-xs font-normal text-muted">Akan dibuat {sasaran.length} jadwal: {sasaran.map((f) => f.kodeAset).join(', ')}</span>}
            </label>
          </>
        )}
        <label className={gayaLabel}>
          Kegiatan *
          <input className={gayaInput} value={data.kegiatan} onChange={ubah('kegiatan')} placeholder="Contoh: Cuci dan servis AC" />
        </label>
        <div className="grid grid-cols-2 gap-2.5">
          <label className={gayaLabel}>
            Setiap (hari) *
            <input inputMode="numeric" className={gayaInput} value={data.intervalHari} onChange={ubah('intervalHari')} />
            <span className="flex flex-wrap gap-1">
              {[30, 90, 180, 365].map((n) => (
                <button key={n} type="button" onClick={() => setData({ ...data, intervalHari: String(n) })}
                  className={`text-xs px-2 py-1 rounded-md border ${data.intervalHari === String(n) ? 'border-primary text-primary' : 'border-slate-300 text-slate-600'}`}>
                  {{ 30: '1 bulan', 90: '3 bulan', 180: '6 bulan', 365: '1 tahun' }[n]}
                </button>
              ))}
            </span>
          </label>
          <label className={gayaLabel}>
            Pelaksanaan berikutnya *
            <input type="date" className={gayaInput} value={data.berikutnya} onChange={ubah('berikutnya')} />
          </label>
        </div>
        <label className={gayaLabel}>
          Catatan (opsional)
          <input className={gayaInput} value={data.catatan} onChange={ubah('catatan')} placeholder="Contoh: dikerjakan vendor CV Sejuk Abadi" />
        </label>
        {jadwalLama && (
          <label className="flex items-center gap-2.5 text-sm font-semibold">
            <input type="checkbox" className="size-5 accent-[var(--color-primary)]" checked={data.aktif} onChange={(e) => setData({ ...data, aktif: e.target.checked })} />
            Jadwal aktif
          </label>
        )}
        {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
      </div>
    </Modal>
  )
}
