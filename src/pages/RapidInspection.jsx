import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Search, Filter, ChevronRight, ChevronLeft, CheckCircle2, AlertTriangle, XCircle, RefreshCw, CalendarClock, Clock,
  CalendarDays, Save, Check, CheckCheck, RotateCcw, X, ImagePlus, DoorOpen, BarChart3, Camera, ClipboardList,
  AirVent, Projector, Monitor, Lightbulb, Armchair, Table2, Presentation, PlugZap, Package,
} from 'lucide-react'
import Header from '../components/Header.jsx'
import InfoMuat from '../components/InfoMuat.jsx'
import { gayaInput, tombolUtama, tombolKedua } from '../components/Modal.jsx'
import { useData } from '../context/DataContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { teksKapasitas } from '../data/konstanta.js'

const PER_HALAMAN = 8
const BATAS_HARI = 7 // ruangan dianggap "Tertunda" kalau inspeksi terakhir lebih dari 7 hari lalu
const MAKS_FOTO = 5

// ===== Status inspeksi setiap ruangan (untuk daftar di kiri) =====
const STATUS_INSPEKSI = {
  selesai: { label: 'Selesai', ikon: CheckCircle2, gaya: 'bg-ok-soft text-ok-ink' },
  proses: { label: 'Dalam Proses', ikon: RefreshCw, gaya: 'bg-sky-50 text-sky-700' },
  terjadwal: { label: 'Terjadwal', ikon: CalendarClock, gaya: 'bg-warn-soft text-warn-ink' },
  tertunda: { label: 'Tertunda', ikon: AlertTriangle, gaya: 'bg-bad-soft text-bad-ink' },
}

// ===== Pilihan kondisi fasilitas =====
const KONDISI = {
  baik: { label: 'Baik', gaya: 'bg-ok-soft text-ok-ink border-green-200' },
  perawatan: { label: 'Bermasalah', gaya: 'bg-warn-soft text-warn-ink border-amber-200' },
  rusak: { label: 'Rusak', gaya: 'bg-bad-soft text-bad-ink border-red-200' },
}

// ===== Draft: isian yang belum selesai disimpan di perangkat ini =====
const kunciDraft = (ruangId) => `draft-inspeksi-${ruangId}`

function bacaDraft(ruangId) {
  try {
    return JSON.parse(localStorage.getItem(kunciDraft(ruangId)))
  } catch {
    return null
  }
}
function tulisDraft(ruangId, isi) {
  try {
    localStorage.setItem(kunciDraft(ruangId), JSON.stringify(isi))
    return true
  } catch {
    return false
  }
}
function hapusDraft(ruangId) {
  try {
    localStorage.removeItem(kunciDraft(ruangId))
  } catch {
    // abaikan
  }
}

