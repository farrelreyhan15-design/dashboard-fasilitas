import { useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Plus, Search, Filter, ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, XCircle, X, Inbox, Wrench, Ban,
  MapPin, ScanSearch, UserRound, ClipboardList, ImagePlus, Timer, ArrowRight, Package,
} from 'lucide-react'
import Header from '../components/Header.jsx'
import InfoMuat from '../components/InfoMuat.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import Modal, { gayaInput, gayaLabel, tombolUtama, tombolKedua } from '../components/Modal.jsx'
import { useData } from '../context/DataContext.jsx'
import { useAuth, NAMA_PERAN } from '../context/AuthContext.jsx'
import { DAFTAR_KAMPUS, STATUS, gedungDiKampus } from '../data/konstanta.js'

const PER_HALAMAN = 8
const MAKS_FOTO = 3

// Status laporan: label, ikon, warna
const STATUS_LAPORAN = {
  baru: { label: 'Baru', ikon: Inbox, gaya: 'bg-bad-soft text-bad-ink' },
  diproses: { label: 'Diproses', ikon: Wrench, gaya: 'bg-sky-50 text-sky-700' },
  selesai: { label: 'Selesai', ikon: CheckCircle2, gaya: 'bg-ok-soft text-ok-ink' },
  ditolak: { label: 'Ditolak', ikon: Ban, gaya: 'bg-slate-100 text-slate-600' },
}

