import { useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Plus, Search, Pencil, CheckCircle2, X, ChevronRight, ChevronLeft, School, Info, LayoutGrid, History, FileText,
  ImageIcon, Hash, MapPin, Ruler, Users, UserRound, LayoutList, AlertTriangle, XCircle, Clock,
  AirVent, Projector, Monitor, Lightbulb, Armchair, Table2, Presentation, PlugZap, DoorOpen, Package,
} from 'lucide-react'
import Header from '../components/Header.jsx'
import InfoMuat from '../components/InfoMuat.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import Modal, { gayaInput, gayaLabel, tombolUtama, tombolKedua } from '../components/Modal.jsx'
import { useData } from '../context/DataContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import {
  FASILITAS_STANDAR, JENIS_RUANG, SATUAN_KAPASITAS, DAFTAR_KAMPUS, gedungDiKampus, buatId, buatNama,
  teksKapasitas, teksLokasi,
} from '../data/konstanta.js'

const PER_HALAMAN = 10

const FORM_KOSONG = {
  kampus: 'Kampus A',
  gedung: '',
  ruangan: '',
  lantai: '',
  jenis: 'Ruang Kuliah',
  kapasitas: '',
  satuanKapasitas: 'Kursi',
  luas: '',
  penanggungJawab: '',
  deskripsi: '',
  fasilitasDipilih: ['AC', 'Proyektor', 'Lampu', 'Kursi Mahasiswa'],
}

const TAB = [
  { kode: 'detail', label: 'Detail Ruangan', ikon: Info },
  { kode: 'fasilitas', label: 'Daftar Fasilitas', ikon: LayoutGrid },
  { kode: 'riwayat', label: 'Riwayat Pemeliharaan', ikon: History },
  { kode: 'dokumen', label: 'Dokumen', ikon: FileText },
]

// Memilih ikon fasilitas berdasarkan namanya
function ikonFasilitas(nama) {
  const n = nama.toLowerCase()
  if (n.includes('ac')) return AirVent
  if (n.includes('layar')) return Monitor
  if (n.includes('proyektor')) return Projector
  if (n.includes('lampu')) return Lightbulb
  if (n.includes('kursi')) return Armchair
  if (n.includes('meja')) return Table2
  if (n.includes('papan')) return Presentation
  if (n.includes('stop') || n.includes('kontak')) return PlugZap
  if (n.includes('pintu') || n.includes('jendela')) return DoorOpen
  return Package
}

function persen(n, total) {
  if (!total) return '0%'
  return (Math.round((n / total) * 1000) / 10).toString().replace('.', ',') + '%'
}

