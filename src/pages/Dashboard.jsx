import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, LayoutList, CheckCircle2, AlertTriangle, XCircle, Briefcase } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import Header from '../components/Header.jsx'
import InfoMuat from '../components/InfoMuat.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { tombolUtama, gayaInput } from '../components/Modal.jsx'
import { useData } from '../context/DataContext.jsx'
import { DAFTAR_KAMPUS, gedungDiKampus, teksLokasi } from '../data/konstanta.js'
import { useAuth } from '../context/AuthContext.jsx'


function persen(n, total) {
  if (!total) return '0%'
  return (Math.round((n / total) * 1000) / 10).toString().replace('.', ',') + '%'
}

export default function Dashboard() {
  const { ruang, fasilitas, aktivitas } = useData()
  const { bisa } = useAuth()
  const [kampus, setKampus] = useState('Semua')
  const [gedung, setGedung] = useState('Semua')
  const [cari, setCari] = useState('')

  const total = ruang.length
  const jumlah = (s) => ruang.filter((r) => r.status === s).length
  const nBaik = jumlah('baik')
  const nRawat = jumlah('perawatan')
  const nRusak = jumlah('rusak')
  const nBelum = jumlah('belum')

  const kartu = [
    { label: 'Total Ruangan', nilai: total, satuan: 'ruang', ikon: LayoutList, warna: 'bg-primary-soft text-primary' },
    { label: 'Kondisi Baik', nilai: nBaik, satuan: `ruang (${persen(nBaik, total)})`, ikon: CheckCircle2, warna: 'bg-ok-soft text-ok' },
    { label: 'Perlu Perawatan', nilai: nRawat, satuan: `ruang (${persen(nRawat, total)})`, ikon: AlertTriangle, warna: 'bg-warn-soft text-amber-700' },
    { label: 'Rusak', nilai: nRusak, satuan: `ruang (${persen(nRusak, total)})`, ikon: XCircle, warna: 'bg-bad-soft text-bad' },
    { label: 'Total Fasilitas', nilai: fasilitas.length, satuan: 'item', ikon: Briefcase, warna: 'bg-slate-100 text-slate-600' },
  ]

  const dataGrafik = [
    { nama: 'Baik', nilai: nBaik, warna: '#16a34a' },
    { nama: 'Perlu Perawatan', nilai: nRawat, warna: '#f59e0b' },
    { nama: 'Rusak', nilai: nRusak, warna: '#dc2626' },
    { nama: 'Belum Diinspeksi', nilai: nBelum, warna: '#94a3b8' },
  ].filter((d) => d.nilai > 0)

  const ruangTampil = useMemo(
    () =>
      ruang.filter(
        (r) =>
          (kampus === 'Semua' || r.kampus === kampus) &&
          (gedung === 'Semua' || r.gedung === gedung) &&
          r.nama.toLowerCase().includes(cari.toLowerCase()),
      ),
    [ruang, kampus, gedung, cari],
  )

  const perluTindakan = fasilitas
    .filter((f) => f.kondisi !== 'baik')
    .sort((a, b) => (a.kondisi === 'rusak' ? -1 : 1) - (b.kondisi === 'rusak' ? -1 : 1))

  return (
    <>
      <Header judul="Dashboard Monitoring" subjudul="Pemantauan kondisi ruangan dan fasilitas UISI secara real-time" />
      <InfoMuat />

      {/* Kartu ringkasan */}
      <section aria-label="Ringkasan" className="grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
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
        {/* Status per ruangan */}
        <section aria-label="Status ruangan" className="flex-[999_1_600px] min-w-0 bg-white border border-line rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold">Status Ruangan</h2>
            {bisa('kelolaData') && (
              <Link to="/ruangan" className={tombolUtama}>
                <Plus size={18} /> Tambah Ruangan
              </Link>
            )}
          </div>

          <div className="flex flex-wrap gap-2.5 items-center">
            <select
              aria-label="Filter kampus"
              value={kampus}
              onChange={(e) => {
                setKampus(e.target.value)
                setGedung('Semua')
              }}
              className={`${gayaInput} sm:w-40`}
            >
              <option value="Semua">Semua kampus</option>
              {DAFTAR_KAMPUS.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
            <select aria-label="Filter gedung" value={gedung} onChange={(e) => setGedung(e.target.value)} className={`${gayaInput} sm:w-40`}>
              <option value="Semua">Semua gedung</option>
              {gedungDiKampus(ruang, kampus).map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
            <label className="flex-[1_1_220px] flex items-center gap-2.5 min-h-11 px-3.5 border border-slate-200 rounded-xl text-muted">
              <Search size={18} />
              <input
                type="search"
                aria-label="Cari ruangan"
                placeholder="Cari nama ruangan..."
                value={cari}
                onChange={(e) => setCari(e.target.value)}
                className="flex-1 min-w-0 bg-transparent outline-none text-sm text-ink"
              />
            </label>
          </div>

          <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
            {ruangTampil.map((r) => (
              <Link
                key={r.id}
                to={`/ruangan?cari=${encodeURIComponent(r.nama)}`}
                className={`flex flex-col gap-2.5 p-3.5 border rounded-xl hover:border-primary hover:shadow-sm transition ${
                  r.baru ? 'border-ok bg-ok-soft/40' : 'border-line bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold">{r.nama}</p>
                    <p className="text-xs text-muted">
                      {teksLokasi(r)} · {r.jenis}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">{r.jumlahFasilitas} fasilitas</span>
                  {r.jumlahFasilitas > 0 && (
                    <span className={`px-2 py-0.5 rounded-md bg-slate-100 ${r.jumlahMasalah ? 'text-bad-ink' : 'text-ok-ink'}`}>
                      {r.jumlahMasalah ? `${r.jumlahMasalah} bermasalah` : 'Tidak ada masalah'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted">Inspeksi terakhir: {r.inspeksiTerakhir ?? 'belum ada'}</p>
              </Link>
            ))}
            {ruangTampil.length === 0 && <p className="text-sm text-muted">Tidak ada ruangan yang cocok.</p>}
          </div>
        </section>

        <aside className="flex-[1_1_320px] min-w-0 flex flex-col gap-5">
          {/* Grafik distribusi kondisi */}
          <section aria-label="Distribusi kondisi" className="bg-white border border-line rounded-2xl p-5">
            <h2 className="text-lg font-extrabold">Distribusi Kondisi Ruangan</h2>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={dataGrafik} dataKey="nilai" nameKey="nama" innerRadius="60%" outerRadius="90%" paddingAngle={dataGrafik.length > 1 ? 2 : 0}>
                    {dataGrafik.map((d) => (
                      <Cell key={d.nama} fill={d.warna} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [`${v} ruang`, n]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="flex flex-col gap-2 text-sm">
              {dataGrafik.map((d) => (
                <li key={d.nama} className="flex justify-between">
                  <span className="flex items-center gap-2">
                    <span className="size-2.5 rounded-sm" style={{ background: d.warna }} />
                    {d.nama}
                  </span>
                  <b>
                    {d.nilai} ruang ({persen(d.nilai, total)})
                  </b>
                </li>
              ))}
            </ul>
          </section>

          {/* Fasilitas yang perlu ditindaklanjuti */}
          <section aria-label="Perlu tindakan" className="bg-white border border-line rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-extrabold">Perlu Tindakan</h2>
              <Link to="/laporan" className="text-sm font-semibold text-primary">
                Lihat semua
              </Link>
            </div>
            {perluTindakan.slice(0, 5).map((f) => (
              <div key={f.id} className={`flex gap-3 items-start p-3 rounded-xl ${f.kondisi === 'rusak' ? 'bg-red-50' : 'bg-amber-50'}`}>
                <div className="flex-1">
                  <p className="text-sm font-bold">
                    R. {f.ruangId} · {f.nama}
                  </p>
                  <p className="text-xs text-muted">{f.jumlah} {f.satuan} · dicek {f.terakhirDicek}</p>
                </div>
                <StatusBadge status={f.kondisi} />
              </div>
            ))}
            {perluTindakan.length === 0 && (
              <p className="text-sm text-muted">
                {fasilitas.length === 0
                  ? 'Belum ada data fasilitas. Tambahkan lewat menu Data Fasilitas.'
                  : 'Semua fasilitas dalam kondisi baik.'}
              </p>
            )}
          </section>

          {/* Aktivitas terbaru */}
          <section aria-label="Aktivitas terbaru" className="bg-white border border-line rounded-2xl p-5 flex flex-col gap-3">
            <h2 className="text-lg font-extrabold">Aktivitas Terbaru</h2>
            {aktivitas.slice(0, 5).map((a, i) => (
              <div key={i} className="pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                <p className="text-sm font-semibold">{a.teks}</p>
                <p className="text-xs text-muted">
                  {a.oleh} · {a.waktu}
                </p>
              </div>
            ))}
          </section>
        </aside>
      </div>
    </>
  )
}
