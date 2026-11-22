import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, ChevronLeft, ChevronRight, CalendarDays, Info, ClipboardCheck, Users } from 'lucide-react'
import Header from '../components/Header.jsx'
import InfoMuat from '../components/InfoMuat.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import Modal, { gayaInput, tombolUtama, tombolKedua } from '../components/Modal.jsx'
import { useData } from '../context/DataContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { DAFTAR_KAMPUS, STATUS, LABEL_RUANG, gedungDiKampus, teksKapasitas, teksLokasi } from '../data/konstanta.js'

// Kolom jam seperti laman RuangUISI: 0-5 (tutup), 6 s.d. 20, 21-23 (tutup)
const JAM = Array.from({ length: 15 }, (_, i) => i + 6)

const WARNA_JADWAL = {
  peminjaman: 'bg-[#e5545f]',
  transisi: 'bg-[#f2c318]',
}

// Tanggal lokal dalam format YYYY-MM-DD
function keYmd(d) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}
function geserHari(ymd, n) {
  const d = new Date(`${ymd}T00:00:00`)
  d.setDate(d.getDate() + n)
  return keYmd(d)
}
const jam2 = (j) => `${String(j).padStart(2, '0')}.00`

// Ringkasan fasilitas bermasalah, contoh "AC 1/2 rusak · Proyektor maintenance"
function ringkasMasalah(daftar) {
  return daftar
    .filter((f) => f.kondisi !== 'baik')
    .map((f) => {
      const keadaan = { perawatan: 'bermasalah', rusak: 'rusak', maintenance: 'maintenance' }[f.kondisi]
      return f.jumlah > 1 ? `${f.nama} ${f.jumlahRusak || f.jumlah}/${f.jumlah} ${keadaan}` : `${f.nama} ${keadaan}`
    })
    .join(' · ')
}