export default function DataRuangan() {
  const { ruang, fasilitas, tambahRuang, ubahRuang } = useData()
  const { bisa } = useAuth()
  const [params] = useSearchParams()
  const [cari, setCari] = useState(params.get('cari') ?? '')
  const [filterKampus, setFilterKampus] = useState('Semua')
  const [filterGedung, setFilterGedung] = useState('Semua')
  const [halaman, setHalaman] = useState(1)
  const [dipilihId, setDipilihId] = useState(null)
  const [tab, setTab] = useState('detail')
  const [mode, setMode] = useState(null) // null = form tertutup, 'tambah' atau 'ubah'
  const [form, setForm] = useState(FORM_KOSONG)
  const [error, setError] = useState('')
  const [pesan, setPesan] = useState('')
  const [menyimpan, setMenyimpan] = useState(false)
  const panelDetail = useRef(null)

  const ubah = (kolom) => (e) => setForm({ ...form, [kolom]: e.target.value })

  // ===== Daftar ruangan (pencarian, filter, halaman) =====
  const ruangTampil = ruang.filter(
    (r) =>
      (filterKampus === 'Semua' || r.kampus === filterKampus) &&
      (filterGedung === 'Semua' || r.gedung === filterGedung) &&
      r.nama.toLowerCase().includes(cari.toLowerCase()),
  )
  const jumlahHalaman = Math.max(1, Math.ceil(ruangTampil.length / PER_HALAMAN))
  const halamanAman = Math.min(halaman, jumlahHalaman)
  const awal = (halamanAman - 1) * PER_HALAMAN
  const ruangHalamanIni = ruangTampil.slice(awal, awal + PER_HALAMAN)

  // Ruang yang sedang dilihat detailnya
  const ruangDipilih = ruangTampil.find((r) => r.id === dipilihId) ?? ruangTampil[0] ?? null
  const fasilitasRuang = ruangDipilih ? fasilitas.filter((f) => f.ruangId === ruangDipilih.id) : []
  const fasilitasBaik = fasilitasRuang.filter((f) => f.kondisi === 'baik').length
  // Riwayat pemeliharaan belum tersimpan di database (dibuat bersama menu Pemeliharaan)
  const riwayatRuang = []

  // Ringkasan di bagian atas
  const total = ruang.length
  const jumlah = (s) => ruang.filter((r) => r.status === s).length
  const kartu = [
    { label: 'Total Ruangan', nilai: total, satuan: 'ruangan', ikon: LayoutList, warna: 'bg-primary-soft text-primary' },
    { label: 'Kondisi Baik', nilai: jumlah('baik'), satuan: `ruangan (${persen(jumlah('baik'), total)})`, ikon: CheckCircle2, warna: 'bg-ok-soft text-ok' },
    { label: 'Bermasalah', nilai: jumlah('perawatan'), satuan: `ruangan (${persen(jumlah('perawatan'), total)})`, ikon: AlertTriangle, warna: 'bg-warn-soft text-amber-700' },
    { label: 'Tidak Dapat Digunakan', nilai: jumlah('rusak'), satuan: `ruangan (${persen(jumlah('rusak'), total)})`, ikon: XCircle, warna: 'bg-bad-soft text-bad' },
  ]

  function pilihRuang(id) {
    setDipilihId(id)
    setTab('detail')
    // Di layar kecil, gulir ke panel detail
    if (window.innerWidth < 1024) panelDetail.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function bukaTambah() {
    setForm(FORM_KOSONG)
    setError('')
    setMode('tambah')
  }

  function bukaUbah() {
    setForm({
      ...FORM_KOSONG,
      kampus: ruangDipilih.kampus,
      gedung: ruangDipilih.gedung,
      ruangan: ruangDipilih.ruangan,
      lantai: ruangDipilih.lantai ? String(ruangDipilih.lantai) : '',
      jenis: ruangDipilih.jenis,
      kapasitas: ruangDipilih.kapasitas ?? '',
      satuanKapasitas: ruangDipilih.satuanKapasitas ?? 'Kursi',
      luas: ruangDipilih.luas ?? '',
      penanggungJawab: ruangDipilih.penanggungJawab ?? '',
      deskripsi: ruangDipilih.deskripsi ?? '',
    })
    setError('')
    setMode('ubah')
  }

  function pilihFasilitas(nama) {
    const sudah = form.fasilitasDipilih.includes(nama)
    setForm({
      ...form,
      fasilitasDipilih: sudah ? form.fasilitasDipilih.filter((n) => n !== nama) : [...form.fasilitasDipilih, nama],
    })
  }

  async function simpan() {
    if (!form.gedung.trim() || !form.ruangan.trim()) return setError('Gedung dan ruangan wajib diisi.')

    const data = {
      nama: buatNama(form.gedung, form.ruangan),
      kampus: form.kampus,
      gedung: form.gedung.trim(),
      ruangan: form.ruangan.trim(),
      lantai: Number(form.lantai) || null,
      jenis: form.jenis,
      kapasitas: Number(form.kapasitas) || null,
      satuanKapasitas: Number(form.kapasitas) ? form.satuanKapasitas : null,
      luas: Number(form.luas) || null,
      penanggungJawab: form.penanggungJawab.trim(),
      deskripsi: form.deskripsi.trim(),
    }

    const sudahAda = ruang.find((r) => buatId(r.nama) === buatId(data.nama))
    if (sudahAda && (mode === 'tambah' || sudahAda.id !== ruangDipilih.id)) {
      return setError(`Ruangan ${data.nama} sudah terdaftar.`)
    }

    setError('')
    setMenyimpan(true)
    if (mode === 'ubah') {
      const hasil = await ubahRuang(ruangDipilih.id, data)
      setMenyimpan(false)
      if (hasil.error) return setError(hasil.error)
      setPesan(`Data ${data.nama} berhasil diperbarui.`)
    } else {
      const daftar = FASILITAS_STANDAR.filter(([nama]) => form.fasilitasDipilih.includes(nama)).map(
        ([nama, kategori, jumlah, satuan, singkat]) => ({ nama, kategori, jumlah, satuan, singkat }),
      )
      const hasil = await tambahRuang(data, daftar)
      setMenyimpan(false)
      if (hasil.error) return setError(hasil.error)
      setDipilihId(hasil.id)
      setCari('')
      setFilterKampus('Semua')
      setFilterGedung('Semua')
      setPesan(`${data.nama} berhasil ditambahkan dengan ${daftar.length} fasilitas.`)
    }
    setMode(null)
  }

  return (
    <>
      <Header judul="Data Ruangan" subjudul="Manajemen data ruangan dan fasilitas di setiap ruangan" />
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

      {/* ===== Kartu ringkasan ===== */}
      <section aria-label="Ringkasan" className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(210px,1fr))]">
        {kartu.map(({ label, nilai, satuan, ikon: Ikon, warna }) => (
          <div key={label} className="bg-white border border-line rounded-2xl p-4 flex items-center gap-3.5">
            <span className={`size-13 shrink-0 rounded-xl grid place-items-center ${warna}`}>
              <Ikon size={26} />
            </span>
            <div>
              <p className="text-sm font-semibold">{label}</p>
              <p>
                <b className="text-2xl font-extrabold">{nilai}</b> <span className="text-slate-700">{satuan}</span>
              </p>
            </div>
          </div>
        ))}
      </section>

      <div className="flex flex-wrap gap-5 items-start">
        {/* ===== Kiri: daftar ruangan ===== */}
        <section aria-label="Daftar ruangan" className="flex-[1_1_480px] min-w-0 bg-white border border-line rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold">Daftar Ruangan</h2>
            {bisa('kelolaData') && (
              <button type="button" onClick={bukaTambah} className={tombolUtama}>
                <Plus size={18} /> Tambah Ruangan
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2.5">
            <label className="flex-[1_1_200px] flex items-center gap-2.5 min-h-11 px-3.5 border border-slate-200 rounded-xl text-muted">
              <Search size={18} />
              <input
                type="search"
                aria-label="Cari ruangan"
                placeholder="Cari nama ruangan..."
                value={cari}
                onChange={(e) => {
                  setCari(e.target.value)
                  setHalaman(1)
                }}
                className="flex-1 min-w-0 bg-transparent outline-none text-sm text-ink"
              />
            </label>
            <select
              aria-label="Filter kampus"
              value={filterKampus}
              onChange={(e) => {
                setFilterKampus(e.target.value)
                setFilterGedung('Semua')
                setHalaman(1)
              }}
              className={`${gayaInput} sm:w-40`}
            >
              <option value="Semua">Semua kampus</option>
              {DAFTAR_KAMPUS.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
            <select
              aria-label="Filter gedung"
              value={filterGedung}
              onChange={(e) => {
                setFilterGedung(e.target.value)
                setHalaman(1)
              }}
              className={`${gayaInput} sm:w-40`}
            >
              <option value="Semua">Semua gedung</option>
              {gedungDiKampus(ruang, filterKampus).map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-120 text-sm border-collapse">
              <thead>
                <tr className="text-left bg-slate-50 text-slate-600 text-[13px]">
                  <th className="px-3 py-3 font-bold">No.</th>
                  <th className="px-3 py-3 font-bold">Nama Ruangan</th>
                  <th className="px-3 py-3 font-bold">Lokasi</th>
                  <th className="px-3 py-3 font-bold text-center">Total Fasilitas</th>
                  <th className="px-3 py-3 font-bold">Kondisi</th>
                  <th className="px-2 py-3" aria-label="Detail" />
                </tr>
              </thead>
              <tbody>
                {ruangHalamanIni.map((r, i) => {
                  const aktif = r.id === ruangDipilih?.id
                  return (
                    <tr
                      key={r.id}
                      onClick={() => pilihRuang(r.id)}
                      className={`border-b border-slate-100 cursor-pointer ${aktif ? 'bg-primary-soft' : 'hover:bg-slate-50'}`}
                    >
                      <td className="px-3 py-3 text-muted">{awal + i + 1}</td>
                      <td className="px-3 py-3 font-bold">{r.nama}</td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="block">{r.lantai ? `${r.gedung} · Lt. ${r.lantai}` : r.gedung}</span>
                        <span className="block text-xs text-muted">{r.kampus}</span>
                      </td>
                      <td className="px-3 py-3 text-center">{r.jumlahFasilitas}</td>
                      <td className="px-3 py-3">
                        <StatusBadge status={r.status} ruang />
                      </td>
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          aria-label={`Lihat detail ${r.nama}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            pilihRuang(r.id)
                          }}
                          className="size-9 grid place-items-center rounded-lg text-slate-500 hover:bg-white"
                        >
                          <ChevronRight size={18} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {ruangTampil.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-muted">
                      Tidak ada ruangan yang cocok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Halaman */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-muted">
              Menampilkan {ruangTampil.length ? awal + 1 : 0}–{awal + ruangHalamanIni.length} dari {ruangTampil.length} ruangan
            </p>
            <div className="flex gap-1.5">
              <button
                type="button"
                aria-label="Halaman sebelumnya"
                disabled={halamanAman === 1}
                onClick={() => setHalaman(halamanAman - 1)}
                className="size-9 grid place-items-center rounded-lg border border-line disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: jumlahHalaman }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-current={n === halamanAman ? 'page' : undefined}
                  onClick={() => setHalaman(n)}
                  className={`size-9 rounded-lg text-sm font-semibold ${
                    n === halamanAman ? 'bg-primary text-white' : 'border border-line hover:bg-slate-50'
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                aria-label="Halaman berikutnya"
                disabled={halamanAman === jumlahHalaman}
                onClick={() => setHalaman(halamanAman + 1)}
                className="size-9 grid place-items-center rounded-lg border border-line disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </section>

        {/* ===== Kanan: detail ruangan ===== */}
        <section
          ref={panelDetail}
          aria-label="Detail ruangan"
          className="flex-[1.4_1_520px] min-w-0 bg-white border border-line rounded-2xl p-5 flex flex-col gap-4 scroll-mt-4"
        >
          {!ruangDipilih ? (
            <p className="text-muted text-sm py-10 text-center">Pilih ruangan di daftar untuk melihat detailnya.</p>
          ) : (
            <>
              {/* Judul ruangan */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <span className="size-14 shrink-0 rounded-xl bg-primary-soft text-primary grid place-items-center">
                    <School size={28} />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-extrabold">{ruangDipilih.nama}</h2>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700">
                        {teksLokasi(ruangDipilih)}
                      </span>
                      <StatusBadge status={ruangDipilih.status} ruang />
                    </div>
                    <p className="text-sm text-muted mt-0.5">{ruangDipilih.deskripsi || ruangDipilih.jenis}</p>
                  </div>
                </div>
                {bisa('kelolaData') && (
                  <button type="button" onClick={bukaUbah} className={tombolKedua}>
                    <Pencil size={16} /> Ubah Data
                  </button>
                )}
              </div>

              {/* Tab */}
              <div role="tablist" className="flex gap-1 border-b border-line overflow-x-auto">
                {TAB.map(({ kode, label, ikon: Ikon }) => (
                  <button
                    key={kode}
                    type="button"
                    role="tab"
                    aria-selected={tab === kode}
                    onClick={() => setTab(kode)}
                    className={`flex items-center gap-2 whitespace-nowrap px-3.5 py-3 text-sm font-semibold border-b-2 -mb-px ${
                      tab === kode ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-ink'
                    }`}
                  >
                    <Ikon size={16} />
                    {label}
                  </button>
                ))}
              </div>

              {/* Tab: Detail Ruangan */}
              {tab === 'detail' && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="aspect-[4/3] rounded-xl bg-slate-100 border border-line flex flex-col items-center justify-center gap-2 text-muted">
                      <ImageIcon size={36} />
                      <span className="text-sm">Foto ruangan belum tersedia</span>
                    </div>
                    <div className="rounded-xl border border-line p-4">
                      <h3 className="font-bold mb-3">Informasi Ruangan</h3>
                      <dl className="flex flex-col gap-2.5 text-sm">
                        {[
                          [Hash, 'Jenis', ruangDipilih.jenis],
                          [MapPin, 'Lokasi', teksLokasi(ruangDipilih)],
                          [Ruler, 'Luas', ruangDipilih.luas ? `${ruangDipilih.luas} m²` : '-'],
                          [Users, 'Kapasitas', teksKapasitas(ruangDipilih)],
                          [UserRound, 'Penanggung Jawab', ruangDipilih.penanggungJawab || '-'],
                          [Clock, 'Inspeksi Terakhir', ruangDipilih.inspeksiTerakhir ?? 'Belum ada'],
                        ].map(([Ikon, label, nilai]) => (
                          <div key={label} className="grid grid-cols-[20px_130px_1fr] items-start gap-2">
                            <Ikon size={16} className="mt-0.5 text-slate-500" />
                            <dt className="text-slate-600">{label}</dt>
                            <dd className="font-semibold">{nilai}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </div>

                  <div className="rounded-xl border border-line p-4 flex flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-bold">Kondisi Fasilitas di Ruangan</h3>
                      <div className="flex gap-2 text-xs font-semibold">
                        <span className="px-2.5 py-1 rounded-md bg-slate-100">Total: {fasilitasRuang.length} item</span>
                        <span className="px-2.5 py-1 rounded-md bg-ok-soft text-ok-ink">
                          Baik: {fasilitasBaik} ({persen(fasilitasBaik, fasilitasRuang.length)})
                        </span>
                      </div>
                    </div>
                    <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(150px,1fr))]">
                      {fasilitasRuang.map((f) => {
                        const Ikon = ikonFasilitas(f.nama)
                        return (
                          <div key={f.id} className="rounded-xl border border-line p-3 flex items-start gap-3">
                            <span className="size-10 shrink-0 rounded-lg bg-slate-50 text-slate-700 grid place-items-center">
                              <Ikon size={22} />
                            </span>
                            <div className="min-w-0 flex flex-col items-start gap-1">
                              <p className="text-sm font-bold leading-tight">{f.nama}</p>
                              <p className="text-xs text-muted">
                                {f.jumlah} {f.satuan}
                              </p>
                              <StatusBadge status={f.kondisi} />
                            </div>
                          </div>
                        )
                      })}
                      {fasilitasRuang.length === 0 && <p className="text-sm text-muted">Belum ada fasilitas di ruangan ini.</p>}
                    </div>
                  </div>
                </>
              )}

              {/* Tab: Daftar Fasilitas */}
              {tab === 'fasilitas' && (
                <div className="flex flex-col gap-3">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-120 text-sm border-collapse">
                      <thead>
                        <tr className="text-left bg-slate-50 text-slate-600 text-[13px]">
                          <th className="px-3 py-3 font-bold">Fasilitas</th>
                          <th className="px-3 py-3 font-bold">Jumlah</th>
                          <th className="px-3 py-3 font-bold">Kode Aset</th>
                          <th className="px-3 py-3 font-bold">Kondisi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fasilitasRuang.map((f) => (
                          <tr key={f.id} className="border-b border-slate-100">
                            <td className="px-3 py-3 font-bold">{f.nama}</td>
                            <td className="px-3 py-3">
                              {f.jumlah} {f.satuan}
                            </td>
                            <td className="px-3 py-3 font-mono text-xs">{f.kodeAset}</td>
                            <td className="px-3 py-3">
                              <StatusBadge status={f.kondisi} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Link to={`/fasilitas?ruang=${ruangDipilih.id}`} className="text-sm font-semibold text-primary self-start">
                    Buka di halaman Data Fasilitas →
                  </Link>
                </div>
              )}

              {/* Tab: Riwayat Pemeliharaan */}
              {tab === 'riwayat' && (
                <div className="flex flex-col gap-3">
                  {riwayatRuang.map((r, i) => (
                    <div key={i} className="flex gap-3 items-start p-3.5 rounded-xl border border-line">
                      <div className="flex-1">
                        <p className="text-sm font-bold">{r.kegiatan}</p>
                        <p className="text-xs text-muted">
                          {r.tanggal} · {r.oleh}
                        </p>
                      </div>
                      <StatusBadge status={r.status} ruang />
                    </div>
                  ))}
                  {riwayatRuang.length === 0 && (
                    <p className="text-sm text-muted py-6 text-center">Belum ada riwayat pemeliharaan untuk ruangan ini.</p>
                  )}
                </div>
              )}

              {/* Tab: Dokumen */}
              {tab === 'dokumen' && (
                <div className="py-8 flex flex-col items-center gap-2 text-center text-muted">
                  <FileText size={36} />
                  <p className="font-semibold text-ink">Belum ada dokumen</p>
                  <p className="text-sm max-w-sm">Fitur unggah dokumen (denah, berita acara, dan sejenisnya) akan ditambahkan setelah tersambung ke Supabase.</p>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {/* ===== Form tambah / ubah ruangan ===== */}
      {mode && (
        <Modal
          judul={mode === 'ubah' ? 'Ubah Data Ruangan' : 'Tambah Ruangan'}
          keterangan={mode === 'ubah' ? 'Perubahan langsung tampil di dashboard.' : 'Ruangan baru langsung muncul di dashboard dengan status "Belum Diinspeksi".'}
          tutup={() => setMode(null)}
          footer={
            <>
              <button type="button" onClick={() => setMode(null)} className={tombolKedua}>
                Batal
              </button>
              <button type="button" onClick={simpan} disabled={menyimpan} className={`${tombolUtama} disabled:opacity-60`}>
                Simpan
              </button>
            </>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={gayaLabel}>
              Kampus *
              <select className={gayaInput} value={form.kampus} onChange={ubah('kampus')}>
                {DAFTAR_KAMPUS.map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </label>
            <label className={gayaLabel}>
              Gedung *
              <input className={gayaInput} list="daftar-gedung" value={form.gedung} onChange={ubah('gedung')} placeholder="Contoh: G4 atau CM" />
              <datalist id="daftar-gedung">
                {gedungDiKampus(ruang, form.kampus).map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </label>
            <label className={gayaLabel}>
              Ruangan *
              <input className={gayaInput} value={form.ruangan} onChange={ubah('ruangan')} placeholder="Contoh: R5, 101, Lab Virtual" />
            </label>
            <div className="flex flex-col gap-1.5 text-[13px]">
              <span className="font-semibold">Nama yang akan tampil</span>
              <span className="min-h-11 px-3 rounded-xl bg-slate-50 border border-line flex items-center text-sm font-bold">
                {form.gedung.trim() && form.ruangan.trim() ? buatNama(form.gedung, form.ruangan) : '-'}
              </span>
            </div>
            <label className={gayaLabel}>
              Lantai
              <select className={gayaInput} value={form.lantai} onChange={ubah('lantai')}>
                <option value="">Tidak ada / belum diketahui</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    Lantai {n}
                  </option>
                ))}
              </select>
            </label>
            <label className={gayaLabel}>
              Jenis ruangan
              <select className={gayaInput} value={form.jenis} onChange={ubah('jenis')}>
                {JENIS_RUANG.map((j) => (
                  <option key={j}>{j}</option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <label className={gayaLabel}>
                Kapasitas
                <input type="number" min="1" className={gayaInput} value={form.kapasitas} onChange={ubah('kapasitas')} placeholder="Contoh: 40" />
              </label>
              <label className={gayaLabel}>
                Satuan
                <select className={gayaInput} value={form.satuanKapasitas} onChange={ubah('satuanKapasitas')}>
                  {SATUAN_KAPASITAS.map((sat) => (
                    <option key={sat}>{sat}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className={gayaLabel}>
              Luas (m²)
              <input type="number" min="1" className={gayaInput} value={form.luas} onChange={ubah('luas')} placeholder="72" />
            </label>
            <label className={`${gayaLabel} sm:col-span-2`}>
              Penanggung jawab
              <input className={gayaInput} value={form.penanggungJawab} onChange={ubah('penanggungJawab')} placeholder="Contoh: Petugas PKTL Gedung 4" />
            </label>
            <label className={`${gayaLabel} sm:col-span-2`}>
              Deskripsi singkat
              <textarea
                rows={2}
                className={`${gayaInput} py-2.5`}
                value={form.deskripsi}
                onChange={ubah('deskripsi')}
                placeholder="Contoh: Ruang kuliah reguler untuk perkuliahan tatap muka."
              />
            </label>

            {mode === 'tambah' && (
              <fieldset className="sm:col-span-2 flex flex-col gap-2.5">
                <legend className="text-[13px] font-semibold mb-2">Fasilitas awal (jumlah bisa diatur di Data Fasilitas)</legend>
                <div className="flex flex-wrap gap-2">
                  {FASILITAS_STANDAR.map(([nama]) => {
                    const aktif = form.fasilitasDipilih.includes(nama)
                    return (
                      <button
                        key={nama}
                        type="button"
                        aria-pressed={aktif}
                        onClick={() => pilihFasilitas(nama)}
                        className={`min-h-10 px-3.5 rounded-full text-[13px] font-semibold ${
                          aktif ? 'border-2 border-primary bg-primary-soft text-primary-dark' : 'border border-slate-300 text-slate-600'
                        }`}
                      >
                        {nama}
                      </button>
                    )
                  })}
                </div>
              </fieldset>
            )}

            {error && (
              <p role="alert" className="sm:col-span-2 text-sm font-semibold text-red-700">
                {error}
              </p>
            )}
          </div>
        </Modal>
      )}
    </>
  )
}
