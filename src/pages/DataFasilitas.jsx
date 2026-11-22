import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Plus, Search, Pencil, Trash2, QrCode, CheckCircle2, AlertTriangle, XCircle, X, ChevronLeft, ChevronRight,
  Boxes, Package, MapPin, Clock, History, ClipboardList, Layers, ArrowRight, Info, Wrench, ScanSearch, UserCog,
  AirVent, Projector, Monitor, Lightbulb, Armchair, Table2, Presentation, PlugZap, DoorOpen,
  FileSpreadsheet, Printer, Banknote, ImagePlus, ImageOff, Tag, BadgeCheck,
} from 'lucide-react'
import Header from '../components/Header.jsx'
import InfoMuat from '../components/InfoMuat.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import Modal, { gayaInput, gayaLabel, tombolUtama, tombolKedua } from '../components/Modal.jsx'
import { useData } from '../context/DataContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { KATEGORI, SATUAN, STATUS, DAFTAR_KAMPUS, FASILITAS_STANDAR, gedungDiKampus, buatId } from '../data/konstanta.js'
import { PilStatus } from './Pemeliharaan.jsx'
import {
  ASAL_PEROLEHAN, SARAN_SUMBER_DANA, SARAN_PENANGGUNG_JAWAB, rupiah, rupiahRingkas, rincianKondisi, nilaiFasilitas, dataKurang,
  unitLengkap, unduhExcelInventaris, cetakInventaris,
} from '../lib/inventaris.js'

const PER_HALAMAN = 10
const MAKS_FOTO = 5
// Data inventaris kelompok fasilitas (semuanya opsional)
const INVENTARIS_KOSONG = {
  merek: '', model: '', spesifikasi: '', tahunPengadaan: '', asalPerolehan: '', hargaSatuan: '', sumberDana: '', penanggungJawab: '', keterangan: '',
}
const FORM_KOSONG = { ruangId: '', nama: '', kategori: 'Elektronik', jumlah: '1', satuan: 'unit', kondisi: 'baik', lacakPerUnit: false, ...INVENTARIS_KOSONG }
const UNIT_KOSONG = {
  posisi: '', merek: '', model: '', spesifikasi: '', nomorSeri: '', tahunPengadaan: '', asalPerolehan: '', hargaPerolehan: '', sumberDana: '',
}

// Angka harga dari database -> isian form ('' bila kosong)
const hargaKeForm = (n) => (n === null || n === undefined ? '' : String(n))

// Singkatan untuk kode aset. Fasilitas standar memakai singkatan bakunya (Proyektor -> PRJ),
// selain itu dari huruf depan setiap kata, contoh "Kursi Mahasiswa" -> "KM"
function singkatan(nama) {
  const standar = FASILITAS_STANDAR.find(([n]) => n.toLowerCase() === nama.trim().toLowerCase())
  if (standar) return standar[4]
  const huruf = nama.replace(/[^A-Za-z ]/g, '').trim().split(/\s+/).map((k) => k[0] ?? '').join('').toUpperCase()
  return huruf.length >= 2 ? huruf : nama.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'FAS'
}

// Barang bernilai tinggi yang disarankan dicatat per unit
const SARAN_PER_UNIT = /\b(ac|proyektor|komputer|pc|monitor|tv|televisi|printer|laptop|speaker)\b/i

// Ikon fasilitas ditebak dari namanya
function ikonFasilitas(nama) {
  const n = nama.toLowerCase()
  if (/\bac\b/.test(n)) return AirVent
  if (n.includes('proyektor')) return Projector
  if (n.includes('monitor') || n.includes('komputer') || n.includes('tv')) return Monitor
  if (n.includes('lampu')) return Lightbulb
  if (n.includes('kursi')) return Armchair
  if (n.includes('meja')) return Table2
  if (n.includes('papan') || n.includes('layar')) return Presentation
  if (n.includes('kontak') || n.includes('listrik')) return PlugZap
  if (n.includes('pintu') || n.includes('jendela')) return DoorOpen
  return Package
}

const SEMUA_KONDISI = ['baik', 'perawatan', 'rusak', 'maintenance']
const GAYA_KONDISI = {
  baik: { ikon: CheckCircle2, aktif: 'border-ok bg-ok-soft text-ok-ink' },
  perawatan: { ikon: AlertTriangle, aktif: 'border-warn bg-warn-soft text-warn-ink' },
  rusak: { ikon: XCircle, aktif: 'border-bad bg-bad-soft text-bad-ink' },
  maintenance: { ikon: Wrench, aktif: 'border-sky-500 bg-sky-50 text-sky-700' },
}

