import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus, Search, LayoutList, CheckCircle2, AlertTriangle, XCircle, Clock, ScanSearch, Wrench, AlarmClock, CalendarClock,
  UserCheck, ArrowRight, CalendarDays, Flame,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import Header from '../components/Header.jsx'
import InfoMuat from '../components/InfoMuat.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { tombolUtama, gayaInput } from '../components/Modal.jsx'
import { useData } from '../context/DataContext.jsx'
import { DAFTAR_KAMPUS, LABEL_RUANG, STATUS, gedungDiKampus, teksLokasi } from '../data/konstanta.js'
import { useAuth } from '../context/AuthContext.jsx'
import { PilStatus } from './Pemeliharaan.jsx'

const HARI = 86400000
const WARNA = { baik: '#16a34a', perawatan: '#f59e0b', rusak: '#dc2626', belum: '#94a3b8' }
const TERBUKA = ['baru', 'verifikasi', 'terverifikasi', 'diproses']
const URUT_PRIORITAS = { tinggi: 0, sedang: 1, rendah: 2 }

function persen(n, total) {
  if (!total) return '0%'
  return (Math.round((n / total) * 1000) / 10).toString().replace('.', ',') + '%'
}
const keYmd = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
const labelRuang = (k) => (k === 'belum' ? 'Belum Diinspeksi' : LABEL_RUANG[k] ?? STATUS[k]?.label)

// Sapaan sesuai jam
function sapaan() {
  const j = new Date().getHours()
  if (j < 11) return 'Selamat pagi'
  if (j < 15) return 'Selamat siang'
  if (j < 18) return 'Selamat sore'
  return 'Selamat malam'
}

// Ringkasan fasilitas bermasalah, contoh "AC 1/2 rusak · Lampu 2/8 bermasalah"
function ringkasMasalah(daftar) {
  return daftar
    .filter((f) => f.kondisi !== 'baik')
    .map((f) => {
      const keadaan = { perawatan: 'bermasalah', rusak: 'rusak', maintenance: 'maintenance' }[f.kondisi]
      return f.jumlah > 1 ? `${f.nama} ${f.jumlahRusak || f.jumlah}/${f.jumlah} ${keadaan}` : `${f.nama} ${keadaan}`
    })
    .join(' · ')
}