function PilStatus({ status }) {
  const s = STATUS_LAPORAN[status]
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold px-2.5 py-1 rounded-full ${s.gaya}`}>
      <s.ikon size={13} />
      {s.label}
    </span>
  )
}

// "1 dari 2 unit rusak"
function teksJumlah(l, f) {
  const keadaan = l.kondisi === 'rusak' ? 'rusak' : 'bermasalah'
  return f ? `${l.jumlah} dari ${f.jumlah} ${f.satuan} ${keadaan}` : `${l.jumlah} unit ${keadaan}`
}

// Lama penyelesaian, contoh "5 jam" atau "2,5 hari"
function teksDurasi(jam) {
  if (jam < 1) return `${Math.max(1, Math.round(jam * 60))} menit`
  if (jam < 48) return `${(Math.round(jam * 10) / 10).toString().replace('.', ',')} jam`
  return `${(Math.round((jam / 24) * 10) / 10).toString().replace('.', ',')} hari`
}

export default function Pemeliharaan() {
  const { ruang, fasilitas, laporan } = useData()
  const { bisa } = useAuth()
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState('semua')
  const [cari, setCari] = useState('')
  const [gedung, setGedung] = useState('Semua')
  const [halaman, setHalaman] = useState(1)
  const [formTerbuka, setFormTerbuka] = useState(false)
  const [pesan, setPesan] = useState('')
  const areaDetail = useRef(null)

  const ruangById = Object.fromEntries(ruang.map((r) => [r.id, r]))
  const fasilitasById = Object.fromEntries(fasilitas.map((f) => [f.id, f]))

  const hitung = (s) => laporan.filter((l) => l.status === s).length
  const laporanTampil = laporan.filter((l) => {
    const r = ruangById[l.ruangId]
    return (
      (tab === 'semua' || l.status === tab) &&
      (gedung === 'Semua' || r?.gedung === gedung) &&
      `${l.namaFasilitas} ${r?.nama ?? ''} ${l.pelapor} #${l.id}`.toLowerCase().includes(cari.toLowerCase())
    )
  })
  const jumlahHalaman = Math.max(1, Math.ceil(laporanTampil.length / PER_HALAMAN))
  const halamanAman = Math.min(halaman, jumlahHalaman)
  const awal = (halamanAman - 1) * PER_HALAMAN
  const laporanHalamanIni = laporanTampil.slice(awal, awal + PER_HALAMAN)

  const dipilih = laporan.find((l) => l.id === params.get('id')) ?? laporanTampil[0] ?? null

  // Rata-rata waktu dari laporan dibuat sampai selesai diperbaiki
  const durasiSelesai = laporan
    .filter((l) => l.status === 'selesai' && l.selesaiAsli)
    .map((l) => (new Date(l.selesaiAsli) - new Date(l.dibuatAsli)) / 3600000)
  const rataJam = durasiSelesai.length ? durasiSelesai.reduce((a, b) => a + b, 0) / durasiSelesai.length : null

  const kartu = [
    { label: 'Total Laporan', nilai: laporan.length, ikon: ClipboardList, warna: 'bg-primary-soft text-primary' },
    { label: 'Baru', nilai: hitung('baru'), ikon: Inbox, warna: 'bg-bad-soft text-bad' },
    { label: 'Diproses', nilai: hitung('diproses'), ikon: Wrench, warna: 'bg-sky-50 text-sky-700' },
    { label: 'Selesai', nilai: hitung('selesai'), ikon: CheckCircle2, warna: 'bg-ok-soft text-ok' },
    { label: 'Rata-rata Penyelesaian', nilai: rataJam === null ? '-' : teksDurasi(rataJam), ikon: Timer, warna: 'bg-slate-100 text-slate-600', kecil: true },
  ]

  function pilih(id) {
    setParams({ id })
    if (window.innerWidth < 1280) setTimeout(() => areaDetail.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const daftarGedung = [...new Set(laporan.map((l) => ruangById[l.ruangId]?.gedung).filter(Boolean))].sort()

  return (
    <>
      <Header judul="Pemeliharaan" subjudul="Tindak lanjut kerusakan fasilitas dari Rapid Inspection dan laporan dosen, sampai selesai diperbaiki" />
      <InfoMuat />

      {pesan && (
        <div role="status" className="flex items-center gap-3 p-3.5 rounded-xl bg-ok-soft border border-green-200 text-ok-ink">
          <CheckCircle2 size={22} />
          <span className="flex-1 text-sm font-semibold">{pesan}</span>
          <button type="button" aria-label="Tutup pemberitahuan" onClick={() => setPesan('')} className="size-9 grid place-items-center">
            <X size={18} />
          </button>
        </div>
      )}

      <section aria-label="Ringkasan laporan" className="grid gap-3 grid-cols-2 md:grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
        {kartu.map(({ label, nilai, ikon: Ikon, warna, kecil }, i) => (
          <div key={label} className={`bg-white border border-line rounded-2xl p-4 flex items-center gap-3 ${i === kartu.length - 1 ? 'col-span-2 md:col-span-1' : ''}`}>
            <span className={`size-11 shrink-0 rounded-xl grid place-items-center ${warna}`}>
              <Ikon size={22} />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-slate-600">{label}</p>
              <p className={`${kecil ? 'text-xl' : 'text-2xl'} font-extrabold`}>{nilai}</p>
            </div>
          </div>
        ))}
      </section>

      <div className="grid gap-4 items-start xl:grid-cols-[minmax(0,1fr)_minmax(380px,1.05fr)]">
        {/* ===== Kiri: daftar laporan ===== */}
        <section aria-label="Daftar laporan" className="bg-white border border-line rounded-2xl p-4 flex flex-col gap-3.5 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <h2 className="text-lg font-extrabold">Daftar Kerusakan</h2>
            {bisa('lapor') && (
              <button type="button" onClick={() => setFormTerbuka(true)} className={tombolUtama}>
                <Plus size={18} /> Buat Laporan
              </button>
            )}
          </div>

          <div role="tablist" className="flex gap-1 p-1 rounded-xl bg-slate-100 overflow-x-auto">
            {[['semua', 'Semua', laporan.length], ...Object.entries(STATUS_LAPORAN).map(([k, s]) => [k, s.label, hitung(k)])].map(([kode, label, n]) => (
              <button key={kode} type="button" role="tab" aria-selected={tab === kode}
                onClick={() => { setTab(kode); setHalaman(1) }}
                className={`flex-1 min-h-10 px-3 rounded-lg text-[13px] font-semibold whitespace-nowrap
                  ${tab === kode ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}>
                {label} ({n})
              </button>
            ))}
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-2">
            <label className="relative">
              <span className="sr-only">Cari laporan</span>
              <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input className={`${gayaInput} pl-9`} value={cari} placeholder="Cari fasilitas, ruangan, pelapor…"
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
            {laporanHalamanIni.map((l) => {
              const r = ruangById[l.ruangId]
              const aktif = l.id === dipilih?.id
              return (
                <li key={l.id}>
                  <button type="button" onClick={() => pilih(l.id)} aria-current={aktif ? 'true' : undefined}
                    className={`w-full text-left p-3.5 rounded-xl border flex flex-col gap-2
                      ${aktif ? 'bg-primary-soft border-primary/30' : 'border-line hover:bg-slate-50'}`}>
                    <span className="flex items-start justify-between gap-2">
                      <span className="min-w-0">
                        <span className="block font-bold">
                          {l.namaFasilitas} <span className="font-semibold text-muted">· {r?.nama}</span>
                        </span>
                        <span className="block text-xs text-muted">
                          #{l.id} · {l.dibuat} · {l.pelapor}
                        </span>
                      </span>
                      <PilStatus status={l.status} />
                    </span>
                    <span className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={l.kondisi} />
                      <span className="text-xs text-slate-600">{teksJumlah(l, fasilitasById[l.fasilitasId])}</span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 inline-flex items-center gap-1">
                        {l.sumber === 'inspeksi' ? <ScanSearch size={12} /> : <UserRound size={12} />}
                        {l.sumber === 'inspeksi' ? 'Rapid Inspection' : 'Laporan manual'}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          {laporanTampil.length === 0 && (
            <p className="text-sm text-muted text-center py-8">
              {laporan.length === 0 ? 'Belum ada laporan. Temuan Bermasalah/Rusak dari Rapid Inspection otomatis muncul di sini.' : 'Tidak ada laporan yang cocok.'}
            </p>
          )}

          <div className="flex items-center justify-between gap-2 text-[13px] text-muted">
            <span>
              Menampilkan {laporanTampil.length ? awal + 1 : 0}–{Math.min(awal + PER_HALAMAN, laporanTampil.length)} dari {laporanTampil.length} laporan
            </span>
            <div className="flex items-center gap-1">
              <button type="button" aria-label="Halaman sebelumnya" disabled={halamanAman === 1} onClick={() => setHalaman(halamanAman - 1)}
                className="size-9 grid place-items-center rounded-lg border border-line disabled:opacity-40">
                <ChevronLeft size={16} />
              </button>
              <span className="min-w-9 h-9 px-2 grid place-items-center rounded-lg bg-primary text-white font-semibold">{halamanAman}</span>
              <button type="button" aria-label="Halaman berikutnya" disabled={halamanAman === jumlahHalaman} onClick={() => setHalaman(halamanAman + 1)}
                className="size-9 grid place-items-center rounded-lg border border-line disabled:opacity-40">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </section>

        {/* ===== Kanan: detail laporan ===== */}
        <div ref={areaDetail} className="scroll-mt-4 min-w-0">
          {dipilih ? (
            <DetailLaporan key={dipilih.id} l={dipilih} setPesan={setPesan} />
          ) : (
            <section className="bg-white border border-line rounded-2xl p-8 text-center text-sm text-muted">Pilih laporan untuk melihat detailnya.</section>
          )}
        </div>
      </div>

      {formTerbuka && (
        <FormBuatLaporan
          tutup={() => setFormTerbuka(false)}
          berhasil={(teks) => {
            setPesan(teks)
            setFormTerbuka(false)
            setTab('semua')
            setParams({})
          }}
        />
      )}
    </>
  )
}

// ===== Detail satu laporan + tindak lanjut Sarpras =====
function DetailLaporan({ l, setPesan }) {
  const { ruang, fasilitas, unit, prosesLaporan } = useData()
  const { pengguna } = useAuth()
  const r = ruang.find((x) => x.id === l.ruangId)
  const f = fasilitas.find((x) => x.id === l.fasilitasId)
  const milikUnit = unit.filter((u) => u.fasilitasId === l.fasilitasId)
  const perUnit = Boolean(f?.lacakPerUnit && milikUnit.length)
  const terbuka = l.status === 'baru' || l.status === 'diproses'
  const bolehProses = pengguna?.peran === 'sarpras' && terbuka // tindak lanjut khusus Sarpras

  const [unitDipilih, setUnitDipilih] = useState(l.unitIds)
  const [kondisiUnit, setKondisiUnit] = useState('maintenance')
  const [tindakLanjut, setTindakLanjut] = useState('')
  const [error, setError] = useState('')
  const [sibuk, setSibuk] = useState(false)

  function centang(id) {
    setUnitDipilih(unitDipilih.includes(id) ? unitDipilih.filter((x) => x !== id) : [...unitDipilih, id])
    setError('')
  }

  async function jalankan(status) {
    if (perUnit && status !== 'ditolak' && unitDipilih.length === 0) {
      return setError(`Centang dulu unit ${l.namaFasilitas} yang bermasalah (laporan: ${l.jumlah} unit).`)
    }
    if (status === 'ditolak' && !tindakLanjut.trim()) return setError('Tuliskan alasan laporan ditolak.')
    if (status === 'ditolak' && !window.confirm('Tolak laporan ini? Kondisi fasilitas tidak diubah.')) return
    if (status === 'selesai' && !window.confirm(`Tandai selesai? Kondisi ${perUnit ? 'unit terpilih' : l.namaFasilitas} kembali Baik.`)) return
    setSibuk(true)
    setError('')
    const hasil = await prosesLaporan(
      l.id,
      status,
      tindakLanjut,
      perUnit ? unitDipilih : null,
      status === 'diproses' && perUnit ? kondisiUnit : null,
    )
    setSibuk(false)
    if (hasil.error) return setError(hasil.error)
    setTindakLanjut('')
    setPesan(
      {
        diproses: `Laporan #${l.id} sedang diproses.`,
        selesai: `Laporan #${l.id} selesai. Kondisi ${l.namaFasilitas} kembali Baik.`,
        ditolak: `Laporan #${l.id} ditolak.`,
      }[status],
    )
  }

  const langkah = [
    { label: 'Dilaporkan', waktu: l.dibuat, selesai: true },
    { label: 'Diproses', waktu: l.diproses, selesai: Boolean(l.diproses) },
    { label: l.status === 'ditolak' ? 'Ditolak' : 'Selesai', waktu: l.selesai, selesai: Boolean(l.selesai) },
  ]

  return (
    <section aria-label={`Detail laporan ${l.id}`} className="bg-white border border-line rounded-2xl p-4 sm:p-5 flex flex-col gap-4">
      <div className="flex items-start gap-3.5">
        <span className="size-13 shrink-0 rounded-xl bg-primary-soft text-primary grid place-items-center">
          <Package size={26} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-muted">Laporan #{l.id}</p>
          <p className="text-xl font-extrabold leading-tight">{l.namaFasilitas}</p>
          <p className="text-[13px] text-muted inline-flex items-center gap-1">
            <MapPin size={13} /> {r ? `${r.kampus} › ${r.gedung} › ${r.nama}` : '-'}
          </p>
        </div>
        <PilStatus status={l.status} />
      </div>

      {/* Tahapan */}
      <ol className="grid grid-cols-3 gap-2">
        {langkah.map((s, i) => (
          <li key={s.label} className="flex flex-col gap-1">
            <span className={`h-1.5 rounded-full ${s.selesai ? (l.status === 'ditolak' && i === 2 ? 'bg-slate-400' : 'bg-ok') : 'bg-slate-200'}`} />
            <span className={`text-xs font-semibold ${s.selesai ? 'text-ink' : 'text-muted'}`}>{s.label}</span>
            <span className="text-[11px] text-muted">{s.waktu || '-'}</span>
          </li>
        ))}
      </ol>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <dt className="text-xs text-muted">Kondisi dilaporkan</dt>
          <dd className="flex flex-col items-start gap-1">
            <StatusBadge status={l.kondisi} />
            <span className="text-xs text-slate-600">{teksJumlah(l, f)}</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Kondisi fasilitas sekarang</dt>
          <dd>{f ? <StatusBadge status={f.kondisi} /> : <span className="text-muted">Fasilitas sudah dihapus</span>}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Pelapor</dt>
          <dd className="font-semibold">
            {l.pelapor} <span className="font-normal text-muted">({NAMA_PERAN[l.peranPelapor] ?? l.peranPelapor})</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Sumber</dt>
          <dd className="font-semibold">{l.sumber === 'inspeksi' ? 'Rapid Inspection' : 'Laporan manual'}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs text-muted">Keterangan</dt>
          <dd className="font-semibold">{l.catatan || '-'}</dd>
        </div>
        {(l.penangan || l.tindakLanjut) && (
          <div className="col-span-2">
            <dt className="text-xs text-muted">Tindak lanjut Sarpras</dt>
            <dd className="font-semibold">
              {l.tindakLanjut || '-'} {l.penangan && <span className="font-normal text-muted">({l.penangan})</span>}
            </dd>
          </div>
        )}
      </dl>

      {l.foto.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {l.foto.map((url, n) => (
            <a key={url} href={url} target="_blank" rel="noreferrer" aria-label={`Buka foto ${n + 1}`}>
              <img src={url} alt="" className="size-20 rounded-lg object-cover border border-line" />
            </a>
          ))}
        </div>
      )}

      {/* Unit yang ditentukan */}
      {perUnit && !bolehProses && (
        <div className="text-[13px]">
          <p className="text-xs text-muted mb-1">Unit yang bermasalah</p>
          {l.unitIds.length ? (
            <p className="font-mono font-semibold">{milikUnit.filter((u) => l.unitIds.includes(u.id)).map((u) => u.kodeAset).join(', ')}</p>
          ) : (
            <p className="text-muted">Belum ditentukan Sarpras</p>
          )}
        </div>
      )}

      {f && (
        <Link to={`/fasilitas?ruang=${l.ruangId}`} className="self-start inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary">
          Lihat fasilitas di Data Fasilitas <ArrowRight size={15} />
        </Link>
      )}

      {/* ===== Tindak lanjut (khusus Sarpras) ===== */}
      {bolehProses && (
        <div className="border-t border-line pt-4 flex flex-col gap-3.5">
          <h3 className="font-extrabold">Tindak Lanjut</h3>

          {perUnit && (
            <fieldset className="flex flex-col gap-2">
              <legend className="text-[13px] font-semibold mb-1">
                Unit yang bermasalah <span className="font-normal text-muted">(laporan: {l.jumlah} dari {f.jumlah} unit)</span>
              </legend>
              {milikUnit.map((u) => {
                const dicentang = unitDipilih.includes(u.id)
                return (
                  <label key={u.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${dicentang ? 'border-primary bg-primary-soft/50' : 'border-line'}`}>
                    <input type="checkbox" className="size-5 accent-[var(--color-primary)]" checked={dicentang} onChange={() => centang(u.id)} />
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

          {perUnit && l.status === 'baru' && (
            <label className={`${gayaLabel} max-w-64`}>
              Kondisi unit terpilih saat diproses
              <select className={gayaInput} value={kondisiUnit} onChange={(e) => setKondisiUnit(e.target.value)}>
                {['maintenance', 'rusak', 'perawatan'].map((k) => <option key={k} value={k}>{STATUS[k].label}</option>)}
              </select>
            </label>
          )}

          <label className={gayaLabel}>
            Catatan tindak lanjut
            <textarea rows={2} className={`${gayaInput} py-2.5`} value={tindakLanjut}
              onChange={(e) => { setTindakLanjut(e.target.value); setError('') }}
              placeholder="Contoh: teknisi vendor dijadwalkan Senin / kompresor sudah diganti / ditolak karena normal saat dicek" />
          </label>

          {error && <p role="alert" className="p-3 rounded-xl bg-bad-soft text-bad-ink text-sm font-semibold">{error}</p>}

          <div className="flex flex-wrap gap-2">
            {l.status === 'baru' && (
              <button type="button" disabled={sibuk} onClick={() => jalankan('diproses')} className={`${tombolKedua} disabled:opacity-60`}>
                <Wrench size={17} /> Proses
              </button>
            )}
            <button type="button" disabled={sibuk} onClick={() => jalankan('selesai')} className={`${tombolUtama} disabled:opacity-60`}>
              <CheckCircle2 size={17} /> Selesai (kembali Baik)
            </button>
            <button type="button" disabled={sibuk} onClick={() => jalankan('ditolak')}
              className="inline-flex items-center justify-center gap-2 min-h-11 px-5 rounded-xl border border-slate-300 text-slate-600 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60">
              <Ban size={17} /> Tolak
            </button>
          </div>
          <p className="text-xs text-muted">
            <b>Proses</b>: laporan diterima dan sedang ditangani{perUnit ? ', unit terpilih diberi kondisi di atas' : ''}. <b>Selesai</b>: sudah diperbaiki, kondisi kembali Baik.{' '}
            <b>Tolak</b>: bukan kerusakan, kondisi tidak diubah.
          </p>
        </div>
      )}
    </section>
  )
}

// ===== Form: buat laporan manual =====
function FormBuatLaporan({ tutup, berhasil }) {
  const { ruang, fasilitas, buatLaporan } = useData()
  const [kampus, setKampus] = useState('Kampus A')
  const [gedung, setGedung] = useState('')
  const [ruangId, setRuangId] = useState('')
  const [fasilitasId, setFasilitasId] = useState('')
  const [kondisi, setKondisi] = useState('rusak')
  const [jumlah, setJumlah] = useState('')
  const [catatan, setCatatan] = useState('')
  const [foto, setFoto] = useState([])
  const [error, setError] = useState('')
  const [menyimpan, setMenyimpan] = useState(false)
  const inputFoto = useRef(null)

  const daftarRuang = ruang.filter((r) => r.kampus === kampus && r.gedung === gedung)
  const daftarFasilitas = fasilitas.filter((f) => f.ruangId === ruangId)
  const f = fasilitas.find((x) => x.id === fasilitasId)

  function pilihFasilitas(id) {
    setFasilitasId(id)
    const x = fasilitas.find((y) => y.id === id)
    setJumlah(x?.jumlah === 1 ? '1' : '')
  }

  function ubahJumlah(teks) {
    const angka = parseInt(teks.replace(/\D/g, ''), 10)
    setJumlah(angka ? String(Math.min(angka, f?.jumlah ?? angka)) : '')
  }

  function tambahFoto(e) {
    const dipilih = [...e.target.files].filter((x) => x.type.startsWith('image/'))
    setFoto([...foto, ...dipilih.slice(0, MAKS_FOTO - foto.length).map((file) => ({ file, url: URL.createObjectURL(file) }))])
    e.target.value = ''
  }

  async function kirim() {
    if (!f) return setError('Pilih ruangan dan fasilitas yang bermasalah.')
    if (!Number(jumlah)) return setError(`Isi jumlah unit yang bermasalah (1 sampai ${f.jumlah}).`)
    if (!catatan.trim()) return setError('Tuliskan keterangan kerusakannya.')
    setMenyimpan(true)
    const hasil = await buatLaporan({ fasilitasId, kondisi, jumlah, catatan }, foto.map((x) => x.file))
    setMenyimpan(false)
    if (hasil.error) return setError(hasil.error)
    foto.forEach((x) => URL.revokeObjectURL(x.url))
    berhasil(`Laporan ${f.nama} di ${ruang.find((r) => r.id === ruangId)?.nama} terkirim ke Sarana Prasarana.`)
  }

  return (
    <Modal
      judul="Buat Laporan Kerusakan"
      keterangan="Laporan dikirim ke Sarana Prasarana untuk ditindaklanjuti"
      tutup={tutup}
      footer={
        <>
          <button type="button" onClick={tutup} className={tombolKedua}>Batal</button>
          <button type="button" onClick={kirim} disabled={menyimpan} className={`${tombolUtama} disabled:opacity-60`}>
            {menyimpan ? (foto.length ? 'Mengunggah foto…' : 'Mengirim…') : 'Kirim Laporan'}
          </button>
        </>
      }
    >
      <div className="grid gap-4">
        <div className="grid grid-cols-3 gap-2.5">
          <label className={gayaLabel}>
            Kampus
            <select className={gayaInput} value={kampus} onChange={(e) => { setKampus(e.target.value); setGedung(''); setRuangId(''); setFasilitasId('') }}>
              {DAFTAR_KAMPUS.map((k) => <option key={k}>{k}</option>)}
            </select>
          </label>
          <label className={gayaLabel}>
            Gedung
            <select className={gayaInput} value={gedung} onChange={(e) => { setGedung(e.target.value); setRuangId(''); setFasilitasId('') }}>
              <option value="">Pilih…</option>
              {gedungDiKampus(ruang, kampus).map((g) => <option key={g}>{g}</option>)}
            </select>
          </label>
          <label className={gayaLabel}>
            Ruangan *
            <select className={gayaInput} value={ruangId} disabled={!gedung} onChange={(e) => { setRuangId(e.target.value); setFasilitasId('') }}>
              <option value="">Pilih…</option>
              {daftarRuang.map((r) => <option key={r.id} value={r.id}>{r.nama}</option>)}
            </select>
          </label>
        </div>

        <label className={gayaLabel}>
          Fasilitas yang bermasalah *
          <select className={gayaInput} value={fasilitasId} disabled={!ruangId} onChange={(e) => pilihFasilitas(e.target.value)}>
            <option value="">{ruangId && daftarFasilitas.length === 0 ? 'Ruangan ini belum punya data fasilitas' : 'Pilih…'}</option>
            {daftarFasilitas.map((x) => (
              <option key={x.id} value={x.id}>
                {x.nama} ({x.jumlah} {x.satuan})
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
          <fieldset>
            <legend className="text-[13px] font-semibold mb-2">Kondisi *</legend>
            <div className="grid grid-cols-2 gap-2">
              {[
                ['perawatan', AlertTriangle, 'border-warn bg-warn-soft text-warn-ink'],
                ['rusak', XCircle, 'border-bad bg-bad-soft text-bad-ink'],
              ].map(([k, Ikon, gaya]) => (
                <button key={k} type="button" aria-pressed={kondisi === k} onClick={() => setKondisi(k)}
                  className={`min-h-11 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-1.5
                    ${kondisi === k ? `border-2 ${gaya}` : 'border border-slate-300 text-slate-600'}`}>
                  <Ikon size={17} /> {STATUS[k].label}
                </button>
              ))}
            </div>
          </fieldset>
          <label className={`${gayaLabel} w-28`}>
            Jumlah *
            <input type="text" inputMode="numeric" className={`${gayaInput} text-center`} value={jumlah} disabled={!f}
              onChange={(e) => ubahJumlah(e.target.value)} placeholder={f ? `1–${f.jumlah}` : '-'} />
          </label>
        </div>

        <label className={gayaLabel}>
          Keterangan kerusakan *
          <textarea rows={3} className={`${gayaInput} py-2.5`} value={catatan} onChange={(e) => { setCatatan(e.target.value); setError('') }}
            placeholder="Contoh: proyektor tidak menyala sejak pagi, sudah dicoba ganti kabel" />
        </label>

        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-semibold">Foto (opsional, maks. {MAKS_FOTO})</p>
          <div className="flex flex-wrap gap-2">
            {foto.map((x, i) => (
              <div key={x.url} className="relative size-20 rounded-lg overflow-hidden border border-line">
                <img src={x.url} alt={`Foto ${i + 1}`} className="size-full object-cover" />
                <button type="button" aria-label={`Hapus foto ${i + 1}`}
                  onClick={() => { URL.revokeObjectURL(x.url); setFoto(foto.filter((_, j) => j !== i)) }}
                  className="absolute top-0.5 right-0.5 size-7 grid place-items-center rounded-full bg-slate-900/70 text-white">
                  <X size={14} />
                </button>
              </div>
            ))}
            {foto.length < MAKS_FOTO && (
              <button type="button" onClick={() => inputFoto.current?.click()}
                className="size-20 rounded-lg border-2 border-dashed border-slate-300 text-muted hover:border-primary hover:text-primary grid place-items-center">
                <ImagePlus size={22} />
              </button>
            )}
          </div>
          <input ref={inputFoto} type="file" accept="image/*" multiple className="hidden" onChange={tambahFoto} />
        </div>

        {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
      </div>
    </Modal>
  )
}

// Dipakai juga di halaman Data Fasilitas (tab Laporan)
export { PilStatus }