// ===== Fungsi bantu =====
function samaHari(a, b) {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

function persen(n, total) {
  if (!total) return '0%'
  return (Math.round((n / total) * 1000) / 10).toString().replace('.', ',') + '%'
}

function teksLokasiSingkat(r) {
  return [r.gedung, r.lantai ? `Lantai ${r.lantai}` : null].filter(Boolean).join(' | ')
}

// Ikon fasilitas ditebak dari namanya
function ikonFasilitas(nama) {
  const n = nama.toLowerCase()
  if (n.includes('ac') && !n.includes('rak')) return AirVent
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

// ===== Halaman utama =====
export default function RapidInspection() {
  const { ruang, fasilitas, inspeksi } = useData()
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState('hari')
  const [cari, setCari] = useState('')
  const [gedung, setGedung] = useState('Semua')
  const [halaman, setHalaman] = useState(1)
  const [versi, setVersi] = useState(0) // dinaikkan setiap draft/inspeksi tersimpan, supaya tampilan diperbarui
  const [pesan, setPesan] = useState('')
  const areaForm = useRef(null)

  const sekarang = new Date()

  // Status inspeksi satu ruangan
  function statusInspeksi(r) {
    const terakhir = inspeksi.find((i) => i.ruangId === r.id) // daftar inspeksi sudah urut dari yang terbaru
    if (terakhir && samaHari(terakhir.waktuAsli, sekarang)) return 'selesai'
    if (bacaDraft(r.id)) return 'proses'
    if (terakhir && (sekarang - new Date(terakhir.waktuAsli)) / 86400000 > BATAS_HARI) return 'tertunda'
    return 'terjadwal'
  }

  // Ruangan yang bisa diinspeksi = yang sudah punya data fasilitas
  const ruangLengkap = ruang
    .filter((r) => r.jumlahFasilitas > 0)
    .map((r) => ({ ...r, statusInspeksi: statusInspeksi(r) }))
  const ruangSemua = ruang.map((r) => ({ ...r, statusInspeksi: r.jumlahFasilitas > 0 ? statusInspeksi(r) : null }))

  const daftarTab = {
    hari: ruangLengkap,
    tertunda: ruangLengkap.filter((r) => r.statusInspeksi === 'tertunda'),
    semua: ruangSemua,
  }

  const ruangTampil = daftarTab[tab].filter(
    (r) => (gedung === 'Semua' || r.gedung === gedung) && r.nama.toLowerCase().includes(cari.toLowerCase()),
  )
  const jumlahHalaman = Math.max(1, Math.ceil(ruangTampil.length / PER_HALAMAN))
  const halamanAman = Math.min(halaman, jumlahHalaman)
  const awal = (halamanAman - 1) * PER_HALAMAN
  const ruangHalamanIni = ruangTampil.slice(awal, awal + PER_HALAMAN)

  const ruangAktif = ruang.find((r) => r.id === params.get('ruang')) ?? null

  // Kartu ringkasan di atas
  const totalHariIni = ruangLengkap.length
  const hitung = (s) => ruangLengkap.filter((r) => r.statusInspeksi === s).length
  const nTertunda = hitung('tertunda')
  const daftarDurasi = inspeksi.map((i) => i.durasiDetik).filter((d) => d > 0)
  const rataMenit = daftarDurasi.length ? daftarDurasi.reduce((a, b) => a + b, 0) / daftarDurasi.length / 60 : 0
  const kartu = [
    { label: 'Inspeksi Hari Ini', nilai: totalHariIni, satuan: 'ruang', ikon: CalendarDays, warna: 'bg-primary-soft text-primary' },
    { label: 'Selesai', nilai: hitung('selesai'), satuan: `ruang (${persen(hitung('selesai'), totalHariIni)})`, ikon: CheckCircle2, warna: 'bg-ok-soft text-ok' },
    { label: 'Dalam Proses', nilai: hitung('proses'), satuan: `ruang (${persen(hitung('proses'), totalHariIni)})`, ikon: RefreshCw, warna: 'bg-sky-50 text-sky-700' },
    {
      label: 'Terjadwal',
      nilai: hitung('terjadwal') + nTertunda,
      satuan: nTertunda ? `ruang (${nTertunda} tertunda)` : `ruang (${persen(hitung('terjadwal'), totalHariIni)})`,
      ikon: CalendarClock,
      warna: 'bg-warn-soft text-amber-700',
    },
    {
      label: 'Rata-rata Waktu Inspeksi',
      nilai: rataMenit ? rataMenit.toFixed(1).replace('.', ',') : '-',
      satuan: 'menit/ruang',
      ikon: Clock,
      warna: 'bg-slate-100 text-slate-600',
    },
  ]

  function pilihRuang(id) {
    setParams({ ruang: id })
    setPesan('')
    if (window.innerWidth < 1280) {
      setTimeout(() => areaForm.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
    }
  }

  function inspeksiSelesai(teks) {
    setPesan(teks)
    setVersi((v) => v + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const daftarGedung = [...new Set(daftarTab[tab].map((r) => r.gedung))].sort()

  return (
    <>
      <Header judul="Rapid Inspection" subjudul="Pemeriksaan cepat kondisi fasilitas di ruangan secara digital" />
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
      <section aria-label="Ringkasan inspeksi" className="grid gap-3 grid-cols-2 md:grid-cols-[repeat(auto-fit,minmax(190px,1fr))]">
        {kartu.map(({ label, nilai, satuan, ikon: Ikon, warna }, i) => (
          <div
            key={label}
            className={`bg-white border border-line rounded-2xl p-4 flex items-center gap-3 ${i === kartu.length - 1 ? 'col-span-2 md:col-span-1' : ''}`}
          >
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

      <div className="grid gap-4 items-start xl:grid-cols-[minmax(290px,340px)_minmax(0,1fr)] 2xl:grid-cols-[minmax(300px,350px)_minmax(0,1fr)_minmax(280px,330px)]">
        {/* ===== Kiri: Jadwal & Daftar Inspeksi ===== */}
        <section aria-label="Jadwal dan daftar inspeksi" className="bg-white border border-line rounded-2xl p-4 flex flex-col gap-3.5 xl:col-start-1 xl:row-start-1">
          <h2 className="text-lg font-extrabold">Jadwal &amp; Daftar Inspeksi</h2>

          <div role="tablist" className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100">
            {[
              ['hari', 'Hari Ini', CalendarDays],
              ['tertunda', 'Tertunda', AlertTriangle],
              ['semua', 'Semua', BarChart3],
            ].map(([kode, label, Ikon]) => (
              <button
                key={kode}
                type="button"
                role="tab"
                aria-selected={tab === kode}
                onClick={() => {
                  setTab(kode)
                  setHalaman(1)
                  setGedung('Semua')
                }}
                className={`min-h-10 rounded-lg text-[13px] font-semibold inline-flex items-center justify-center gap-1.5
                  ${tab === kode ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}
              >
                <Ikon size={15} className="hidden 2xl:block" />
                {label} ({daftarTab[kode].length})
              </button>
            ))}
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-2">
            <label className="relative">
              <span className="sr-only">Cari ruangan</span>
              <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                className={`${gayaInput} pl-9`}
                value={cari}
                onChange={(e) => {
                  setCari(e.target.value)
                  setHalaman(1)
                }}
                placeholder="Cari ruangan…"
              />
            </label>
            <label className="relative">
              <span className="sr-only">Filter gedung</span>
              <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <select
                value={gedung}
                onChange={(e) => {
                  setGedung(e.target.value)
                  setHalaman(1)
                }}
                className={`${gayaInput} pl-8 w-32`}
              >
                <option value="Semua">Filter</option>
                {daftarGedung.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </label>
          </div>

          <ul className="flex flex-col gap-1.5">
            {ruangHalamanIni.map((r) => {
              const dipilih = r.id === ruangAktif?.id
              const s = STATUS_INSPEKSI[r.statusInspeksi]
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => pilihRuang(r.id)}
                    aria-current={dipilih ? 'true' : undefined}
                    className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-3 border
                      ${dipilih ? 'bg-primary-soft border-primary/30' : 'border-transparent hover:bg-slate-50'}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`size-5 shrink-0 rounded-md border grid place-items-center ${dipilih ? 'bg-primary border-primary text-white' : 'border-slate-300'}`}
                    >
                      {dipilih && <Check size={14} strokeWidth={3} />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-bold truncate">{r.nama}</span>
                      <span className="block text-xs text-muted">{teksLokasiSingkat(r)}</span>
                    </span>
                    {s ? (
                      <span className={`inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold px-2.5 py-1 rounded-full ${s.gaya}`}>
                        <s.ikon size={13} />
                        {s.label}
                      </span>
                    ) : (
                      <span className="text-xs text-muted whitespace-nowrap">Belum ada fasilitas</span>
                    )}
                    <ChevronRight size={17} className="text-muted shrink-0" />
                  </button>
                </li>
              )
            })}
          </ul>
          {ruangTampil.length === 0 && (
            <p className="text-sm text-muted text-center py-6">
              {tab === 'tertunda' ? 'Tidak ada inspeksi yang tertunda.' : 'Ruangan tidak ditemukan.'}
            </p>
          )}

          <div className="flex items-center justify-between gap-2 text-[13px] text-muted">
            <span>
              Menampilkan {ruangTampil.length ? awal + 1 : 0}–{Math.min(awal + PER_HALAMAN, ruangTampil.length)} dari {ruangTampil.length} ruangan
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Halaman sebelumnya"
                disabled={halamanAman === 1}
                onClick={() => setHalaman(halamanAman - 1)}
                className="size-9 grid place-items-center rounded-lg border border-line disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="min-w-9 h-9 px-2 grid place-items-center rounded-lg bg-primary text-white font-semibold">{halamanAman}</span>
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
          {tab !== 'semua' && ruang.length > ruangLengkap.length && (
            <p className="text-xs text-muted">
              {ruang.length - ruangLengkap.length} ruangan belum punya data fasilitas dan tidak masuk daftar ini (lihat tab Semua).
            </p>
          )}
        </section>

        {/* ===== Tengah: Form Rapid Inspection ===== */}
        <div ref={areaForm} className="scroll-mt-4 xl:col-start-2 xl:row-start-1 xl:row-span-2 2xl:row-span-1">
          {ruangAktif ? (
            <FormInspeksi
              key={`${ruangAktif.id}-${versi}`}
              ruangAktif={ruangAktif}
              milikRuang={fasilitas.filter((f) => f.ruangId === ruangAktif.id)}
              draftBerubah={() => setVersi((v) => v + 1)}
              selesai={inspeksiSelesai}
            />
          ) : (
            <section className="bg-white border border-line rounded-2xl p-8 text-center flex flex-col items-center gap-2">
              <DoorOpen size={40} className="text-muted" />
              <h2 className="text-lg font-extrabold">Form Rapid Inspection</h2>
              <p className="text-sm text-muted">Pilih ruangan dari Jadwal &amp; Daftar Inspeksi untuk mulai memeriksa.</p>
            </section>
          )}
        </div>

        {/* ===== Kanan: Riwayat dan ringkasan ruangan ===== */}
        <div className="flex flex-col gap-4 xl:col-start-1 xl:row-start-2 2xl:col-start-3 2xl:row-start-1">
          {ruangAktif && <PanelRiwayat key={`${ruangAktif.id}-${versi}`} ruangAktif={ruangAktif} />}
        </div>
      </div>
    </>
  )
}

// ===== Form Rapid Inspection =====
function FormInspeksi({ ruangAktif, milikRuang, draftBerubah, selesai }) {
  const { simpanInspeksi } = useData()
  const { bisa } = useAuth()
  const draft = bacaDraft(ruangAktif.id)

  const [mulai] = useState(() => draft?.mulai ?? Date.now())
  const [isian, setIsian] = useState(() => draft?.isian ?? {})
  const [catatanUmum, setCatatanUmum] = useState(() => draft?.catatanUmum ?? '')
  const [foto, setFoto] = useState([]) // [{ file, url }]
  const [error, setError] = useState('')
  const [info, setInfo] = useState(draft ? `Melanjutkan draft yang disimpan ${new Date(draft.disimpan).toLocaleString('id-ID')}.` : '')
  const [menyimpan, setMenyimpan] = useState(false)
  const inputFoto = useRef(null)

  // Isian awal = kondisi terakhir fasilitas. Kalau tidak ada perubahan, cukup biarkan.
  const kondisiTerakhir = (f) => ({
    kondisi: f.kondisi,
    jumlah: f.kondisi === 'baik' ? '' : String(f.jumlahRusak || f.jumlah),
    catatan: f.catatan,
  })
  const nilai = (f) => isian[f.id] ?? kondisiTerakhir(f)

  // Apakah isian berbeda dari kondisi terakhir?
  function berubah(f) {
    const n = nilai(f)
    const awal = kondisiTerakhir(f)
    return n.kondisi !== awal.kondisi || (n.kondisi !== 'baik' && n.jumlah !== awal.jumlah)
  }

  function ubah(f, data) {
    setIsian({ ...isian, [f.id]: { ...nilai(f), ...data } })
    setError('')
  }

  function ubahKondisi(f, kondisi) {
    if (kondisi === 'baik') {
      // Catatan kerusakan lama tidak relevan lagi kalau fasilitas sudah baik
      const catatan = nilai(f).catatan === f.catatan ? '' : nilai(f).catatan
      return ubah(f, { kondisi, jumlah: '', catatan })
    }
    if (kondisi === f.kondisi) return ubah(f, kondisiTerakhir(f))
    // Fasilitas yang hanya 1 unit langsung terisi 1
    ubah(f, { kondisi, jumlah: nilai(f).jumlah || (f.jumlah === 1 ? '1' : '') })
  }

  // Jumlah inspeksi hanya boleh angka 1 sampai jumlah unit yang terdata
  function ubahJumlah(f, teks) {
    const angka = parseInt(teks.replace(/\D/g, ''), 10)
    if (!angka) return ubah(f, { jumlah: '' })
    ubah(f, { jumlah: String(Math.min(angka, f.jumlah)) })
  }

  function tandaiSemuaBaik() {
    const semua = {}
    milikRuang.forEach((f) => {
      semua[f.id] = { kondisi: 'baik', jumlah: '', catatan: '' }
    })
    setIsian(semua)
  }

  // Kembalikan semua isian ke kondisi terakhir
  function kembalikanSemua() {
    setIsian({})
    setError('')
  }

  const jumlahBerubah = milikRuang.filter(berubah).length

  // Progres: fasilitas yang kondisinya sudah dipilih
  const sudahDiperiksa = milikRuang.filter((f) => nilai(f).kondisi).length
  const total = milikRuang.length
  const lengkap = total > 0 && sudahDiperiksa === total

  // ===== Hasil inspeksi (dihitung langsung dari isian) =====
  const bermasalah = milikRuang.filter((f) => nilai(f).kondisi && nilai(f).kondisi !== 'baik')
  const teksUnit = (f) => {
    const n = nilai(f)
    const keterangan = n.kondisi === 'rusak' ? 'rusak' : 'bermasalah'
    return `${f.nama} (${n.jumlah || '?'} dari ${f.jumlah} unit ${keterangan})`
  }
  const rusakTotal = bermasalah.filter((f) => nilai(f).kondisi === 'rusak' && Number(nilai(f).jumlah) === f.jumlah)
  const rusakSebagian = bermasalah.filter((f) => !rusakTotal.includes(f))

  let hasil
  if (!lengkap) {
    hasil = {
      ikon: ClipboardList,
      gaya: 'bg-slate-50 border-line',
      warnaIkon: 'text-muted',
      judul: 'Kondisi Ruangan: Belum Lengkap',
      teks: `Pilih kondisi ${total - sudahDiperiksa} fasilitas lagi untuk melihat hasil inspeksi.`,
    }
  } else if (rusakTotal.length) {
    hasil = {
      ikon: XCircle,
      gaya: 'bg-bad-soft border-red-200',
      warnaIkon: 'text-bad',
      judul: 'Kondisi Ruangan: Tidak Dapat Digunakan',
      teks:
        `Kondisi fasilitas ruangan rusak pada ${rusakTotal.map(teksUnit).join(', ')}` +
        (rusakSebagian.length ? `, serta bermasalah sebagian pada ${rusakSebagian.map(teksUnit).join(', ')}.` : '.'),
    }
  } else if (bermasalah.length) {
    hasil = {
      ikon: AlertTriangle,
      gaya: 'bg-warn-soft border-amber-200',
      warnaIkon: 'text-warn',
      judul: 'Kondisi Ruangan: Bermasalah',
      teks: `Kondisi fasilitas ruangan bermasalah sebagian pada ${bermasalah.map(teksUnit).join(', ')}.`,
    }
  } else {
    hasil = {
      ikon: CheckCircle2,
      gaya: 'bg-ok-soft border-green-200',
      warnaIkon: 'text-ok',
      judul: 'Kondisi Ruangan: Baik',
      teks: 'Seluruh fasilitas dalam kondisi baik dan dapat digunakan.',
    }
  }

  // ===== Foto dokumentasi =====
  function tambahFoto(e) {
    const dipilih = [...e.target.files].filter((f) => f.type.startsWith('image/'))
    const sisa = MAKS_FOTO - foto.length
    if (dipilih.length > sisa) setError(`Maksimal ${MAKS_FOTO} foto. Hanya ${sisa} foto pertama yang ditambahkan.`)
    setFoto([...foto, ...dipilih.slice(0, sisa).map((file) => ({ file, url: URL.createObjectURL(file) }))])
    e.target.value = ''
  }

  function hapusFoto(i) {
    URL.revokeObjectURL(foto[i].url)
    setFoto(foto.filter((_, j) => j !== i))
  }

  // ===== Simpan =====
  function simpanSebagaiDraft() {
    const berhasil = tulisDraft(ruangAktif.id, { isian, catatanUmum, mulai, disimpan: Date.now() })
    if (!berhasil) return setError('Draft gagal disimpan di perangkat ini.')
    setInfo(`Draft tersimpan di perangkat ini (${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}). Foto tidak ikut tersimpan di draft.`)
    draftBerubah()
  }

  async function selesaikan() {
    if (!lengkap) return setError(`Masih ada ${total - sudahDiperiksa} fasilitas yang kondisinya belum dipilih.`)
    const kurang = bermasalah.find((f) => !Number(nilai(f).jumlah))
    if (kurang) return setError(`Isi jumlah inspeksi untuk ${kurang.nama} (1 sampai ${kurang.jumlah} unit).`)

    setError('')
    setMenyimpan(true)
    const daftarHasil = milikRuang.map((f) => ({ fasilitasId: f.id, ...nilai(f) }))
    const durasi = Math.round((Date.now() - mulai) / 1000)
    const jawaban = await simpanInspeksi(
      ruangAktif.id,
      catatanUmum,
      daftarHasil,
      durasi,
      foto.map((f) => f.file),
    )
    setMenyimpan(false)
    if (jawaban.error) return setError(jawaban.error)

    hapusDraft(ruangAktif.id)
    foto.forEach((f) => URL.revokeObjectURL(f.url))
    selesai(`Inspeksi ${ruangAktif.nama} tersimpan. ${hasil.judul}.`)
  }

  return (
    <section aria-label="Form rapid inspection" className="bg-white border border-line rounded-2xl p-4 sm:p-5 flex flex-col gap-5 pb-24 xl:pb-5">
      <h2 className="text-lg font-extrabold">Form Rapid Inspection</h2>

      {/* Ruangan yang diperiksa + progres */}
      <div className="border border-line rounded-xl p-4 flex flex-wrap items-center gap-4">
        <span className="size-12 shrink-0 rounded-xl bg-primary-soft text-primary grid place-items-center">
          <DoorOpen size={26} />
        </span>
        <div className="flex-1 min-w-44">
          <p className="text-xl font-extrabold">{ruangAktif.nama}</p>
          <p className="text-[13px] text-muted">
            {[ruangAktif.kampus, teksLokasiSingkat(ruangAktif), `Kapasitas: ${teksKapasitas(ruangAktif)}`].join(' | ')}
          </p>
        </div>
        <div className="w-full sm:w-52">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-muted">Progres Inspeksi</span>
            <b>
              {sudahDiperiksa}/{total} ({total ? Math.round((sudahDiperiksa / total) * 100) : 0}%)
            </b>
          </div>
          <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full bg-ok transition-all" style={{ width: `${total ? (sudahDiperiksa / total) * 100 : 0}%` }} />
          </div>
          <p className="text-xs text-muted mt-1.5">
            {jumlahBerubah ? (
              <b className="text-warn-ink">{jumlahBerubah} fasilitas berubah kondisi</b>
            ) : (
              'Belum ada perubahan kondisi'
            )}
          </p>
        </div>
      </div>

      {info && <p className="text-[13px] text-sky-700 bg-sky-50 rounded-xl px-3.5 py-2.5">{info}</p>}

      {total === 0 ? (
        <div className="text-center py-6 flex flex-col items-center gap-3">
          <p className="text-sm text-muted">Ruangan ini belum punya data fasilitas, jadi belum bisa diinspeksi.</p>
          {bisa('kelolaData') ? (
            <Link to={`/fasilitas?ruang=${ruangAktif.id}`} className={tombolUtama}>
              Tambah fasilitas dulu
            </Link>
          ) : (
            <p className="text-sm font-semibold">Hubungi Sarana Prasarana untuk menambahkan fasilitas.</p>
          )}
        </div>
      ) : (
        <>
          {/* ===== Daftar Fasilitas & Kondisi ===== */}
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-extrabold">Daftar Fasilitas &amp; Kondisi</h3>
              <div className="flex flex-wrap gap-2">
                {jumlahBerubah > 0 && (
                  <button type="button" onClick={kembalikanSemua} className={`${tombolKedua} min-h-10 px-3.5`}>
                    <RotateCcw size={16} /> Kembalikan
                  </button>
                )}
                <button type="button" onClick={tandaiSemuaBaik} className={`${tombolKedua} min-h-10 px-3.5`}>
                  <CheckCheck size={17} /> Tandai semua baik
                </button>
              </div>
            </div>
            <p className="text-[13px] text-muted -mt-1">
              Kondisi terisi otomatis dari inspeksi terakhir. Kalau tidak ada perubahan, biarkan saja. Ubah hanya fasilitas yang kondisinya berubah.
            </p>

            <div className="border border-line rounded-xl overflow-hidden">
              <div className="hidden md:grid grid-cols-[minmax(0,1.3fr)_64px_140px_84px_minmax(0,1.6fr)] gap-3 px-3.5 py-2.5 bg-slate-50 text-[13px] font-bold text-slate-600">
                <span>Fasilitas</span>
                <span>Jumlah</span>
                <span>Kondisi</span>
                <span>Jml Inspeksi</span>
                <span>Catatan (Opsional)</span>
              </div>
              <ul>
                {milikRuang.map((f) => {
                  const n = nilai(f)
                  const Ikon = ikonFasilitas(f.nama)
                  const butuhJumlah = n.kondisi === 'perawatan' || n.kondisi === 'rusak'
                  const adaPerubahan = berubah(f)
                  return (
                    <li
                      key={f.id}
                      className={`grid grid-cols-[1fr_6rem] gap-2 md:grid-cols-[minmax(0,1.3fr)_64px_140px_84px_minmax(0,1.6fr)] md:gap-3 items-center px-3.5 py-3 border-t border-line first:border-t-0 md:first:border-t
                        ${adaPerubahan ? 'bg-amber-50/70' : ''}`}
                    >
                      {/* Fasilitas */}
                      <div className="col-span-2 md:col-span-1 flex items-center gap-2.5 min-w-0">
                        <Ikon size={20} className="text-slate-600 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-semibold leading-snug">
                            {f.nama}
                            {adaPerubahan && (
                              <span className="ml-1.5 align-middle text-[11px] font-semibold px-1.5 py-0.5 rounded-md bg-warn-soft text-warn-ink">Berubah</span>
                            )}
                          </p>
                          <p className="text-xs text-muted">
                            <span className="md:hidden">
                              {f.jumlah} {f.satuan} ·{' '}
                            </span>
                            Terakhir: {KONDISI[f.kondisi]?.label ?? '-'}
                            {f.jumlahRusak > 0 && ` (${f.jumlahRusak} unit)`}
                          </p>
                        </div>
                      </div>

                      {/* Jumlah terdata */}
                      <span className="hidden md:block text-sm">
                        {f.jumlah} {f.satuan}
                      </span>

                      {/* Kondisi */}
                      <label className="flex flex-col gap-1">
                        <span className="text-xs font-semibold md:sr-only">Kondisi</span>
                        <select
                          value={n.kondisi}
                          onChange={(e) => ubahKondisi(f, e.target.value)}
                          className={`${gayaInput} font-semibold ${n.kondisi ? KONDISI[n.kondisi].gaya : 'text-muted'}`}
                        >
                          <option value="">Pilih…</option>
                          <option value="baik">Baik</option>
                          <option value="perawatan">Bermasalah</option>
                          <option value="rusak">Rusak</option>
                        </select>
                      </label>

                      {/* Jumlah inspeksi */}
                      <label className="flex flex-col gap-1">
                        <span className="text-xs font-semibold md:sr-only">Jml inspeksi</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          aria-label={`Jumlah inspeksi ${f.nama}, maksimal ${f.jumlah}`}
                          disabled={!butuhJumlah}
                          value={butuhJumlah ? n.jumlah : ''}
                          onChange={(e) => ubahJumlah(f, e.target.value)}
                          placeholder={butuhJumlah ? `1–${f.jumlah}` : '-'}
                          className={`${gayaInput} text-center px-2 disabled:bg-slate-50 disabled:text-muted`}
                        />
                      </label>

                      {/* Catatan */}
                      <label className="col-span-2 md:col-span-1">
                        <span className="sr-only">Catatan {f.nama}</span>
                        <input
                          className={gayaInput}
                          value={n.catatan}
                          onChange={(e) => ubah(f, { catatan: e.target.value })}
                          placeholder={butuhJumlah ? 'Contoh: tidak dingin, lampu redup' : 'Catatan (opsional)'}
                        />
                      </label>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>

          {/* ===== Dokumentasi ===== */}
          <div className="flex flex-col gap-2.5">
            <h3 className="text-base font-extrabold">Dokumentasi (Opsional)</h3>
            <p className="text-[13px] text-muted -mt-1.5">Foto alat atau fasilitas yang bermasalah. Maksimal {MAKS_FOTO} foto.</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2.5">
              {foto.map((f, i) => (
                <div key={f.url} className="relative aspect-[4/3] rounded-xl overflow-hidden border border-line bg-slate-100">
                  <img src={f.url} alt={`Foto dokumentasi ${i + 1}`} className="size-full object-cover" />
                  <button
                    type="button"
                    aria-label={`Hapus foto ${i + 1}`}
                    onClick={() => hapusFoto(i)}
                    className="absolute top-1 right-1 size-8 grid place-items-center rounded-full bg-slate-900/70 text-white"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              {foto.length < MAKS_FOTO && (
                <button
                  type="button"
                  onClick={() => inputFoto.current?.click()}
                  className="aspect-[4/3] rounded-xl border-2 border-dashed border-slate-300 text-muted hover:border-primary hover:text-primary flex flex-col items-center justify-center gap-1 text-xs font-semibold"
                >
                  <ImagePlus size={24} />
                  Tambah Foto
                  <span className="font-normal">(maks. {MAKS_FOTO} foto)</span>
                </button>
              )}
            </div>
            <input ref={inputFoto} type="file" accept="image/*" multiple className="hidden" onChange={tambahFoto} />
          </div>

          {/* ===== Catatan umum ===== */}
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
            Catatan umum (opsional)
            <textarea
              rows={2}
              className={`${gayaInput} py-2.5`}
              value={catatanUmum}
              onChange={(e) => setCatatanUmum(e.target.value)}
              placeholder="Contoh: ruangan kotor atau ada kebocoran"
            />
          </label>

          {/* ===== Hasil Inspeksi ===== */}
          <div className="flex flex-col gap-2.5">
            <h3 className="text-base font-extrabold">Hasil Inspeksi</h3>
            <div aria-live="polite" className={`flex items-start gap-3.5 p-4 rounded-xl border ${hasil.gaya}`}>
              <hasil.ikon size={34} className={`shrink-0 ${hasil.warnaIkon}`} />
              <div>
                <p className="font-extrabold">{hasil.judul}</p>
                <p className="text-[13px] text-slate-500 mt-0.5">{hasil.teks}</p>
              </div>
            </div>
          </div>

          {error && (
            <p role="alert" className="p-3.5 rounded-xl bg-bad-soft text-bad-ink text-sm font-semibold">
              {error}
            </p>
          )}

          {/* Tombol: menempel di bawah layar pada HP */}
          <div className="fixed xl:static bottom-0 inset-x-0 z-30 grid grid-cols-[auto_1fr] gap-2.5 p-3 xl:p-0 bg-white/95 xl:bg-transparent border-t border-line xl:border-0">
            <button type="button" onClick={simpanSebagaiDraft} disabled={menyimpan} className={tombolKedua}>
              <Save size={18} /> Simpan Draft
            </button>
            <button type="button" onClick={selesaikan} disabled={menyimpan} className={`${tombolUtama} disabled:opacity-60`}>
              <Check size={18} /> {menyimpan ? (foto.length ? 'Mengunggah foto…' : 'Menyimpan…') : 'Selesaikan Inspeksi'}
            </button>
          </div>
        </>
      )}
    </section>
  )
}

// ===== Riwayat & Ringkasan Inspeksi Ruangan =====
const HASIL_RUANGAN = {
  baik: { label: 'Baik', ikon: CheckCircle2, warna: 'text-ok', badge: 'bg-ok-soft text-ok-ink' },
  bermasalah: { label: 'Bermasalah', ikon: AlertTriangle, warna: 'text-warn', badge: 'bg-warn-soft text-warn-ink' },
  tidak_dapat_digunakan: { label: 'Tidak Dapat Digunakan', ikon: XCircle, warna: 'text-bad', badge: 'bg-bad-soft text-bad-ink' },
}

function PanelRiwayat({ ruangAktif }) {
  const { ambilRiwayatInspeksi } = useData()
  const [riwayat, setRiwayat] = useState(null)
  const [semua, setSemua] = useState(false)

  useEffect(() => {
    let masihTerpasang = true
    ambilRiwayatInspeksi(ruangAktif.id).then((hasil) => {
      if (masihTerpasang) setRiwayat(hasil.data)
    })
    return () => {
      masihTerpasang = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruangAktif.id])

  const daftar = riwayat ?? []
  const tampil = semua ? daftar : daftar.slice(0, 4)
  const hitung = (k) => daftar.filter((i) => i.kondisiRuangan === k).length
  const ringkasan = [
    { label: 'Kondisi Baik', kode: 'baik' },
    { label: 'Bermasalah', kode: 'bermasalah' },
    { label: 'Tidak Dapat Digunakan', kode: 'tidak_dapat_digunakan' },
  ]

  return (
    <>
      <section aria-label="Riwayat inspeksi ruangan" className="bg-white border border-line rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-extrabold">Riwayat Inspeksi Ruangan</h2>
          {daftar.length > 4 && (
            <button type="button" onClick={() => setSemua(!semua)} className="text-[13px] font-semibold text-primary min-h-9">
              {semua ? 'Ringkas' : 'Lihat Semua'}
            </button>
          )}
        </div>
        <p className="text-[13px] text-muted -mt-2">{ruangAktif.nama}</p>

        {riwayat === null && <p className="text-sm text-muted">Memuat riwayat…</p>}
        {riwayat?.length === 0 && <p className="text-sm text-muted py-3">Ruangan ini belum pernah diinspeksi.</p>}

        <ol className="flex flex-col">
          {tampil.map((i) => {
            const h = HASIL_RUANGAN[i.kondisiRuangan] ?? HASIL_RUANGAN.baik
            const masalah = i.detail.filter((d) => d.kondisi !== 'baik')
            return (
              <li key={i.id} className="flex gap-3 py-2.5 border-b border-slate-100 last:border-0">
                <h.ikon size={22} className={`shrink-0 mt-0.5 ${h.warna}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold">{i.waktu}</p>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${h.badge}`}>{h.label}</span>
                  </div>
                  <p className="text-xs text-muted">Oleh: {i.pemeriksa}</p>
                  {masalah.map((d) => (
                    <p key={d.nama} className="text-xs text-slate-600">
                      {d.nama} {d.kondisi === 'rusak' ? 'rusak' : 'bermasalah'} ({d.jumlah} unit){d.catatan && `: ${d.catatan}`}
                    </p>
                  ))}
                  {i.catatan && <p className="text-xs text-slate-600">Catatan: {i.catatan}</p>}
                  {i.foto.length > 0 && (
                    <div className="flex gap-1.5 mt-1.5">
                      {i.foto.map((url, n) => (
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
      </section>

      <section aria-label="Ringkasan inspeksi ruangan" className="bg-white border border-line rounded-2xl p-4 flex flex-col gap-3">
        <h2 className="text-lg font-extrabold">Ringkasan Inspeksi Ruangan</h2>
        <div className="flex items-center gap-3 text-sm">
          <BarChart3 size={20} className="text-primary" />
          <span className="flex-1">Total Inspeksi</span>
          <b>{daftar.length} kali</b>
        </div>
        {ringkasan.map(({ label, kode }) => {
          const h = HASIL_RUANGAN[kode]
          return (
            <div key={kode} className="flex items-center gap-3 text-sm">
              <h.ikon size={20} className={h.warna} />
              <span className="flex-1">{label}</span>
              <b>
                {hitung(kode)} kali <span className="font-normal text-muted">({persen(hitung(kode), daftar.length)})</span>
              </b>
            </div>
          )
        })}
        <div className="flex items-center gap-3 text-sm">
          <Camera size={20} className="text-slate-500" />
          <span className="flex-1">Foto dokumentasi</span>
          <b>{daftar.reduce((n, i) => n + i.foto.length, 0)} foto</b>
        </div>
      </section>
    </>
  )
}