export default function Dashboard() {
  const { ruang, fasilitas, aktivitas, inspeksi, laporan, jadwal } = useData()
  const { pengguna, bisa } = useAuth()
  const peran = pengguna?.peran
  const [kampus, setKampus] = useState('Semua')
  const [gedung, setGedung] = useState('Semua')
  const [kondisi, setKondisi] = useState('Semua')
  const [cari, setCari] = useState('')

  const sekarang = new Date()
  const hariIni = keYmd(sekarang)

  // ===== Kondisi ruangan =====
  const total = ruang.length
  const jumlah = (s) => ruang.filter((r) => r.status === s).length
  const n = { baik: jumlah('baik'), perawatan: jumlah('perawatan'), rusak: jumlah('rusak'), belum: jumlah('belum') }

  // ===== Inspeksi =====
  const inspeksiHariIni = inspeksi.filter((i) => keYmd(new Date(i.waktuAsli)) === hariIni)
  const ruangBerfasilitas = ruang.filter((r) => r.jumlahFasilitas > 0)
  const ruangMingguIni = new Set(inspeksi.filter((i) => sekarang - new Date(i.waktuAsli) <= 7 * HARI).map((i) => i.ruangId))
  const cakupanMinggu = ruangBerfasilitas.filter((r) => ruangMingguIni.has(r.id)).length
  const belumDiinspeksi7Hari = ruangBerfasilitas.filter((r) => !ruangMingguIni.has(r.id))
  const inspeksi7Hari = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sekarang.getFullYear(), sekarang.getMonth(), sekarang.getDate() - (6 - i))
    return {
      hari: d.toLocaleDateString('id-ID', { weekday: 'short' }),
      jumlah: inspeksi.filter((x) => keYmd(new Date(x.waktuAsli)) === keYmd(d)).length,
    }
  })

  // ===== Pemeliharaan =====
  const tiketAktif = laporan
    .filter((l) => TERBUKA.includes(l.status))
    .sort((a, b) => URUT_PRIORITAS[a.prioritas] - URUT_PRIORITAS[b.prioritas] || new Date(a.dibuatAsli) - new Date(b.dibuatAsli))
  const tiketTerlambat = tiketAktif.filter((l) => l.status === 'diproses' && l.targetSelesai && l.targetSelesai < hariIni)
  const tiketTinggi = tiketAktif.filter((l) => l.prioritas === 'tinggi')
  const tugasVerifikasiSaya = laporan.filter((l) => l.status === 'verifikasi' && l.petugasVerifikasiId === pengguna?.id)
  const batas7Hari = keYmd(new Date(sekarang.getTime() + 7 * HARI))
  const jadwalDekat = jadwal
    .filter((j) => j.aktif && j.berikutnya <= batas7Hari && !laporan.some((l) => l.jadwalId === j.id && TERBUKA.includes(l.status)))
    .sort((a, b) => a.berikutnya.localeCompare(b.berikutnya))

  // ===== Kartu ringkasan (menyesuaikan peran) =====
  const kartu = [
    { label: 'Total Ruangan', nilai: total, satuan: `${ruangBerfasilitas.length} punya data fasilitas`, ikon: LayoutList, warna: 'bg-primary-soft text-primary' },
    { label: 'Kondisi Baik', nilai: n.baik, satuan: `ruang (${persen(n.baik, total)})`, ikon: CheckCircle2, warna: 'bg-ok-soft text-ok' },
    { label: 'Bermasalah', nilai: n.perawatan, satuan: `ruang (${persen(n.perawatan, total)})`, ikon: AlertTriangle, warna: 'bg-warn-soft text-amber-700' },
    { label: 'Tidak Dapat Digunakan', nilai: n.rusak, satuan: `ruang (${persen(n.rusak, total)})`, ikon: XCircle, warna: 'bg-bad-soft text-bad' },
    { label: 'Inspeksi Hari Ini', nilai: inspeksiHariIni.length, satuan: `cakupan 7 hari: ${persen(cakupanMinggu, ruangBerfasilitas.length)}`, ikon: ScanSearch, warna: 'bg-sky-50 text-sky-700' },
  ]
  if (peran === 'sarpras') {
    kartu.push({ label: 'Tiket Aktif', nilai: tiketAktif.length, satuan: tiketTerlambat.length ? `${tiketTerlambat.length} terlambat` : 'tidak ada yang terlambat', ikon: Wrench, warna: 'bg-slate-100 text-slate-600' })
  }
  if (peran === 'pktl') {
    kartu.push({ label: 'Tugas Verifikasi', nilai: tugasVerifikasiSaya.length, satuan: 'menunggu dicek', ikon: UserCheck, warna: 'bg-violet-50 text-violet-700' })
  }

  // ===== Hal yang perlu perhatian (menyesuaikan peran) =====
  const perhatian = []
  if (peran === 'sarpras') {
    if (tiketTinggi.length) perhatian.push({ ikon: Flame, teks: `${tiketTinggi.length} tiket prioritas tinggi belum selesai`, ke: '/pemeliharaan', gaya: 'bg-bad-soft text-bad-ink' })
    if (tiketTerlambat.length) perhatian.push({ ikon: AlarmClock, teks: `${tiketTerlambat.length} pemeliharaan melewati target`, ke: '/pemeliharaan', gaya: 'bg-bad-soft text-bad-ink' })
    const baru = laporan.filter((l) => l.status === 'baru').length
    if (baru) perhatian.push({ ikon: Wrench, teks: `${baru} temuan baru menunggu tindak lanjut`, ke: '/pemeliharaan', gaya: 'bg-warn-soft text-warn-ink' })
    if (jadwalDekat.length) perhatian.push({ ikon: CalendarClock, teks: `${jadwalDekat.length} jadwal preventif jatuh tempo dalam 7 hari`, ke: '/pemeliharaan', gaya: 'bg-sky-50 text-sky-700' })
  }
  if (peran === 'pktl' && tugasVerifikasiSaya.length) {
    perhatian.push({ ikon: UserCheck, teks: `${tugasVerifikasiSaya.length} tugas verifikasi lapangan untuk Anda`, ke: '/pemeliharaan', gaya: 'bg-violet-50 text-violet-700' })
  }
  if (bisa('rapidInspection') && belumDiinspeksi7Hari.length) {
    perhatian.push({ ikon: ScanSearch, teks: `${belumDiinspeksi7Hari.length} ruangan belum diinspeksi dalam 7 hari terakhir`, ke: '/rapid-inspection', gaya: 'bg-warn-soft text-warn-ink' })
  }
  if (n.rusak) {
    perhatian.push({ ikon: XCircle, teks: `${n.rusak} ruangan tidak dapat digunakan`, ke: '/ruang-uisi', gaya: 'bg-bad-soft text-bad-ink' })
  }

  // ===== Grafik =====
  const dataDonat = ['baik', 'perawatan', 'rusak', 'belum'].map((k) => ({ kode: k, nama: labelRuang(k), nilai: n[k], warna: WARNA[k] })).filter((d) => d.nilai > 0)
  const perGedung = [...new Set(ruang.map((r) => r.gedung))].sort().map((g) => {
    const milik = ruang.filter((r) => r.gedung === g)
    const h = (k) => milik.filter((r) => r.status === k).length
    return { gedung: g, baik: h('baik'), perawatan: h('perawatan'), rusak: h('rusak'), belum: h('belum') }
  })

  // ===== Daftar ruangan =====
  const ruangTampil = useMemo(
    () =>
      ruang.filter(
        (r) =>
          (kampus === 'Semua' || r.kampus === kampus) &&
          (gedung === 'Semua' || r.gedung === gedung) &&
          (kondisi === 'Semua' || r.status === kondisi) &&
          r.nama.toLowerCase().includes(cari.toLowerCase()),
      ),
    [ruang, kampus, gedung, kondisi, cari],
  )

  const perluTindakan = fasilitas
    .filter((f) => f.kondisi !== 'baik')
    .sort((a, b) => (a.kondisi === 'rusak' ? -1 : 1) - (b.kondisi === 'rusak' ? -1 : 1))

  return (
    <>
      <Header judul="Dashboard Monitoring" subjudul={`${sapaan()}, ${pengguna?.nama ?? ''}. Berikut kondisi ruangan dan fasilitas UISI terkini.`} />
      <InfoMuat />

      {/* Kartu ringkasan */}
      <section aria-label="Ringkasan" className="grid gap-3 grid-cols-2 md:grid-cols-3 2xl:grid-cols-6">
        {kartu.map(({ label, nilai, satuan, ikon: Ikon, warna }) => (
          <div key={label} className="bg-white border border-line rounded-2xl p-4 flex items-center gap-3">
            <span className={`size-11 shrink-0 rounded-xl grid place-items-center ${warna}`}>
              <Ikon size={22} />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-slate-600 leading-tight">{label}</p>
              <b className="text-2xl font-extrabold">{nilai}</b>
              <p className="text-xs text-muted leading-tight">{satuan}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Perlu perhatian */}
      {perhatian.length > 0 && (
        <section aria-label="Perlu perhatian" className="flex flex-wrap gap-2">
          {perhatian.map(({ ikon: Ikon, teks, ke, gaya }) => (
            <Link key={teks} to={ke} className={`inline-flex items-center gap-2 px-3.5 min-h-10 rounded-xl text-[13px] font-semibold hover:brightness-95 ${gaya}`}>
              <Ikon size={16} /> {teks} <ArrowRight size={14} />
            </Link>
          ))}
        </section>
      )}

      <div className="flex flex-wrap gap-5 items-start">
        {/* ===== Kiri: status setiap ruangan ===== */}
        <section aria-label="Status ruangan" className="flex-[999_1_600px] min-w-0 bg-white border border-line rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold">Status Ruangan</h2>
            <div className="flex gap-2">
              <Link to="/ruang-uisi" className="inline-flex items-center gap-1.5 min-h-11 px-4 rounded-xl border border-slate-300 text-sm font-semibold hover:bg-slate-50">
                <CalendarDays size={17} /> Jadwal & Kondisi
              </Link>
              {bisa('kelolaData') && (
                <Link to="/ruangan" className={tombolUtama}>
                  <Plus size={18} /> Tambah Ruangan
                </Link>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 items-center">
            <select aria-label="Filter kampus" value={kampus} onChange={(e) => { setKampus(e.target.value); setGedung('Semua') }} className={`${gayaInput} sm:w-40`}>
              <option value="Semua">Semua kampus</option>
              {DAFTAR_KAMPUS.map((k) => <option key={k}>{k}</option>)}
            </select>
            <select aria-label="Filter gedung" value={gedung} onChange={(e) => setGedung(e.target.value)} className={`${gayaInput} sm:w-40`}>
              <option value="Semua">Semua gedung</option>
              {gedungDiKampus(ruang, kampus).map((g) => <option key={g}>{g}</option>)}
            </select>
            <label className="flex-[1_1_220px] flex items-center gap-2.5 min-h-11 px-3.5 border border-slate-200 rounded-xl text-muted">
              <Search size={18} />
              <input type="search" aria-label="Cari ruangan" placeholder="Cari nama ruangan..." value={cari} onChange={(e) => setCari(e.target.value)}
                className="flex-1 min-w-0 bg-transparent outline-none text-sm text-ink" />
            </label>
          </div>

          {/* Saring cepat per kondisi */}
          <div role="group" aria-label="Saring kondisi" className="flex flex-wrap gap-1.5">
            {['Semua', 'baik', 'perawatan', 'rusak', 'belum'].map((k) => {
              const aktif = kondisi === k
              const jumlahK = k === 'Semua' ? total : n[k]
              return (
                <button key={k} type="button" aria-pressed={aktif} onClick={() => setKondisi(k)}
                  className={`inline-flex items-center gap-1.5 min-h-9 px-3 rounded-full text-[13px] font-semibold border ${aktif ? 'bg-primary text-white border-primary' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
                  {k !== 'Semua' && <span className="size-2.5 rounded-full" style={{ background: WARNA[k] }} />}
                  {k === 'Semua' ? 'Semua' : labelRuang(k)} ({jumlahK})
                </button>
              )
            })}
          </div>

          <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
            {ruangTampil.map((r) => {
              const masalah = ringkasMasalah(fasilitas.filter((f) => f.ruangId === r.id))
              return (
                <Link key={r.id} to={`/ruangan?cari=${encodeURIComponent(r.nama)}`}
                  className={`flex flex-col gap-2 p-3.5 border rounded-xl hover:border-primary hover:shadow-sm transition border-l-4 bg-white border-line`}
                  style={{ borderLeftColor: WARNA[r.status] }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold">{r.nama}</p>
                      <p className="text-xs text-muted">{teksLokasi(r)} · {r.jenis}</p>
                    </div>
                    <StatusBadge status={r.status} ruang />
                  </div>
                  {masalah ? (
                    <p className="text-xs text-slate-700 leading-snug">{masalah}</p>
                  ) : (
                    <p className="text-xs text-muted">{r.jumlahFasilitas ? `${r.jumlahFasilitas} fasilitas, semua baik` : 'Belum ada data fasilitas'}</p>
                  )}
                  <p className="text-[11px] text-muted inline-flex items-center gap-1 mt-auto">
                    <Clock size={12} /> {r.inspeksiTerakhir ?? 'Belum pernah diinspeksi'}
                  </p>
                </Link>
              )
            })}
            {ruangTampil.length === 0 && <p className="text-sm text-muted">Tidak ada ruangan yang cocok.</p>}
          </div>
        </section>

        {/* ===== Kanan: ringkasan menu lain ===== */}
        <aside className="flex-[1_1_340px] min-w-0 flex flex-col gap-5">
          {/* Distribusi kondisi */}
          <Kotak judul="Distribusi Kondisi Ruangan">
            <div className="grid grid-cols-[140px_1fr] gap-3 items-center">
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={dataDonat} dataKey="nilai" nameKey="nama" innerRadius="58%" outerRadius="95%" paddingAngle={dataDonat.length > 1 ? 2 : 0} isAnimationActive={false}>
                      {dataDonat.map((d) => <Cell key={d.kode} fill={d.warna} />)}
                    </Pie>
                    <Tooltip formatter={(v, nama) => [`${v} ruang`, nama]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="flex flex-col gap-1.5 text-[13px]">
                {dataDonat.map((d) => (
                  <li key={d.kode} className="flex items-center gap-2">
                    <span className="size-2.5 rounded-sm" style={{ background: d.warna }} />
                    <span className="flex-1">{d.nama}</span>
                    <b>{d.nilai}</b>
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ height: Math.max(120, perGedung.length * 26 + 30) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={perGedung} layout="vertical" margin={{ left: 0, right: 8, top: 4, bottom: 4 }} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="gedung" width={78} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  {['baik', 'perawatan', 'rusak', 'belum'].map((k) => (
                    <Bar key={k} dataKey={k} name={labelRuang(k)} stackId="a" fill={WARNA[k]} isAnimationActive={false} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Kotak>

          {/* Pemeliharaan (Sarpras) */}
          {peran === 'sarpras' && (
            <Kotak judul="Pemeliharaan" tautan={{ ke: '/pemeliharaan', teks: 'Buka' }}>
              <div className="grid grid-cols-4 gap-1.5 text-center">
                {[
                  ['Baru', 'baru', 'bg-bad-soft text-bad-ink'],
                  ['Verifikasi', 'verifikasi', 'bg-violet-50 text-violet-700'],
                  ['Siap', 'terverifikasi', 'bg-warn-soft text-warn-ink'],
                  ['Diproses', 'diproses', 'bg-sky-50 text-sky-700'],
                ].map(([l, s, g]) => (
                  <div key={s} className={`rounded-lg py-2 ${g}`}>
                    <p className="text-lg font-extrabold">{laporan.filter((x) => x.status === s).length}</p>
                    <p className="text-[11px] font-semibold">{l}</p>
                  </div>
                ))}
              </div>
              {tiketAktif.slice(0, 4).map((l) => (
                <Link key={l.id} to={`/pemeliharaan?id=${l.id}`} className="flex items-start gap-2.5 p-2.5 rounded-xl border border-line hover:bg-slate-50">
                  <span className={`mt-1 size-2.5 shrink-0 rounded-full ${{ tinggi: 'bg-bad', sedang: 'bg-warn', rendah: 'bg-slate-400' }[l.prioritas]}`} title={`Prioritas ${l.prioritas}`} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-bold truncate">{l.namaFasilitas} · {ruang.find((r) => r.id === l.ruangId)?.nama}</span>
                    <span className="block text-xs text-muted">#{l.id} · {l.jenis === 'preventif' ? 'pemeliharaan rutin' : `prioritas ${l.prioritas}`}</span>
                  </span>
                  <PilStatus status={l.status} />
                </Link>
              ))}
              {tiketAktif.length === 0 && <p className="text-sm text-muted">Tidak ada tiket aktif.</p>}
              {jadwalDekat.length > 0 && (
                <p className="text-xs text-sky-700 inline-flex items-center gap-1.5">
                  <CalendarClock size={14} /> {jadwalDekat.length} jadwal preventif jatuh tempo dalam 7 hari
                </p>
              )}
            </Kotak>
          )}

          {/* Kinerja inspeksi */}
          <Kotak judul="Rapid Inspection 7 Hari Terakhir" tautan={bisa('rapidInspection') ? { ke: '/rapid-inspection', teks: 'Inspeksi' } : null}>
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={inspeksi7Hari} margin={{ left: -28, right: 4, top: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="hari" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`${v} inspeksi`, 'Jumlah']} />
                  <Bar dataKey="jumlah" fill="#8f1d2c" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-3 text-[13px]">
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="text-muted">Cakupan 7 hari</span>
                  <b>{cakupanMinggu}/{ruangBerfasilitas.length} ruangan</b>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-ok rounded-full" style={{ width: persen(cakupanMinggu, ruangBerfasilitas.length).replace(',', '.') }} />
                </div>
              </div>
            </div>
            {bisa('rapidInspection') && belumDiinspeksi7Hari.length > 0 && (
              <p className="text-xs text-muted">
                Belum diinspeksi: {belumDiinspeksi7Hari.slice(0, 6).map((r) => r.nama).join(', ')}
                {belumDiinspeksi7Hari.length > 6 && `, dan ${belumDiinspeksi7Hari.length - 6} lainnya`}
              </p>
            )}
          </Kotak>

          {/* Fasilitas bermasalah (selain Sarpras) */}
          {peran !== 'sarpras' && (
            <Kotak judul="Fasilitas Bermasalah" tautan={{ ke: '/fasilitas', teks: 'Lihat semua' }}>
              {perluTindakan.slice(0, 5).map((f) => (
                <div key={f.id} className={`flex gap-3 items-start p-3 rounded-xl ${f.kondisi === 'rusak' ? 'bg-red-50' : f.kondisi === 'maintenance' ? 'bg-sky-50' : 'bg-amber-50'}`}>
                  <div className="flex-1">
                    <p className="text-sm font-bold">{ruang.find((r) => r.id === f.ruangId)?.nama} · {f.nama}</p>
                    <p className="text-xs text-muted">{f.jumlahRusak || f.jumlah} dari {f.jumlah} {f.satuan} · dicek {f.terakhirDicek}</p>
                  </div>
                  <StatusBadge status={f.kondisi} />
                </div>
              ))}
              {perluTindakan.length === 0 && (
                <p className="text-sm text-muted">{fasilitas.length === 0 ? 'Belum ada data fasilitas.' : 'Semua fasilitas dalam kondisi baik.'}</p>
              )}
            </Kotak>
          )}

          {/* Aktivitas terbaru */}
          <Kotak judul="Aktivitas Terbaru">
            {aktivitas.slice(0, 6).map((a, i) => (
              <div key={a.id ?? i} className="pb-2.5 border-b border-slate-100 last:border-0 last:pb-0">
                <p className="text-sm font-semibold">{a.teks}</p>
                <p className="text-xs text-muted">{a.oleh} · {a.waktu}</p>
              </div>
            ))}
            {aktivitas.length === 0 && <p className="text-sm text-muted">Belum ada aktivitas.</p>}
          </Kotak>
        </aside>
      </div>
    </>
  )
}

function Kotak({ judul, tautan, children }) {
  return (
    <section aria-label={judul} className="bg-white border border-line rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex justify-between items-center gap-2">
        <h2 className="text-lg font-extrabold">{judul}</h2>
        {tautan && (
          <Link to={tautan.ke} className="text-sm font-semibold text-primary inline-flex items-center gap-1">
            {tautan.teks} <ArrowRight size={14} />
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}