export default function DataFasilitas() {
  const { ruang, fasilitas, unit, tambahFasilitas } = useData()
  const { bisa, pengguna } = useAuth()
  const lihatNilai = bisa('kelolaData') // harga & nilai aset hanya untuk Sarpras
  const [params, setParams] = useSearchParams()

  // Filter
  const ruangDariTautan = ruang.find((r) => r.id === params.get('ruang'))
  const [kampus, setKampus] = useState(() => ruangDariTautan?.kampus ?? 'Semua')
  const [gedung, setGedung] = useState(() => ruangDariTautan?.gedung ?? 'Semua')
  const [ruangFilter, setRuangFilter] = useState(() => ruangDariTautan?.id ?? 'Semua')
  const [kategori, setKategori] = useState('Semua')
  const [kondisi, setKondisi] = useState('Semua')
  const [kelengkapan, setKelengkapan] = useState('Semua')
  const [cari, setCari] = useState('')
  const [mengunduh, setMengunduh] = useState(false)
  const [halaman, setHalaman] = useState(1)

  const [dipilihId, setDipilihId] = useState(null)
  const [formTerbuka, setFormTerbuka] = useState(false)
  const [pesan, setPesan] = useState('')
  const areaDetail = useRef(null)

  function pilihFasilitas(id) {
    setDipilihId(id)
    // Di HP/tablet panel detail ada di bawah daftar, jadi gulir ke sana
    if (window.innerWidth < 1280) setTimeout(() => areaDetail.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const ruangById = Object.fromEntries(ruang.map((r) => [r.id, r]))
  const daftarRuangFilter = ruang.filter((r) => (kampus === 'Semua' || r.kampus === kampus) && (gedung === 'Semua' || r.gedung === gedung))

  const fasilitasTampil = fasilitas.filter((f) => {
    const r = ruangById[f.ruangId]
    if (!r) return false
    const teks = `${f.nama} ${f.kodeAset} ${r.nama} ${f.merek} ${f.model} ${f.spesifikasi} ${f.sumberDana} ${f.penanggungJawab}`.toLowerCase()
    const kodeUnitCocok = unit.some(
      (u) => u.fasilitasId === f.id && `${u.kodeAset} ${u.nomorSeri} ${u.merek} ${u.model}`.toLowerCase().includes(cari.toLowerCase()),
    )
    const lengkap = dataKurang(f).length === 0
    return (
      (kampus === 'Semua' || r.kampus === kampus) &&
      (gedung === 'Semua' || r.gedung === gedung) &&
      (ruangFilter === 'Semua' || r.id === ruangFilter) &&
      (kategori === 'Semua' || f.kategori === kategori) &&
      (kondisi === 'Semua' || f.kondisi === kondisi) &&
      (kelengkapan === 'Semua' || (kelengkapan === 'lengkap') === lengkap) &&
      (teks.includes(cari.toLowerCase()) || (cari && kodeUnitCocok))
    )
  })

  const jumlahHalaman = Math.max(1, Math.ceil(fasilitasTampil.length / PER_HALAMAN))
  const halamanAman = Math.min(halaman, jumlahHalaman)
  const awal = (halamanAman - 1) * PER_HALAMAN
  const fasilitasHalamanIni = fasilitasTampil.slice(awal, awal + PER_HALAMAN)

  const dipilih = fasilitas.find((f) => f.id === dipilihId) ?? fasilitasTampil[0] ?? null

  // Kartu ringkasan: dihitung per UNIT barang (bukan per baris)
  const total = fasilitasTampil.reduce(
    (jml, f) => {
      const k = rincianKondisi(f, unit.filter((u) => u.fasilitasId === f.id))
      return {
        unit: jml.unit + f.jumlah,
        baik: jml.baik + k.baik,
        perawatan: jml.perawatan + k.perawatan,
        rusak: jml.rusak + k.rusak,
        maintenance: jml.maintenance + k.maintenance,
        nilai: jml.nilai + (nilaiFasilitas(f, unit.filter((u) => u.fasilitasId === f.id)) ?? 0),
      }
    },
    { unit: 0, baik: 0, perawatan: 0, rusak: 0, maintenance: 0, nilai: 0 },
  )
  const kartu = [
    { label: 'Jenis Fasilitas', nilai: fasilitasTampil.length, satuan: 'kelompok', ikon: Layers, warna: 'bg-primary-soft text-primary' },
    { label: 'Total Unit', nilai: total.unit, satuan: 'unit', ikon: Boxes, warna: 'bg-slate-100 text-slate-600' },
    { label: 'Baik', nilai: total.baik, satuan: 'unit', ikon: CheckCircle2, warna: 'bg-ok-soft text-ok' },
    { label: 'Bermasalah', nilai: total.perawatan, satuan: 'unit', ikon: AlertTriangle, warna: 'bg-warn-soft text-amber-700' },
    { label: 'Rusak', nilai: total.rusak, satuan: 'unit', ikon: XCircle, warna: 'bg-bad-soft text-bad' },
    { label: 'Maintenance', nilai: total.maintenance, satuan: 'unit', ikon: Wrench, warna: 'bg-sky-50 text-sky-700' },
    ...(lihatNilai
      ? [{ label: 'Nilai Aset', nilai: total.nilai ? rupiahRingkas(total.nilai) : '-', satuan: total.nilai ? '' : 'harga belum diisi', ikon: Banknote, warna: 'bg-emerald-50 text-emerald-700', judul: rupiah(total.nilai) }]
      : []),
  ]

  // Keterangan filter untuk judul file unduhan
  const teksFilter =
    [
      kampus !== 'Semua' && kampus,
      gedung !== 'Semua' && `Gedung ${gedung}`,
      ruangFilter !== 'Semua' && ruangById[ruangFilter]?.nama,
      kategori !== 'Semua' && `Kategori ${kategori}`,
      kondisi !== 'Semua' && `Kondisi ${STATUS[kondisi].label}`,
      kelengkapan !== 'Semua' && (kelengkapan === 'lengkap' ? 'Data lengkap' : 'Data belum lengkap'),
      cari && `Pencarian "${cari}"`,
    ]
      .filter(Boolean)
      .join(', ') || 'Semua fasilitas'
  const bahanUnduh = { daftar: fasilitasTampil, unit, ruangById, teksFilter, pengguna, lihatNilai }

  async function unduhExcel() {
    setMengunduh(true)
    try {
      await unduhExcelInventaris(bahanUnduh)
    } catch (e) {
      window.alert(`Excel gagal dibuat: ${e.message}`)
    } finally {
      setMengunduh(false)
    }
  }

  const gantiFilter = (aksi) => (e) => {
    aksi(e.target.value)
    setHalaman(1)
    setParams({})
  }

  return (
    <>
      <Header judul="Data Fasilitas" subjudul="Inventaris barang UISI per ruangan: identitas, perolehan, kondisi, unit, dan riwayatnya" />
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
      <section aria-label="Ringkasan fasilitas" className={`grid gap-3 grid-cols-2 md:grid-cols-3 ${lihatNilai ? 'xl:grid-cols-4 2xl:grid-cols-7' : '2xl:grid-cols-6'}`}>
        {kartu.map(({ label, nilai, satuan, ikon: Ikon, warna, judul }) => (
          <div key={label} title={judul} className="bg-white border border-line rounded-2xl p-4 flex items-center gap-3">
            <span className={`size-11 shrink-0 rounded-xl grid place-items-center ${warna}`}>
              <Ikon size={22} />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-slate-600">{label}</p>
              <p className="text-sm text-muted">
                <b className="text-2xl text-ink mr-1">{nilai}</b>
                {satuan}
              </p>
            </div>
          </div>
        ))}
      </section>

      <div className="grid gap-4 items-start xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,1fr)]">
        {/* ===== Kiri: daftar fasilitas ===== */}
        <section aria-label="Daftar fasilitas" className="bg-white border border-line rounded-2xl p-4 flex flex-col gap-3.5 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <h2 className="text-lg font-extrabold">Daftar Fasilitas</h2>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={unduhExcel} disabled={mengunduh || !fasilitasTampil.length}
                className={`${tombolKedua} min-h-10 px-3.5 disabled:opacity-50`}>
                <FileSpreadsheet size={17} className="text-emerald-700" /> {mengunduh ? 'Menyiapkan…' : 'Excel'}
              </button>
              <button type="button" onClick={() => cetakInventaris(bahanUnduh)} disabled={!fasilitasTampil.length}
                className={`${tombolKedua} min-h-10 px-3.5 disabled:opacity-50`}>
                <Printer size={17} className="text-primary" /> PDF / Cetak
              </button>
              {bisa('kelolaData') && (
                <button type="button" onClick={() => setFormTerbuka(true)} className={`${tombolUtama} min-h-10 px-4`}>
                  <Plus size={18} /> Tambah
                </button>
              )}
            </div>
          </div>

          <label className="relative">
            <span className="sr-only">Cari fasilitas</span>
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              className={`${gayaInput} pl-9`}
              value={cari}
              onChange={(e) => {
                setCari(e.target.value)
                setHalaman(1)
              }}
              placeholder="Cari nama, kode aset, merek, nomor seri, ruangan, atau penanggung jawab…"
            />
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <select aria-label="Filter kampus" value={kampus} className={gayaInput}
              onChange={gantiFilter((v) => { setKampus(v); setGedung('Semua'); setRuangFilter('Semua') })}>
              <option value="Semua">Kampus</option>
              {DAFTAR_KAMPUS.map((k) => <option key={k}>{k}</option>)}
            </select>
            <select aria-label="Filter gedung" value={gedung} className={gayaInput}
              onChange={gantiFilter((v) => { setGedung(v); setRuangFilter('Semua') })}>
              <option value="Semua">Gedung</option>
              {gedungDiKampus(ruang, kampus).map((g) => <option key={g}>{g}</option>)}
            </select>
            <select aria-label="Filter ruangan" value={ruangFilter} className={gayaInput} onChange={gantiFilter(setRuangFilter)}>
              <option value="Semua">Ruangan</option>
              {daftarRuangFilter.map((r) => <option key={r.id} value={r.id}>{r.nama}</option>)}
            </select>
            <select aria-label="Filter kategori" value={kategori} className={gayaInput} onChange={gantiFilter(setKategori)}>
              <option value="Semua">Kategori</option>
              {KATEGORI.map((k) => <option key={k}>{k}</option>)}
            </select>
            <select aria-label="Filter kondisi" value={kondisi} className={gayaInput} onChange={gantiFilter(setKondisi)}>
              <option value="Semua">Kondisi</option>
              {SEMUA_KONDISI.map((k) => <option key={k} value={k}>{STATUS[k].label}</option>)}
            </select>
            <select aria-label="Filter kelengkapan data inventaris" value={kelengkapan} className={gayaInput} onChange={gantiFilter(setKelengkapan)}>
              <option value="Semua">Data inventaris</option>
              <option value="lengkap">Lengkap</option>
              <option value="belum">Belum lengkap</option>
            </select>
          </div>

          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full sm:min-w-[620px] text-sm border-collapse">
              <thead>
                <tr className="text-left text-slate-600 text-[13px] border-b border-line">
                  <th className="py-2.5 pr-3 font-bold">Fasilitas</th>
                  <th className="py-2.5 pr-3 font-bold">Lokasi</th>
                  <th className="py-2.5 pr-3 font-bold">Jumlah</th>
                  <th className="hidden sm:table-cell py-2.5 pr-3 font-bold">Kondisi</th>
                  <th className="hidden sm:table-cell py-2.5 font-bold">Terakhir Dicek</th>
                </tr>
              </thead>
              <tbody>
                {fasilitasHalamanIni.map((f) => {
                  const r = ruangById[f.ruangId]
                  const aktif = f.id === dipilih?.id
                  const Ikon = ikonFasilitas(f.nama)
                  return (
                    <tr
                      key={f.id}
                      onClick={() => pilihFasilitas(f.id)}
                      className={`border-b border-slate-100 cursor-pointer ${aktif ? 'bg-primary-soft' : 'hover:bg-slate-50'}`}
                    >
                      <td className="py-2.5 pr-3">
                        <button type="button" onClick={() => pilihFasilitas(f.id)} aria-current={aktif ? 'true' : undefined}
                          className="flex items-center gap-2.5 text-left">
                          <span className="size-9 shrink-0 rounded-lg bg-slate-100 text-slate-600 grid place-items-center">
                            <Ikon size={18} />
                          </span>
                          <span>
                            <span className="block font-bold">{f.nama}</span>
                            <span className="block text-xs font-mono text-muted">{f.kodeAset}</span>
                            {f.merek || f.tahunPengadaan ? (
                              <span className="block text-[11px] text-slate-600">
                                {[[f.merek, f.model].filter(Boolean).join(' '), f.tahunPengadaan && `th. ${f.tahunPengadaan}`].filter(Boolean).join(' · ')}
                              </span>
                            ) : (
                              <span className="block text-[11px] italic text-amber-700">Data inventaris belum diisi</span>
                            )}
                            <span className="sm:hidden block mt-1">
                              <StatusBadge status={f.kondisi} />
                            </span>
                          </span>
                        </button>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className="block font-semibold">{r.nama}</span>
                        <span className="block text-xs text-muted">{r.kampus}</span>
                      </td>
                      <td className="py-2.5 pr-3 whitespace-nowrap">
                        {f.jumlah} {f.satuan}
                        {f.lacakPerUnit && <span className="block text-[11px] font-semibold text-sky-700">Per unit</span>}
                      </td>
                      <td className="hidden sm:table-cell py-2.5 pr-3">
                        <StatusBadge status={f.kondisi} />
                        {f.kondisi !== 'baik' && f.jumlah > 1 && (
                          <span className="block text-[11px] text-muted mt-0.5">
                            {f.jumlahRusak || f.jumlah} dari {f.jumlah} {f.satuan}
                          </span>
                        )}
                      </td>
                      <td className="hidden sm:table-cell py-2.5 text-xs text-muted whitespace-nowrap">{f.terakhirDicek}</td>
                    </tr>
                  )
                })}
                {fasilitasTampil.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted">
                      Tidak ada fasilitas yang cocok dengan filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-2 text-[13px] text-muted">
            <span>
              Menampilkan {fasilitasTampil.length ? awal + 1 : 0}–{Math.min(awal + PER_HALAMAN, fasilitasTampil.length)} dari {fasilitasTampil.length} fasilitas
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

        {/* ===== Kanan: detail fasilitas ===== */}
        <div ref={areaDetail} className="scroll-mt-4 min-w-0">
        {dipilih ? (
          <PanelDetail key={dipilih.id} f={dipilih} r={ruangById[dipilih.ruangId]} setPesan={setPesan} tidakDipilih={() => setDipilihId(null)} />
        ) : (
          <section className="bg-white border border-line rounded-2xl p-8 text-center text-sm text-muted">Pilih fasilitas untuk melihat detailnya.</section>
        )}
        </div>
      </div>

      {formTerbuka && (
        <FormTambahFasilitas
          ruangAwal={ruangFilter !== 'Semua' ? ruangFilter : ''}
          tutup={() => setFormTerbuka(false)}
          simpan={async (data, namaRuang, fotoBaru) => {
            const hasil = await tambahFasilitas(data, fotoBaru)
            if (hasil.error) return hasil.error
            setPesan(`${data.jumlah} ${data.satuan} ${data.nama} ditambahkan ke ${namaRuang}.`)
            if (hasil.id) pilihFasilitas(hasil.id)
            setFormTerbuka(false)
            return null
          }}
        />
      )}
    </>
  )
}

// ===== Panel detail satu fasilitas =====
function PanelDetail({ f, r, setPesan, tidakDipilih }) {
  const { unit, hapusFasilitas, aktifkanPerUnit, tambahUnit } = useData()
  const [kondisiDiubah, setKondisiDiubah] = useState(null) // { unit } atau { kelompok: true }
  const { bisa } = useAuth()
  const [tab, setTab] = useState('detail')
  const [ubahTerbuka, setUbahTerbuka] = useState(false)
  const [unitDiubah, setUnitDiubah] = useState(null)
  const [sibuk, setSibuk] = useState(false)
  const [error, setError] = useState('')

  const Ikon = ikonFasilitas(f.nama)
  const milikUnit = unit.filter((u) => u.fasilitasId === f.id)
  const k = rincianKondisi(f, milikUnit)
  const unitBermasalahDiketahui = milikUnit.filter((u) => u.kondisi !== 'baik').length
  const bolehKelola = bisa('kelolaData')

  async function jalankan(aksi, pesanBerhasil) {
    setSibuk(true)
    setError('')
    const hasil = await aksi()
    setSibuk(false)
    if (hasil.error) return setError(hasil.error)
    if (pesanBerhasil) setPesan(pesanBerhasil)
  }

  async function hapus() {
    if (!window.confirm(`Hapus ${f.nama} (${f.kodeAset}) dari ${r.nama}? Riwayat inspeksinya tetap tersimpan.`)) return
    await jalankan(() => hapusFasilitas(f.id), `${f.nama} dihapus dari ${r.nama}.`)
    tidakDipilih()
  }

  const TAB = [
    ['detail', 'Detail', Info],
    ['inventaris', 'Inventaris', Tag],
    ['riwayat', 'Riwayat', History],
    ['laporan', 'Laporan', ClipboardList],
  ]

  return (
    <section aria-label={`Detail ${f.nama}`} className="bg-white border border-line rounded-2xl p-4 sm:p-5 flex flex-col gap-4 min-w-0">
      {/* Kepala */}
      <div className="flex items-start gap-3.5">
        <span className="size-13 shrink-0 rounded-xl bg-primary-soft text-primary grid place-items-center">
          <Ikon size={26} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xl font-extrabold leading-tight">{f.nama}</p>
          <p className="text-[13px] font-mono text-muted">{f.kodeAset}</p>
        </div>
        <StatusBadge status={f.kondisi} />
      </div>

      {/* Lokasi */}
      <nav aria-label="Lokasi fasilitas" className="flex flex-wrap items-center gap-1.5 text-[13px] text-slate-600 bg-slate-50 rounded-xl px-3.5 py-2.5">
        <MapPin size={15} className="text-primary" />
        <span>{r.kampus}</span>
        <ChevronRight size={14} className="text-muted" />
        <span>Gedung {r.gedung}</span>
        {r.lantai && (
          <>
            <ChevronRight size={14} className="text-muted" />
            <span>Lantai {r.lantai}</span>
          </>
        )}
        <ChevronRight size={14} className="text-muted" />
        <Link to={`/ruangan?cari=${encodeURIComponent(r.nama)}`} className="font-bold text-primary hover:underline">
          {r.nama}
        </Link>
      </nav>

      {/* Tab */}
      <div role="tablist" className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-slate-100">
        {TAB.map(([kode, label, IkonTab]) => (
          <button key={kode} type="button" role="tab" aria-selected={tab === kode} onClick={() => setTab(kode)}
            className={`min-h-10 rounded-lg text-[13px] font-semibold inline-flex items-center justify-center gap-1.5
              ${tab === kode ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:bg-white/60'}`}>
            <IkonTab size={15} className="hidden sm:block" />
            {label}
          </button>
        ))}
      </div>

      {error && <p role="alert" className="p-3 rounded-xl bg-bad-soft text-bad-ink text-sm font-semibold">{error}</p>}

      {tab === 'detail' && (
        <div className="flex flex-col gap-4">
          {/* Ringkasan kondisi */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              ['Baik', k.baik, 'bg-ok-soft text-ok-ink'],
              ['Bermasalah', k.perawatan, 'bg-warn-soft text-warn-ink'],
              ['Rusak', k.rusak, 'bg-bad-soft text-bad-ink'],
              ['Maintenance', k.maintenance, 'bg-sky-50 text-sky-700'],
            ].map(([label, n, warna]) => (
              <div key={label} className={`rounded-xl px-3 py-2.5 ${warna}`}>
                <p className="text-xs font-semibold">{label}</p>
                <p className="text-lg font-extrabold">
                  {n} <span className="text-xs font-semibold">{f.satuan}</span>
                </p>
              </div>
            ))}
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-xs text-muted">Kategori</dt>
              <dd className="font-semibold">{f.kategori}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Jumlah</dt>
              <dd className="font-semibold">
                {f.jumlah} {f.satuan} {f.lacakPerUnit ? '(dicatat per unit)' : '(dicatat per kelompok)'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Terakhir dicek</dt>
              <dd className="font-semibold inline-flex items-center gap-1">
                <Clock size={14} className="text-muted" /> {f.terakhirDicek}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Jenis ruangan</dt>
              <dd className="font-semibold">{r.jenis}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs text-muted">Catatan kondisi terakhir</dt>
              <dd className="font-semibold">{f.catatan || '-'}</dd>
            </div>
          </dl>

          {/* Unit */}
          {f.lacakPerUnit ? (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-extrabold">Daftar Unit ({milikUnit.length})</h3>
                {bolehKelola && (
                  <button type="button" disabled={sibuk} onClick={() => jalankan(() => tambahUnit(f.id), `Unit baru ditambahkan ke ${f.nama} ${r.nama}.`)}
                    className={`${tombolKedua} min-h-9 px-3 text-[13px]`}>
                    <Plus size={16} /> Tambah Unit
                  </button>
                )}
              </div>

              {f.kondisi !== 'baik' && unitBermasalahDiketahui < (f.jumlahRusak || f.jumlah) && (
                <p className="text-[13px] bg-warn-soft text-warn-ink rounded-xl px-3.5 py-2.5 flex gap-2">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <span>
                    Hasil inspeksi: {f.jumlahRusak || f.jumlah} dari {f.jumlah} unit {STATUS[f.kondisi].label.toLowerCase()}, tetapi belum diketahui unit yang mana.
                    {bolehKelola ? ' Cek di lapangan, lalu klik "Kondisi" pada unit yang bermasalah.' : ' Sarpras akan menentukan unitnya.'}
                  </span>
                </p>
              )}

              <ul className="flex flex-col gap-2">
                {milikUnit.map((u) => (
                  <li key={u.id} className="border border-line rounded-xl p-3 flex items-start gap-3">
                    <span className="size-9 shrink-0 rounded-lg bg-slate-100 grid place-items-center text-slate-600">
                      <QrCode size={17} />
                    </span>
                    <div className="flex-1 min-w-0 text-[13px]">
                      <p className="font-mono font-bold text-sm">{u.kodeAset}</p>
                      <p className={u.posisi ? 'text-slate-700' : 'text-muted italic'}>
                        <MapPin size={12} className="inline -mt-0.5 mr-1" />
                        {u.posisi || 'Posisi belum diisi'}
                      </p>
                      {(u.merek || u.model || u.spesifikasi) && (
                        <p className="text-slate-600">{[u.merek, u.model, u.spesifikasi].filter(Boolean).join(' · ')}</p>
                      )}
                      {u.kondisi !== 'baik' && u.catatan && <p className="text-slate-700">Catatan: {u.catatan}</p>}
                      {(u.nomorSeri || u.tahunPengadaan) && (
                        <p className="text-muted">
                          {[u.nomorSeri && `S/N ${u.nomorSeri}`, u.tahunPengadaan && `Pengadaan ${u.tahunPengadaan}`].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <StatusBadge status={u.kondisi} />
                      {bolehKelola && (
                        <div className="flex gap-3">
                          <button type="button" onClick={() => setKondisiDiubah({ unit: u })} aria-label={`Ubah kondisi ${u.kodeAset}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary min-h-8">
                            <Wrench size={13} /> Kondisi
                          </button>
                          <button type="button" onClick={() => setUnitDiubah(u)} aria-label={`Ubah ${u.kodeAset}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary min-h-8">
                            <Pencil size={13} /> Data
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="text-[13px] text-slate-600 bg-slate-50 rounded-xl px-3.5 py-3 flex flex-col gap-2">
              <p>
                Fasilitas ini dicatat <b>per kelompok</b> ({f.jumlah} {f.satuan}), cocok untuk barang massal seperti kursi dan lampu.
              </p>
              {bolehKelola && (
                <button type="button" disabled={sibuk} className="self-start inline-flex items-center gap-1.5 font-semibold text-primary min-h-9"
                  onClick={() => {
                    if (window.confirm(`Catat ${f.nama} di ${r.nama} per unit? Akan dibuat ${f.jumlah} unit dengan kode masing-masing.`)) {
                      jalankan(() => aktifkanPerUnit(f.id), `${f.nama} di ${r.nama} sekarang dicatat per unit.`)
                    }
                  }}>
                  Catat per unit <ArrowRight size={15} />
                </button>
              )}
            </div>
          )}

          {bolehKelola && (
            <div className="flex flex-wrap gap-2 pt-1 border-t border-line">
              {!f.lacakPerUnit && (
                <button type="button" onClick={() => setKondisiDiubah({ kelompok: true })} className={`${tombolUtama} mt-3`}>
                  <Wrench size={16} /> Ubah Kondisi
                </button>
              )}
              <button type="button" onClick={() => setUbahTerbuka(true)} className={`${tombolKedua} mt-3`}>
                <Pencil size={16} /> Ubah Data
              </button>
              <button type="button" onClick={hapus} disabled={sibuk}
                className="mt-3 inline-flex items-center justify-center gap-2 min-h-11 px-5 rounded-xl border border-red-200 text-red-700 text-sm font-semibold hover:bg-red-50">
                <Trash2 size={16} /> Hapus
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'inventaris' && <TabInventaris f={f} milikUnit={milikUnit} bolehKelola={bolehKelola} ubah={() => setUbahTerbuka(true)} ubahUnit={setUnitDiubah} />}

      {tab === 'riwayat' && <RiwayatKondisi f={f} />}

      {tab === 'laporan' && <LaporanFasilitas f={f} />}

      {ubahTerbuka && <FormUbahFasilitas f={f} tutup={() => setUbahTerbuka(false)} setPesan={setPesan} />}
      {unitDiubah && <FormUnit u={unitDiubah} f={f} tutup={() => setUnitDiubah(null)} setPesan={setPesan} />}
      {kondisiDiubah && <FormKondisi f={f} u={kondisiDiubah.unit} tutup={() => setKondisiDiubah(null)} setPesan={setPesan} />}
    </section>
  )
}

// ===== Tab Inventaris: identitas, perolehan, nilai, penanggung jawab, foto =====
function TabInventaris({ f, milikUnit, bolehKelola, ubah, ubahUnit }) {
  const kurang = dataKurang(f)
  const nilai = nilaiFasilitas(f, milikUnit)
  const Isi = ({ label, nilai: isi, lebar }) => (
    <div className={lebar ? 'col-span-2' : ''}>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`font-semibold ${isi ? '' : 'text-slate-400 font-normal italic'}`}>{isi || 'Belum diisi'}</dd>
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      {kurang.length ? (
        <p className="text-[13px] bg-warn-soft text-warn-ink rounded-xl px-3.5 py-2.5 flex gap-2">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>Data inventaris belum lengkap: {kurang.join(', ')}.</span>
        </p>
      ) : (
        <p className="text-[13px] bg-ok-soft text-ok-ink rounded-xl px-3.5 py-2.5 flex gap-2 font-semibold">
          <BadgeCheck size={16} className="shrink-0 mt-0.5" /> Data inventaris lengkap
        </p>
      )}

      {/* Foto barang */}
      {f.fotoUrl.length ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {f.fotoUrl.map((url, i) => (
            <a key={url} href={url} target="_blank" rel="noreferrer" className="shrink-0 size-24 rounded-xl overflow-hidden border border-line">
              <img src={url} alt={`Foto ${f.nama} ${i + 1}`} className="size-full object-cover" />
            </a>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-[13px] text-muted bg-slate-50 rounded-xl px-3.5 py-3">
          <ImageOff size={16} /> Belum ada foto barang.
        </div>
      )}

      <section className="flex flex-col gap-2">
        <h3 className="text-[13px] font-extrabold text-slate-700 uppercase tracking-wide">Identitas barang</h3>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <Isi label="Merek" nilai={f.merek} />
          <Isi label="Model / tipe" nilai={f.model} />
          <Isi label="Spesifikasi" nilai={f.spesifikasi} lebar />
          <Isi label="Kategori" nilai={f.kategori} />
          <Isi label="Jumlah" nilai={`${f.jumlah} ${f.satuan} · ${f.lacakPerUnit ? 'per unit' : 'per kelompok'}`} />
        </dl>
      </section>

      <section className="flex flex-col gap-2 pt-3 border-t border-line">
        <h3 className="text-[13px] font-extrabold text-slate-700 uppercase tracking-wide">Perolehan</h3>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <Isi label="Tahun perolehan" nilai={f.tahunPengadaan} />
          <Isi label="Asal perolehan" nilai={ASAL_PEROLEHAN[f.asalPerolehan]} />
          <Isi label="Sumber dana" nilai={f.sumberDana} lebar />
          {bolehKelola && (
            <>
              <Isi label={`Harga satuan${f.lacakPerUnit ? ' (bawaan unit)' : ''}`} nilai={f.hargaSatuan !== null ? rupiah(f.hargaSatuan) : ''} />
              <Isi label="Nilai total" nilai={nilai !== null ? rupiah(nilai) : ''} />
            </>
          )}
        </dl>
      </section>

      <section className="flex flex-col gap-2 pt-3 border-t border-line">
        <h3 className="text-[13px] font-extrabold text-slate-700 uppercase tracking-wide">Pengelolaan</h3>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <Isi label="Penanggung jawab" nilai={f.penanggungJawab} lebar />
          <Isi label="Keterangan" nilai={f.keterangan} lebar />
        </dl>
      </section>

      {f.lacakPerUnit && milikUnit.length > 0 && (
        <section className="flex flex-col gap-2 pt-3 border-t border-line">
          <h3 className="text-[13px] font-extrabold text-slate-700 uppercase tracking-wide">Rincian per unit</h3>
          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full min-w-[420px] text-[13px] border-collapse">
              <thead>
                <tr className="text-left text-slate-600 text-xs border-b border-line">
                  <th className="py-2 pr-2 font-bold">Kode</th>
                  <th className="py-2 pr-2 font-bold">Merek / tipe</th>
                  <th className="py-2 pr-2 font-bold">No. seri</th>
                  <th className="py-2 pr-2 font-bold">Tahun</th>
                  {bolehKelola && <th className="py-2 pr-2 font-bold">Harga</th>}
                  {bolehKelola && <th className="py-2 font-bold"><span className="sr-only">Aksi</span></th>}
                </tr>
              </thead>
              <tbody>
                {milikUnit.map((asli) => {
                  const u = unitLengkap(asli, f)
                  return (
                    <tr key={u.id} className="border-b border-slate-100 align-top">
                      <td className="py-2 pr-2 font-mono font-semibold whitespace-nowrap">
                        {u.kodeAset}
                        {asli.fotoUrl.length > 0 && <span className="block text-[11px] font-sans text-muted">{asli.fotoUrl.length} foto</span>}
                      </td>
                      <td className="py-2 pr-2">{[u.merek, u.model].filter(Boolean).join(' ') || '-'}</td>
                      <td className="py-2 pr-2">{u.nomorSeri || '-'}</td>
                      <td className="py-2 pr-2">{u.tahunPengadaan || '-'}</td>
                      {bolehKelola && <td className="py-2 pr-2 whitespace-nowrap">{rupiah(u.harga)}</td>}
                      {bolehKelola && (
                        <td className="py-2 text-right">
                          <button type="button" onClick={() => ubahUnit(asli)} aria-label={`Ubah data ${u.kodeAset}`} title="Ubah data unit"
                            className="size-8 inline-grid place-items-center rounded-lg text-primary hover:bg-primary-soft">
                            <Pencil size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted">Kolom unit yang kosong mengikuti data kelompoknya.</p>
        </section>
      )}

      {bolehKelola && (
        <div className="pt-1 border-t border-line">
          <button type="button" onClick={ubah} className={`${tombolUtama} mt-3`}>
            <Pencil size={16} /> Ubah Data Inventaris
          </button>
        </div>
      )}
    </div>
  )
}

// ===== Riwayat kondisi (dari inspeksi) =====
function RiwayatKondisi({ f }) {
  const { ambilRiwayatFasilitas } = useData()
  const [riwayat, setRiwayat] = useState(null)

  useEffect(() => {
    let masihTerpasang = true
    ambilRiwayatFasilitas(f.id).then((hasil) => {
      if (masihTerpasang) setRiwayat(hasil.data)
    })
    return () => {
      masihTerpasang = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.id])

  if (riwayat === null) return <p className="text-sm text-muted">Memuat riwayat…</p>
  if (riwayat.length === 0) return <p className="text-sm text-muted py-6 text-center">Fasilitas ini belum pernah diinspeksi.</p>

  return (
    <ol className="flex flex-col">
      {riwayat.map((d) => {
        const berubah = d.sebelum !== d.kondisi
        return (
          <li key={d.id} className="flex gap-3 py-3 border-b border-slate-100 last:border-0">
            <span className={`mt-1 size-2.5 shrink-0 rounded-full ${STATUS[d.kondisi]?.dot ?? 'bg-slate-400'}`} />
            <div className="flex-1 min-w-0 text-[13px]">
              <p className="font-bold text-sm">{d.waktu}</p>
              <p className="text-muted inline-flex items-center gap-1">
                {d.sumber === 'sarpras' ? <UserCog size={13} /> : <ScanSearch size={13} />}
                {d.sumber === 'sarpras' ? 'Diubah Sarpras' : 'Rapid Inspection'} · {d.oleh}
                {d.kodeUnit && <span className="font-mono ml-1">({d.kodeUnit})</span>}
              </p>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                {berubah ? (
                  <>
                    <StatusBadge status={d.sebelum} />
                    <ArrowRight size={14} className="text-muted" />
                  </>
                ) : null}
                <StatusBadge status={d.kondisi} />
                {d.kondisi !== 'baik' && !d.kodeUnit && <span className="text-slate-600">{d.jumlah} dari {f.jumlah} {f.satuan}</span>}
                {!berubah && <span className="text-muted">(tidak berubah)</span>}
              </div>
              {d.catatan && <p className="text-slate-700 mt-1">Catatan: {d.catatan}</p>}
              {d.foto.length > 0 && (
                <div className="flex gap-1.5 mt-1.5">
                  {d.foto.map((url, n) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer" aria-label={`Buka foto ${n + 1}`}>
                      <img src={url} alt="" className="size-10 rounded-md object-cover border border-line" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

// ===== Form: tambah fasilitas =====
function FormTambahFasilitas({ ruangAwal, tutup, simpan }) {
  const { ruang, fasilitas } = useData()
  const ruangPertama = ruang.find((r) => r.id === ruangAwal)
  const [kampus, setKampus] = useState(ruangPertama?.kampus ?? 'Kampus A')
  const [gedung, setGedung] = useState(ruangPertama?.gedung ?? '')
  const [form, setForm] = useState({ ...FORM_KOSONG, ruangId: ruangAwal })
  const [inventarisTerbuka, setInventarisTerbuka] = useState(false)
  const [fotoBaru, setFotoBaru] = useState([])
  const [error, setError] = useState('')
  const [menyimpan, setMenyimpan] = useState(false)

  const ubah = (kolom) => (e) => setForm({ ...form, [kolom]: e.target.value })
  const ruangTujuan = ruang.find((r) => r.id === form.ruangId)
  const daftarGedung = gedungDiKampus(ruang, kampus)
  const daftarRuang = ruang.filter((r) => r.kampus === kampus && r.gedung === gedung)

  // Kode aset otomatis
  const singkat = form.nama.trim() ? singkatan(form.nama) : 'XXX'
  const dasar = `${buatId(ruangTujuan?.nama ?? 'RUANG').toUpperCase()}-${singkat}`
  const urutan = String(fasilitas.filter((f) => f.ruangId === form.ruangId && f.kodeAset.startsWith(dasar)).length + 1).padStart(2, '0')
  const kodeAset = form.lacakPerUnit ? dasar : `${dasar}-${urutan}`
  const contohUnit = form.lacakPerUnit
    ? Array.from({ length: Math.min(Number(form.jumlah) || 0, 3) }, (_, i) => `${dasar}-${String(i + 1).padStart(2, '0')}`).join(', ') +
      (Number(form.jumlah) > 3 ? ', …' : '')
    : ''

  function ubahNama(e) {
    const nama = e.target.value
    // Saran otomatis: barang bernilai tinggi dicatat per unit
    setForm({ ...form, nama, lacakPerUnit: SARAN_PER_UNIT.test(nama) })
  }

  async function kirim() {
    if (!form.ruangId) return setError('Pilih ruangan tujuan.')
    if (!form.nama.trim() || !(Number(form.jumlah) > 0)) return setError('Nama fasilitas dan jumlah wajib diisi.')
    if (form.lacakPerUnit && Number(form.jumlah) > 50) return setError('Untuk dicatat per unit, jumlah maksimal 50. Barang massal sebaiknya dicatat per kelompok.')
    const galatTahun = cekTahun(form.tahunPengadaan)
    if (galatTahun) return setError(galatTahun)
    setError('')
    setMenyimpan(true)
    const galat = await simpan(
      { ...form, nama: form.nama.trim(), jumlah: Number(form.jumlah), kodeAset },
      ruangTujuan.nama,
      fotoBaru.map((x) => x.file),
    )
    setMenyimpan(false)
    if (galat) setError(galat)
  }

  return (
    <Modal
      judul="Tambah Fasilitas"
      keterangan="Pilih ruangan tujuan, lalu isi data fasilitasnya"
      tutup={tutup}
      footer={
        <>
          <button type="button" onClick={tutup} className={tombolKedua}>Batal</button>
          <button type="button" onClick={kirim} disabled={menyimpan} className={`${tombolUtama} disabled:opacity-60`}>
            {menyimpan ? 'Menyimpan…' : 'Simpan Fasilitas'}
          </button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 grid grid-cols-3 gap-2.5">
          <label className={gayaLabel}>
            Kampus
            <select className={gayaInput} value={kampus} onChange={(e) => { setKampus(e.target.value); setGedung(''); setForm({ ...form, ruangId: '' }) }}>
              {DAFTAR_KAMPUS.map((k) => <option key={k}>{k}</option>)}
            </select>
          </label>
          <label className={gayaLabel}>
            Gedung
            <select className={gayaInput} value={gedung} onChange={(e) => { setGedung(e.target.value); setForm({ ...form, ruangId: '' }) }}>
              <option value="">Pilih…</option>
              {daftarGedung.map((g) => <option key={g}>{g}</option>)}
            </select>
          </label>
          <label className={gayaLabel}>
            Ruangan *
            <select className={gayaInput} value={form.ruangId} onChange={ubah('ruangId')} disabled={!gedung}>
              <option value="">Pilih…</option>
              {daftarRuang.map((r) => <option key={r.id} value={r.id}>{r.nama}</option>)}
            </select>
          </label>
        </div>

        <label className={`${gayaLabel} sm:col-span-2`}>
          Nama fasilitas *
          <input className={gayaInput} value={form.nama} onChange={ubahNama} placeholder="Contoh: AC, Proyektor, Kursi Mahasiswa" />
        </label>
        <label className={gayaLabel}>
          Kategori
          <select className={gayaInput} value={form.kategori} onChange={ubah('kategori')}>
            {KATEGORI.map((k) => <option key={k}>{k}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2.5">
          <label className={gayaLabel}>
            Jumlah *
            <input type="number" min="1" className={gayaInput} value={form.jumlah} onChange={ubah('jumlah')} />
          </label>
          <label className={gayaLabel}>
            Satuan
            <select className={gayaInput} value={form.satuan} onChange={ubah('satuan')}>
              {SATUAN.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
        </div>

        <label className="sm:col-span-2 flex items-start gap-3 p-3.5 rounded-xl border border-line cursor-pointer">
          <input type="checkbox" className="mt-0.5 size-5 accent-[var(--color-primary)]" checked={form.lacakPerUnit}
            onChange={(e) => setForm({ ...form, lacakPerUnit: e.target.checked })} />
          <span className="text-[13px]">
            <b>Catat per unit</b>
            <span className="block text-muted">
              Untuk barang bernilai tinggi (AC, proyektor, komputer). Setiap unit mendapat kode sendiri dan bisa diisi posisi, merek, dan spesifikasinya.
              Barang massal (kursi, lampu) cukup dicatat per kelompok.
            </span>
          </span>
        </label>

        <fieldset className="sm:col-span-2">
          <legend className="text-[13px] font-semibold mb-2">Kondisi awal</legend>
          <div className="grid grid-cols-3 gap-2">
            {['baik', 'perawatan', 'rusak'].map((k) => {
              const aktif = form.kondisi === k
              const warna = { baik: 'border-ok bg-ok-soft text-ok-ink', perawatan: 'border-warn bg-warn-soft text-warn-ink', rusak: 'border-bad bg-bad-soft text-bad-ink' }[k]
              return (
                <button key={k} type="button" aria-pressed={aktif} onClick={() => setForm({ ...form, kondisi: k })}
                  className={`min-h-11 rounded-xl text-sm font-semibold ${aktif ? `border-2 ${warna}` : 'border border-slate-300 text-slate-600'}`}>
                  {STATUS[k].label}
                </button>
              )
            })}
          </div>
        </fieldset>

        <button type="button" aria-expanded={inventarisTerbuka} onClick={() => setInventarisTerbuka(!inventarisTerbuka)}
          className="sm:col-span-2 flex items-center justify-between gap-3 p-3.5 rounded-xl border border-line text-left hover:bg-slate-50">
          <span className="text-[13px]">
            <b className="inline-flex items-center gap-1.5"><Tag size={15} className="text-primary" /> Data inventaris (opsional)</b>
            <span className="block text-muted">Merek, tahun & asal perolehan, harga, sumber dana, penanggung jawab, dan foto. Bisa diisi nanti.</span>
          </span>
          <ChevronRight size={18} className={`shrink-0 transition-transform ${inventarisTerbuka ? 'rotate-90' : ''}`} />
        </button>
        {inventarisTerbuka && (
          <>
            <BagianInventaris form={form} setForm={setForm} perUnit={form.lacakPerUnit} />
            <JudulBagian>Foto barang</JudulBagian>
            <div className="sm:col-span-2">
              <FotoBarang baru={fotoBaru} setBaru={setFotoBaru} />
            </div>
          </>
        )}

        <div className="sm:col-span-2 flex items-center gap-3.5 p-3.5 rounded-xl bg-slate-50 border border-line">
          <span className="size-14 shrink-0 rounded-lg bg-white border border-line grid place-items-center">
            <QrCode size={32} />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold">Kode aset dibuat otomatis</p>
            <p className="text-[13px] font-mono text-slate-700">{kodeAset}</p>
            {form.lacakPerUnit && <p className="text-xs text-muted">Kode unit: {contohUnit}</p>}
          </div>
        </div>

        {error && <p role="alert" className="sm:col-span-2 text-sm font-semibold text-red-700">{error}</p>}
      </div>
    </Modal>
  )
}

// ===== Form: ubah data fasilitas (kelompok) + data inventaris =====
function FormUbahFasilitas({ f, tutup, setPesan }) {
  const { ubahFasilitas } = useData()
  const [form, setForm] = useState({
    nama: f.nama, kategori: f.kategori, jumlah: String(f.jumlah), satuan: f.satuan,
    merek: f.merek, model: f.model, spesifikasi: f.spesifikasi, tahunPengadaan: f.tahunPengadaan ? String(f.tahunPengadaan) : '',
    asalPerolehan: f.asalPerolehan, hargaSatuan: hargaKeForm(f.hargaSatuan), sumberDana: f.sumberDana,
    penanggungJawab: f.penanggungJawab, keterangan: f.keterangan,
  })
  const [fotoLama, setFotoLama] = useState(f.foto.map((path, i) => ({ path, url: f.fotoUrl[i] })))
  const [fotoBaru, setFotoBaru] = useState([])
  const [error, setError] = useState('')
  const [menyimpan, setMenyimpan] = useState(false)
  const ubah = (kolom) => (e) => setForm({ ...form, [kolom]: e.target.value })

  async function kirim() {
    if (!form.nama.trim() || !(Number(form.jumlah) > 0)) return setError('Nama fasilitas dan jumlah wajib diisi.')
    const galatTahun = cekTahun(form.tahunPengadaan)
    if (galatTahun) return setError(galatTahun)
    setMenyimpan(true)
    const hasil = await ubahFasilitas(
      f.id,
      { ...form, nama: form.nama.trim(), jumlah: f.lacakPerUnit ? null : form.jumlah, foto: fotoLama.map((x) => x.path) },
      fotoBaru.map((x) => x.file),
    )
    setMenyimpan(false)
    if (hasil.error) return setError(hasil.error)
    fotoBaru.forEach((x) => URL.revokeObjectURL(x.url))
    setPesan(`Data ${form.nama.trim()} berhasil diperbarui.`)
    tutup()
  }

  return (
    <Modal
      judul="Ubah Data Fasilitas"
      keterangan={f.kodeAset}
      tutup={tutup}
      footer={
        <>
          <button type="button" onClick={tutup} className={tombolKedua}>Batal</button>
          <button type="button" onClick={kirim} disabled={menyimpan} className={`${tombolUtama} disabled:opacity-60`}>
            {menyimpan ? 'Menyimpan…' : 'Simpan'}
          </button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <JudulBagian>Data barang</JudulBagian>
        <label className={`${gayaLabel} sm:col-span-2`}>
          Nama fasilitas *
          <input className={gayaInput} value={form.nama} onChange={ubah('nama')} />
        </label>
        <label className={gayaLabel}>
          Kategori
          <select className={gayaInput} value={form.kategori} onChange={ubah('kategori')}>
            {KATEGORI.map((k) => <option key={k}>{k}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2.5">
          <label className={gayaLabel}>
            Jumlah
            <input type="number" min="1" className={`${gayaInput} disabled:bg-slate-50`} value={form.jumlah} onChange={ubah('jumlah')} disabled={f.lacakPerUnit} />
          </label>
          <label className={gayaLabel}>
            Satuan
            <select className={gayaInput} value={form.satuan} onChange={ubah('satuan')}>
              {SATUAN.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
        </div>
        {f.lacakPerUnit && (
          <p className="sm:col-span-2 text-xs text-muted">Jumlah mengikuti banyaknya unit. Tambah atau hapus unit di panel detail.</p>
        )}

        <BagianInventaris form={form} setForm={setForm} perUnit={f.lacakPerUnit} />

        <JudulBagian>Foto barang</JudulBagian>
        <div className="sm:col-span-2">
          <FotoBarang lama={fotoLama} setLama={setFotoLama} baru={fotoBaru} setBaru={setFotoBaru} />
        </div>

        <p className="sm:col-span-2 text-xs text-muted">Kondisi diubah lewat tombol &quot;Ubah Kondisi&quot;, supaya setiap perubahan tercatat di riwayat.</p>
        {error && <p role="alert" className="sm:col-span-2 text-sm font-semibold text-red-700">{error}</p>}
      </div>
    </Modal>
  )
}

// ===== Bagian form yang dipakai ulang =====
function JudulBagian({ children }) {
  return <p className="sm:col-span-2 -mb-1 pt-2 text-xs font-extrabold uppercase tracking-wide text-primary border-t border-line first:border-t-0 first:pt-0">{children}</p>
}

function cekTahun(teks) {
  const tahun = Number(teks)
  if (teks && (tahun < 1980 || tahun > new Date().getFullYear() + 1)) return 'Tahun perolehan tidak valid.'
  return ''
}

// Input rupiah: hanya angka, ditampilkan dengan titik ribuan
function IsianHarga({ label, nilai, ubah, placeholder }) {
  return (
    <label className={gayaLabel}>
      {label}
      <span className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">Rp</span>
        <input type="text" inputMode="numeric" className={`${gayaInput} pl-10`} placeholder={placeholder}
          value={nilai ? Number(nilai).toLocaleString('id-ID') : ''}
          onChange={(e) => ubah(e.target.value.replace(/\D/g, '').slice(0, 13))} />
      </span>
    </label>
  )
}

function IsianTahun({ nilai, ubah, label = 'Tahun perolehan', placeholder = 'Contoh: 2022' }) {
  return (
    <label className={gayaLabel}>
      {label}
      <input type="text" inputMode="numeric" maxLength={4} className={gayaInput} value={nilai} placeholder={placeholder}
        onChange={(e) => ubah(e.target.value.replace(/\D/g, ''))} />
    </label>
  )
}

function PilihAsal({ nilai, ubah, kosong = 'Pilih…' }) {
  return (
    <label className={gayaLabel}>
      Asal perolehan
      <select className={gayaInput} value={nilai} onChange={(e) => ubah(e.target.value)}>
        <option value="">{kosong}</option>
        {Object.entries(ASAL_PEROLEHAN).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>
    </label>
  )
}

// Isian inventaris untuk kelompok fasilitas (form tambah & ubah)
function BagianInventaris({ form, setForm, perUnit }) {
  const ubah = (kolom) => (e) => setForm({ ...form, [kolom]: e.target.value })
  const isi = (kolom) => (nilai) => setForm({ ...form, [kolom]: nilai })
  return (
    <>
      <JudulBagian>Identitas barang</JudulBagian>
      <label className={gayaLabel}>
        Merek
        <input className={gayaInput} value={form.merek} onChange={ubah('merek')} placeholder="Contoh: Daikin, Epson, Chitose" />
      </label>
      <label className={gayaLabel}>
        Model / tipe
        <input className={gayaInput} value={form.model} onChange={ubah('model')} placeholder="Contoh: FTKC25, EB-X500" />
      </label>
      <label className={`${gayaLabel} sm:col-span-2`}>
        Spesifikasi
        <input className={gayaInput} value={form.spesifikasi} onChange={ubah('spesifikasi')} placeholder="Contoh: 1 PK; 3.600 lumen; kursi lipat besi + busa" />
      </label>

      <JudulBagian>Perolehan</JudulBagian>
      <IsianTahun nilai={form.tahunPengadaan} ubah={isi('tahunPengadaan')} />
      <PilihAsal nilai={form.asalPerolehan} ubah={isi('asalPerolehan')} />
      <label className={gayaLabel}>
        Sumber dana
        <input className={gayaInput} list="saran-sumber-dana" value={form.sumberDana} onChange={ubah('sumberDana')} placeholder="Pilih atau ketik…" />
      </label>
      <IsianHarga label={perUnit ? 'Harga per unit' : 'Harga satuan'} nilai={form.hargaSatuan} ubah={isi('hargaSatuan')} placeholder="0" />
      {perUnit && <p className="sm:col-span-2 -mt-2 text-xs text-muted">Data perolehan di sini menjadi bawaan semua unit. Unit yang berbeda bisa diubah lewat tombol &quot;Data&quot; pada unit.</p>}

      <JudulBagian>Pengelolaan</JudulBagian>
      <label className={`${gayaLabel} sm:col-span-2`}>
        Penanggung jawab
        <input className={gayaInput} list="saran-penanggung-jawab" value={form.penanggungJawab} onChange={ubah('penanggungJawab')} placeholder="Unit kerja atau nama petugas" />
      </label>
      <label className={`${gayaLabel} sm:col-span-2`}>
        Keterangan
        <textarea rows={2} className={`${gayaInput} py-2.5`} value={form.keterangan} onChange={ubah('keterangan')} placeholder="Contoh: garansi sampai 2026, nomor BAST, catatan lain" />
      </label>

      <datalist id="saran-sumber-dana">{SARAN_SUMBER_DANA.map((x) => <option key={x} value={x} />)}</datalist>
      <datalist id="saran-penanggung-jawab">{SARAN_PENANGGUNG_JAWAB.map((x) => <option key={x} value={x} />)}</datalist>
    </>
  )
}

// Foto barang: foto lama (sudah tersimpan) + foto baru yang dipilih
function FotoBarang({ lama = [], setLama, baru, setBaru }) {
  const input = useRef(null)
  const jumlah = lama.length + baru.length
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {lama.map((x, i) => (
          <div key={x.path} className="relative size-20 rounded-lg overflow-hidden border border-line">
            <img src={x.url} alt={`Foto tersimpan ${i + 1}`} className="size-full object-cover" />
            <button type="button" aria-label={`Hapus foto tersimpan ${i + 1}`} onClick={() => setLama(lama.filter((_, j) => j !== i))}
              className="absolute top-0.5 right-0.5 size-7 grid place-items-center rounded-full bg-slate-900/70 text-white"><X size={14} /></button>
          </div>
        ))}
        {baru.map((x, i) => (
          <div key={x.url} className="relative size-20 rounded-lg overflow-hidden border-2 border-primary/40">
            <img src={x.url} alt={`Foto baru ${i + 1}`} className="size-full object-cover" />
            <button type="button" aria-label={`Batalkan foto baru ${i + 1}`} onClick={() => { URL.revokeObjectURL(x.url); setBaru(baru.filter((_, j) => j !== i)) }}
              className="absolute top-0.5 right-0.5 size-7 grid place-items-center rounded-full bg-slate-900/70 text-white"><X size={14} /></button>
          </div>
        ))}
        {jumlah < MAKS_FOTO && (
          <button type="button" onClick={() => input.current?.click()} aria-label="Tambah foto barang"
            className="size-20 rounded-lg border-2 border-dashed border-slate-300 text-muted hover:border-primary hover:text-primary grid place-items-center">
            <ImagePlus size={22} />
          </button>
        )}
      </div>
      <p className="text-xs text-muted">Maksimal {MAKS_FOTO} foto. Foto diperkecil otomatis sebelum diunggah.</p>
      <input ref={input} type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => {
          const dipilih = [...e.target.files].filter((x) => x.type.startsWith('image/'))
          setBaru([...baru, ...dipilih.slice(0, MAKS_FOTO - jumlah).map((file) => ({ file, url: URL.createObjectURL(file) }))])
          e.target.value = ''
        }} />
    </div>
  )
}

// ===== Form: ubah data satu unit =====
function FormUnit({ u, f, tutup, setPesan }) {
  const { ubahUnit, hapusUnit } = useData()
  const { bisa } = useAuth()
  const [form, setForm] = useState({
    ...UNIT_KOSONG, ...u, tahunPengadaan: u.tahunPengadaan ? String(u.tahunPengadaan) : '', hargaPerolehan: hargaKeForm(u.hargaPerolehan),
  })
  const [fotoLama, setFotoLama] = useState(u.foto.map((path, i) => ({ path, url: u.fotoUrl[i] })))
  const [fotoBaru, setFotoBaru] = useState([])
  const [error, setError] = useState('')
  const [menyimpan, setMenyimpan] = useState(false)
  const ubah = (kolom) => (e) => setForm({ ...form, [kolom]: e.target.value })
  const isi = (kolom) => (nilai) => setForm({ ...form, [kolom]: nilai })
  const ikut = (nilai) => (nilai ? `Ikut kelompok: ${nilai}` : '')

  async function kirim() {
    const galatTahun = cekTahun(form.tahunPengadaan)
    if (galatTahun) return setError(galatTahun)
    setMenyimpan(true)
    const hasil = await ubahUnit(u.id, { ...form, foto: fotoLama.map((x) => x.path) }, fotoBaru.map((x) => x.file))
    setMenyimpan(false)
    if (hasil.error) return setError(hasil.error)
    setPesan(`Data unit ${u.kodeAset} berhasil disimpan.`)
    tutup()
  }

  async function hapus() {
    if (f.jumlah <= 1) return setError('Unit terakhir tidak bisa dihapus. Hapus fasilitasnya dari panel detail.')
    if (!window.confirm(`Hapus unit ${u.kodeAset}? Jumlah ${f.nama} di ruangan ini berkurang menjadi ${f.jumlah - 1}.`)) return
    setMenyimpan(true)
    const hasil = await hapusUnit(u.id)
    setMenyimpan(false)
    if (hasil.error) return setError(hasil.error)
    setPesan(`Unit ${u.kodeAset} dihapus.`)
    tutup()
  }

  return (
    <Modal
      judul={`Ubah Unit ${u.kodeAset}`}
      keterangan={`${f.nama} · unit ke-${u.urutan}`}
      tutup={tutup}
      footer={
        <>
          <button type="button" onClick={hapus} disabled={menyimpan} className="mr-auto inline-flex items-center gap-1.5 min-h-11 px-3 text-sm font-semibold text-red-700">
            <Trash2 size={16} /> Hapus unit
          </button>
          <button type="button" onClick={tutup} className={tombolKedua}>Batal</button>
          <button type="button" onClick={kirim} disabled={menyimpan} className={`${tombolUtama} disabled:opacity-60`}>Simpan</button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <JudulBagian>Lokasi</JudulBagian>
        <label className={`${gayaLabel} sm:col-span-2`}>
          Posisi di ruangan
          <input className={gayaInput} value={form.posisi} onChange={ubah('posisi')} placeholder="Contoh: dinding samping kiri, plafon tengah, dinding belakang" />
        </label>
        <JudulBagian>Identitas unit</JudulBagian>
        <label className={gayaLabel}>
          Merek
          <input className={gayaInput} value={form.merek} onChange={ubah('merek')} placeholder={ikut(f.merek) || 'Contoh: Daikin'} />
        </label>
        <label className={gayaLabel}>
          Model / tipe
          <input className={gayaInput} value={form.model} onChange={ubah('model')} placeholder={ikut(f.model) || 'Contoh: FTKC25'} />
        </label>
        <label className={`${gayaLabel} sm:col-span-2`}>
          Spesifikasi
          <input className={gayaInput} value={form.spesifikasi} onChange={ubah('spesifikasi')} placeholder={ikut(f.spesifikasi) || 'Contoh: 1 PK, 3.500 lumen'} />
        </label>
        <label className={gayaLabel}>
          Nomor seri
          <input className={gayaInput} value={form.nomorSeri} onChange={ubah('nomorSeri')} />
        </label>

        <JudulBagian>Perolehan</JudulBagian>
        <IsianTahun nilai={form.tahunPengadaan} ubah={isi('tahunPengadaan')} placeholder={ikut(f.tahunPengadaan) || 'Contoh: 2022'} />
        <PilihAsal nilai={form.asalPerolehan} ubah={isi('asalPerolehan')} kosong={f.asalPerolehan ? `Ikut kelompok (${ASAL_PEROLEHAN[f.asalPerolehan]})` : 'Pilih…'} />
        <label className={gayaLabel}>
          Sumber dana
          <input className={gayaInput} list="saran-sumber-dana-unit" value={form.sumberDana} onChange={ubah('sumberDana')} placeholder={ikut(f.sumberDana) || 'Pilih atau ketik…'} />
          <datalist id="saran-sumber-dana-unit">{SARAN_SUMBER_DANA.map((x) => <option key={x} value={x} />)}</datalist>
        </label>
        {bisa('kelolaData') && (
          <IsianHarga label="Harga perolehan" nilai={form.hargaPerolehan} ubah={isi('hargaPerolehan')}
            placeholder={f.hargaSatuan !== null ? `${Number(f.hargaSatuan).toLocaleString('id-ID')} (ikut kelompok)` : '0'} />
        )}
        <p className="sm:col-span-2 -mt-2 text-xs text-muted">Kosongkan bila sama dengan data kelompok {f.nama}.</p>

        <JudulBagian>Foto unit</JudulBagian>
        <div className="sm:col-span-2">
          <FotoBarang lama={fotoLama} setLama={setFotoLama} baru={fotoBaru} setBaru={setFotoBaru} />
        </div>
        <p className="sm:col-span-2 text-xs text-muted">
          Kondisi unit ({STATUS[u.kondisi].label}) diubah lewat tombol &quot;Kondisi&quot; pada unit, supaya tercatat di riwayat.
        </p>
        {error && <p role="alert" className="sm:col-span-2 text-sm font-semibold text-red-700">{error}</p>}
      </div>
    </Modal>
  )
}

// ===== Form: ubah kondisi (khusus Sarpras), termasuk Maintenance =====
//   u ada    -> ubah kondisi satu unit
//   u kosong -> ubah kondisi kelompok (dengan jumlah unit)
function FormKondisi({ f, u, tutup, setPesan }) {
  const { ubahKondisiFasilitas, ubahKondisiUnit } = useData()
  const awal = u ? u.kondisi : f.kondisi
  const [kondisi, setKondisi] = useState(awal)
  const [jumlah, setJumlah] = useState(!u && f.kondisi !== 'baik' ? String(f.jumlahRusak || f.jumlah) : '')
  const [catatan, setCatatan] = useState((u ? u.catatan : f.catatan) ?? '')
  const [error, setError] = useState('')
  const [menyimpan, setMenyimpan] = useState(false)
  const pakaiJumlah = !u && kondisi !== 'baik'

  function pilih(k) {
    setKondisi(k)
    setError('')
    if (k === 'baik') return setJumlah('')
    if (!jumlah) setJumlah(f.jumlah === 1 ? '1' : '')
  }

  function ubahJumlah(teks) {
    const angka = parseInt(teks.replace(/\D/g, ''), 10)
    setJumlah(angka ? String(Math.min(angka, f.jumlah)) : '')
  }

  async function kirim() {
    if (pakaiJumlah && !Number(jumlah)) return setError(`Isi jumlah unit (1 sampai ${f.jumlah}).`)
    if (kondisi === 'maintenance' && !catatan.trim()) return setError('Tulis catatan maintenance, misalnya "ganti kompresor, teknisi vendor".')
    setMenyimpan(true)
    const hasil = u ? await ubahKondisiUnit(u.id, kondisi, catatan) : await ubahKondisiFasilitas(f.id, kondisi, jumlah, catatan)
    setMenyimpan(false)
    if (hasil.error) return setError(hasil.error)
    setPesan(`Kondisi ${u ? u.kodeAset : `${f.nama} (${f.kodeAset})`} diubah menjadi ${STATUS[kondisi].label}.`)
    tutup()
  }

  return (
    <Modal
      judul="Ubah Kondisi"
      keterangan={u ? `${f.nama} · ${u.kodeAset}` : `${f.nama} · ${f.kodeAset} (${f.jumlah} ${f.satuan})`}
      tutup={tutup}
      footer={
        <>
          <button type="button" onClick={tutup} className={tombolKedua}>Batal</button>
          <button type="button" onClick={kirim} disabled={menyimpan} className={`${tombolUtama} disabled:opacity-60`}>
            {menyimpan ? 'Menyimpan…' : 'Simpan Kondisi'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-[13px] text-slate-600 inline-flex items-center gap-1.5">
          Kondisi sekarang: <StatusBadge status={awal} />
        </p>

        <fieldset>
          <legend className="text-[13px] font-semibold mb-2">Kondisi baru</legend>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SEMUA_KONDISI.map((k) => {
              const { ikon: Ikon, aktif } = GAYA_KONDISI[k]
              const dipilih = kondisi === k
              return (
                <button key={k} type="button" aria-pressed={dipilih} onClick={() => pilih(k)}
                  className={`min-h-12 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-1.5
                    ${dipilih ? `border-2 ${aktif}` : 'border border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
                  <Ikon size={17} /> {STATUS[k].label}
                </button>
              )
            })}
          </div>
          {kondisi === 'maintenance' && (
            <p className="text-xs text-sky-700 mt-2">
              Maintenance = sedang ditangani/diperbaiki Sarpras. Selama maintenance, fasilitas ini dikunci di Rapid Inspection dan ruangannya tercatat Bermasalah.
            </p>
          )}
        </fieldset>

        {pakaiJumlah && (
          <label className={`${gayaLabel} max-w-48`}>
            Jumlah unit {STATUS[kondisi].label.toLowerCase()} (1–{f.jumlah})
            <input type="text" inputMode="numeric" className={gayaInput} value={jumlah} onChange={(e) => ubahJumlah(e.target.value)} placeholder={`1–${f.jumlah}`} />
          </label>
        )}

        <label className={gayaLabel}>
          Catatan {kondisi === 'maintenance' ? '*' : '(opsional)'}
          <textarea rows={2} className={`${gayaInput} py-2.5`} value={catatan} onChange={(e) => { setCatatan(e.target.value); setError('') }}
            placeholder={kondisi === 'maintenance' ? 'Contoh: ganti kompresor, dikerjakan teknisi vendor' : 'Contoh: sudah diperbaiki, lampu diganti'} />
        </label>

        {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
      </div>
    </Modal>
  )
}

// ===== Tab Laporan: semua laporan untuk fasilitas ini =====
function LaporanFasilitas({ f }) {
  const { laporan } = useData()
  const { bisa } = useAuth()
  const milik = laporan.filter((l) => l.fasilitasId === f.id)

  if (milik.length === 0) {
    return (
      <div className="text-center py-8 flex flex-col items-center gap-2 text-sm text-muted">
        <ClipboardList size={34} />
        <p>Belum ada laporan untuk fasilitas ini.</p>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {milik.map((l) => {
        const isi = (
          <>
            <span className="flex items-start justify-between gap-2">
              <span className="text-sm font-bold">Laporan #{l.id}</span>
              <PilStatus status={l.status} />
            </span>
            <span className="text-xs text-muted">
              {l.dibuat} · {l.pelapor} · {l.sumber === 'inspeksi' ? 'Rapid Inspection' : 'Laporan manual'}
            </span>
            <span className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
              <StatusBadge status={l.kondisi} /> {l.jumlah} {f.satuan}
              {l.catatan && <span>· {l.catatan}</span>}
            </span>
            {l.tindakLanjut && <span className="text-xs text-slate-700">Tindak lanjut: {l.tindakLanjut}</span>}
          </>
        )
        return (
          <li key={l.id}>
            {bisa('pemeliharaan') ? (
              <Link to={`/pemeliharaan?id=${l.id}`} className="flex flex-col gap-1.5 p-3 rounded-xl border border-line hover:bg-slate-50">
                {isi}
              </Link>
            ) : (
              <div className="flex flex-col gap-1.5 p-3 rounded-xl border border-line">{isi}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