export default function RuangUISI() {
  const { ruang, fasilitas, ambilJadwalRuangan } = useData()
  const [tanggal, setTanggal] = useState(() => keYmd(new Date()))
  const [jadwal, setJadwal] = useState(null)
  const [cari, setCari] = useState('')
  const [kampus, setKampus] = useState('Semua')
  const [gedung, setGedung] = useState('Semua')
  const [kondisi, setKondisi] = useState('Semua')
  const [dipilihId, setDipilihId] = useState(null)

  // Ambil jadwal setiap kali tanggal berganti
  useEffect(() => {
    let masihTerpasang = true
    ambilJadwalRuangan(tanggal).then((hasil) => {
      if (masihTerpasang) setJadwal(hasil.data)
    })
    return () => {
      masihTerpasang = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tanggal])

  const hariIni = keYmd(new Date())
  const jamSekarang = new Date().getHours()
  const judulTanggal = new Date(`${tanggal}T00:00:00`).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const ruangTampil = ruang.filter(
    (r) =>
      (kampus === 'Semua' || r.kampus === kampus) &&
      (gedung === 'Semua' || r.gedung === gedung) &&
      (kondisi === 'Semua' || r.status === kondisi) &&
      r.nama.toLowerCase().includes(cari.toLowerCase()),
  )

  // Isi setiap kotak jam: { jenis, blok } atau kosong
  function isiJam(ruangId, j) {
    const blok = (jadwal ?? []).find((b) => b.ruangId === ruangId && j >= b.jamMulai && j < b.jamSelesai)
    return blok ?? null
  }

  const dipilih = ruang.find((r) => r.id === dipilihId)
  const hitung = (k) => ruangTampil.filter((r) => r.status === k).length

  return (
    <>
      <Header judul="Ruang UISI" subjudul="Jadwal pemakaian ruangan beserta kondisi fasilitasnya, dari hasil Rapid Inspection" />
      <InfoMuat />

      <section className="bg-white border border-line rounded-2xl p-4 sm:p-5 flex flex-col gap-4">
        {/* Navigasi tanggal */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl sm:text-2xl font-extrabold capitalize">{judulTanggal}</h2>
          <div className="flex items-center gap-1.5">
            <button type="button" aria-label="Hari sebelumnya" onClick={() => setTanggal(geserHari(tanggal, -1))}
              className="size-10 grid place-items-center rounded-lg bg-[#2f6fb3] text-white hover:brightness-110"><ChevronLeft size={18} /></button>
            <button type="button" onClick={() => setTanggal(hariIni)} disabled={tanggal === hariIni}
              className="h-10 px-3 rounded-lg bg-[#2f6fb3] text-white text-sm font-semibold disabled:opacity-50">Hari ini</button>
            <button type="button" aria-label="Hari berikutnya" onClick={() => setTanggal(geserHari(tanggal, 1))}
              className="size-10 grid place-items-center rounded-lg bg-[#2f6fb3] text-white hover:brightness-110"><ChevronRight size={18} /></button>
            <label className="relative">
              <span className="sr-only">Pilih tanggal</span>
              <input type="date" value={tanggal} onChange={(e) => e.target.value && setTanggal(e.target.value)}
                className="h-10 px-2.5 rounded-lg border border-slate-300 text-sm" />
            </label>
          </div>
        </div>

        {/* Keterangan */}
        <div className="rounded-xl bg-[#f8e7a9] border-l-4 border-[#f2c318] px-4 py-3 text-[13px] text-slate-800 flex gap-2.5">
          <Info size={18} className="shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1.5">
            <p>
              Kolom <b>Kondisi</b> menunjukkan kondisi fasilitas ruangan dari Rapid Inspection terakhir. Periksa kondisinya sebelum memakai atau meminjam
              ruangan. Klik nama ruangan untuk melihat detail fasilitas.
            </p>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="inline-flex items-center gap-1.5"><span className={`size-3.5 rounded-sm ${WARNA_JADWAL.peminjaman}`} /> Peminjaman</span>
              <span className="inline-flex items-center gap-1.5"><span className={`size-3.5 rounded-sm ${WARNA_JADWAL.transisi}`} /> Jeda transisi antar-peminjam</span>
              <span className="inline-flex items-center gap-1.5"><span className="size-3.5 rounded-sm bg-slate-400/70" /> Di luar jam operasional</span>
              <span className="inline-flex items-center gap-1.5"><span className="size-3.5 rounded-sm border border-slate-300 bg-white" /> Kosong</span>
            </p>
            <p className="text-xs text-slate-600">Jadwal yang tampil masih data contoh untuk keperluan pengujian.</p>
          </div>
        </div>

        {/* Filter */}
        <div className="grid gap-2 grid-cols-2 lg:grid-cols-[1fr_150px_150px_200px]">
          <label className="relative col-span-2 lg:col-span-1">
            <span className="sr-only">Cari ruangan</span>
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input className={`${gayaInput} pl-9`} value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari ruangan, contoh: G4 - R1" />
          </label>
          <select aria-label="Filter kampus" className={gayaInput} value={kampus} onChange={(e) => { setKampus(e.target.value); setGedung('Semua') }}>
            <option value="Semua">Semua kampus</option>
            {DAFTAR_KAMPUS.map((k) => <option key={k}>{k}</option>)}
          </select>
          <select aria-label="Filter gedung" className={gayaInput} value={gedung} onChange={(e) => setGedung(e.target.value)}>
            <option value="Semua">Semua gedung</option>
            {gedungDiKampus(ruang, kampus).map((g) => <option key={g}>{g}</option>)}
          </select>
          <select aria-label="Filter kondisi" className={`${gayaInput} col-span-2 lg:col-span-1`} value={kondisi} onChange={(e) => setKondisi(e.target.value)}>
            <option value="Semua">Semua kondisi</option>
            {['baik', 'perawatan', 'rusak', 'belum'].map((k) => <option key={k} value={k}>{LABEL_RUANG[k] ?? STATUS[k].label}</option>)}
          </select>
        </div>

        <p className="text-[13px] text-muted">
          {ruangTampil.length} ruangan · <b className="text-ok-ink">{hitung('baik')} baik</b> · <b className="text-warn-ink">{hitung('perawatan')} bermasalah</b> ·{' '}
          <b className="text-bad-ink">{hitung('rusak')} tidak dapat digunakan</b> · {hitung('belum')} belum diinspeksi
        </p>

        {/* Tabel jadwal + kondisi */}
        <div className="overflow-x-auto -mx-4 sm:-mx-5 px-4 sm:px-5">
          <table className="w-full min-w-[1080px] border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#555f66] text-white">
                <th className="sticky left-0 z-10 bg-[#555f66] px-3 py-2.5 text-center font-bold min-w-44">Ruangan</th>
                <th className="px-3 py-2.5 font-bold min-w-24">Kapasitas</th>
                <th className="px-3 py-2.5 font-bold min-w-56">Kondisi</th>
                <th className="px-1 py-2.5 font-bold min-w-12 border-l border-white/20">0 - 5</th>
                {JAM.map((j) => (
                  <th key={j} className={`px-1 py-2.5 font-bold min-w-8 border-l border-white/20 ${tanggal === hariIni && j === jamSekarang ? 'bg-primary' : ''}`}>{j}</th>
                ))}
                <th className="px-1 py-2.5 font-bold min-w-14 border-l border-white/20">21 - 23</th>
              </tr>
            </thead>
            <tbody>
              {ruangTampil.map((r) => {
                const milik = fasilitas.filter((f) => f.ruangId === r.id)
                const masalah = ringkasMasalah(milik)
                const tidakDipakai = r.status === 'rusak'
                return (
                  <tr key={r.id} className={`border-b border-slate-200 ${tidakDipakai ? 'bg-bad-soft/40' : ''}`}>
                    <td className={`sticky left-0 z-10 px-3 py-2 text-center border-r border-slate-200 ${tidakDipakai ? 'bg-[#fdf1f1]' : 'bg-white'}`}>
                      <button type="button" onClick={() => setDipilihId(r.id)} className="text-[#2f6fb3] hover:underline font-medium">
                        {r.nama}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-center whitespace-nowrap border-r border-slate-200">{teksKapasitas(r)}</td>
                    <td className="px-3 py-2 border-r border-slate-200">
                      <button type="button" onClick={() => setDipilihId(r.id)} className="flex flex-col items-start gap-1 text-left">
                        <StatusBadge status={r.status} ruang />
                        {masalah && <span className="text-[11px] text-slate-600 leading-snug">{masalah}</span>}
                      </button>
                    </td>
                    <td className="bg-slate-400/70 border-r border-white" />
                    {JAM.map((j) => {
                      const blok = isiJam(r.id, j)
                      return (
                        <td key={j}
                          title={blok ? `${jam2(blok.jamMulai)}–${jam2(blok.jamSelesai)} · ${blok.jenis === 'transisi' ? 'Jeda transisi' : [blok.kegiatan, blok.peminjam].filter(Boolean).join(' · ')}` : `${jam2(j)} kosong`}
                          className={`h-11 border border-slate-200 ${blok ? WARNA_JADWAL[blok.jenis] : ''} ${tanggal === hariIni && j === jamSekarang ? 'outline-2 -outline-offset-2 outline-primary' : ''}`}
                        />
                      )
                    })}
                    <td className="bg-slate-400/70 border-l border-white" />
                  </tr>
                )
              })}
              {ruangTampil.length === 0 && (
                <tr><td colSpan={JAM.length + 5} className="py-8 text-center text-muted">Ruangan tidak ditemukan.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {jadwal === null && <p className="text-sm text-muted">Memuat jadwal…</p>}
      </section>

      {dipilih && <DetailRuang r={dipilih} tanggal={tanggal} judulTanggal={judulTanggal} jadwal={(jadwal ?? []).filter((b) => b.ruangId === dipilih.id)} tutup={() => setDipilihId(null)} />}
    </>
  )
}

// ===== Detail kondisi satu ruangan =====
function DetailRuang({ r, judulTanggal, jadwal, tutup }) {
  const { fasilitas } = useData()
  const { bisa } = useAuth()
  const milik = fasilitas.filter((f) => f.ruangId === r.id)
  const peminjaman = jadwal.filter((b) => b.jenis === 'peminjaman')

  return (
    <Modal
      judul={r.nama}
      keterangan={`${teksLokasi(r)} · ${r.jenis} · Kapasitas ${teksKapasitas(r)}`}
      tutup={tutup}
      footer={
        <>
          {bisa('rapidInspection') && (
            <Link to={`/rapid-inspection?ruang=${r.id}`} className={`${tombolKedua} mr-auto`}>
              <ClipboardCheck size={17} /> Inspeksi ruangan ini
            </Link>
          )}
          <button type="button" onClick={tutup} className={tombolUtama}>Tutup</button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={r.status} ruang />
          <span className="text-[13px] text-muted">Inspeksi terakhir: {r.inspeksiTerakhir ?? 'belum ada'}</span>
        </div>
        {r.status === 'rusak' && (
          <p className="text-[13px] bg-bad-soft text-bad-ink rounded-xl px-3.5 py-2.5 font-semibold">
            Ruangan ini sedang tidak dapat digunakan karena ada fasilitas yang rusak seluruh unitnya. Hubungi Sarana Prasarana sebelum memakai ruangan.
          </p>
        )}

        <div className="flex flex-col gap-2">
          <h3 className="font-extrabold">Kondisi fasilitas</h3>
          {milik.length === 0 ? (
            <p className="text-sm text-muted">Belum ada data fasilitas untuk ruangan ini.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-slate-100 border border-line rounded-xl">
              {milik.map((f) => (
                <li key={f.id} className="flex items-start justify-between gap-3 px-3.5 py-2.5">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{f.nama}</p>
                    <p className="text-xs text-muted">
                      {f.jumlah} {f.satuan}
                      {f.kondisi !== 'baik' && ` · ${f.jumlahRusak || f.jumlah} ${STATUS[f.kondisi].label.toLowerCase()}`}
                      {f.catatan && f.kondisi !== 'baik' && ` · ${f.catatan}`}
                    </p>
                  </div>
                  <StatusBadge status={f.kondisi} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="font-extrabold inline-flex items-center gap-2"><CalendarDays size={17} /> Jadwal {judulTanggal}</h3>
          {peminjaman.length === 0 ? (
            <p className="text-sm text-muted">Tidak ada peminjaman pada tanggal ini.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {peminjaman.map((b) => (
                <li key={b.id} className="flex items-center gap-3 text-sm">
                  <span className={`w-2 self-stretch rounded-full ${WARNA_JADWAL.peminjaman}`} />
                  <b className="w-28 shrink-0">{jam2(b.jamMulai)}–{jam2(b.jamSelesai)}</b>
                  <span className="min-w-0">
                    {b.kegiatan ?? 'Peminjaman'}
                    {b.peminjam && <span className="text-muted inline-flex items-center gap-1 ml-1.5"><Users size={13} /> {b.peminjam}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  )
}
