import { useEffect, useState } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import {
  CalendarRange, FileSpreadsheet, Printer, Building2, ScanSearch, Percent, Timer, AlertTriangle, CheckCircle2,
  History, BarChart3, Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Wrench,
} from 'lucide-react'
import Header from '../components/Header.jsx'
import InfoMuat from '../components/InfoMuat.jsx'
import { gayaInput, gayaLabel, tombolUtama, tombolKedua } from '../components/Modal.jsx'
import { useData } from '../context/DataContext.jsx'
import { useAuth, NAMA_PERAN } from '../context/AuthContext.jsx'
import { DAFTAR_KAMPUS, STATUS, LABEL_RUANG, gedungDiKampus } from '../data/konstanta.js'

// ===================== Fungsi bantu =====================

const HARI = 86400000
const angka = (n, d = 1) => (Math.round(n * 10 ** d) / 10 ** d).toString().replace('.', ',')
const persen = (a, b) => (b ? `${angka((a / b) * 100)}%` : '0%')
const tglPendek = (d) => d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
const tglPanjang = (d) => d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
const waktuLengkap = (iso) =>
  new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const rupiah = (n) =>
  n === null || n === undefined ? '-' : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
const keInputTanggal = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)

function teksDurasiJam(jam) {
  if (jam === null) return '-'
  if (jam < 1) return `${Math.max(1, Math.round(jam * 60))} menit`
  if (jam < 48) return `${angka(jam)} jam`
  return `${angka(jam / 24)} hari`
}

// Rentang tanggal dari pilihan periode
function hitungRentang(periode, dariKustom, sampaiKustom) {
  const sekarang = new Date()
  const awalHari = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const akhirHari = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
  switch (periode) {
    case 'hari':
      return [awalHari(sekarang), akhirHari(sekarang)]
    case 'minggu':
      return [awalHari(new Date(sekarang - 6 * HARI)), akhirHari(sekarang)]
    case 'bulan':
      return [new Date(sekarang.getFullYear(), sekarang.getMonth(), 1), akhirHari(sekarang)]
    case 'bulanLalu':
      return [new Date(sekarang.getFullYear(), sekarang.getMonth() - 1, 1), akhirHari(new Date(sekarang.getFullYear(), sekarang.getMonth(), 0))]
    case 'semua':
      return [new Date(2020, 0, 1), akhirHari(sekarang)]
    default: {
      const dari = dariKustom ? new Date(`${dariKustom}T00:00:00`) : awalHari(sekarang)
      const sampai = sampaiKustom ? new Date(`${sampaiKustom}T23:59:59.999`) : akhirHari(sekarang)
      return dari <= sampai ? [dari, sampai] : [sampai, dari]
    }
  }
}

const PILIHAN_PERIODE = [
  ['hari', 'Hari ini'],
  ['minggu', '7 hari terakhir'],
  ['bulan', 'Bulan ini'],
  ['bulanLalu', 'Bulan lalu'],
  ['semua', 'Semua waktu'],
  ['kustom', 'Rentang tanggal…'],
]

// Warna grafik (sesuai token warna aplikasi)
const WARNA = { baik: '#16a34a', perawatan: '#f59e0b', rusak: '#dc2626', belum: '#94a3b8', maintenance: '#0ea5e9', utama: '#8f1d2c' }

const HASIL_RUANGAN = { baik: 'Baik', bermasalah: 'Bermasalah', tidak_dapat_digunakan: 'Tidak Dapat Digunakan' }
const STATUS_LAPORAN = { baru: 'Baru', verifikasi: 'Verifikasi', terverifikasi: 'Terverifikasi', diproses: 'Diproses', selesai: 'Selesai', ditolak: 'Ditolak' }
const BELUM_SELESAI = ['baru', 'verifikasi', 'terverifikasi', 'diproses']

// ===================== Log: teks yang mudah dibaca =====================

const MODUL = {
  ruangan: 'Ruangan',
  fasilitas: 'Fasilitas',
  unit: 'Unit Fasilitas',
  inspeksi: 'Rapid Inspection',
  laporan: 'Kerusakan & Pemeliharaan',
  pengguna: 'Pengguna',
}

const LABEL_KOLOM = {
  nama: 'Nama', kondisi: 'Kondisi', jumlah: 'Jumlah', jumlah_rusak: 'Jumlah bermasalah', catatan: 'Catatan', kategori: 'Kategori',
  satuan: 'Satuan', kode_aset: 'Kode aset', lacak_per_unit: 'Dicatat per unit', posisi: 'Posisi', merek: 'Merek', model: 'Model',
  spesifikasi: 'Spesifikasi', nomor_seri: 'Nomor seri', tahun_pengadaan: 'Tahun pengadaan', status: 'Status', tindak_lanjut: 'Tindak lanjut',
  penangan: 'Penangan', peran: 'Peran', aktif: 'Aktif', kapasitas: 'Kapasitas', satuan_kapasitas: 'Satuan kapasitas', jenis: 'Jenis',
  lantai: 'Lantai', luas: 'Luas', penanggung_jawab: 'Penanggung jawab', deskripsi: 'Deskripsi', gedung: 'Gedung', ruangan: 'Ruangan',
  kampus: 'Kampus', kondisi_ruangan: 'Kondisi ruangan', foto: 'Foto', inspeksi_id: 'Inspeksi', selesai_pada: 'Selesai pada',
  diproses_pada: 'Diproses pada', urutan: 'Urutan', email: 'Email', prioritas: 'Prioritas', petugas_verifikasi: 'Petugas verifikasi',
  hasil_verifikasi: 'Hasil verifikasi', catatan_verifikasi: 'Catatan verifikasi', foto_verifikasi: 'Foto verifikasi', diverifikasi_oleh: 'Diverifikasi oleh',
  diverifikasi_pada: 'Diverifikasi pada', ditugaskan_pada: 'Ditugaskan pada', jenis_tindakan: 'Jenis tindakan', teknisi: 'Teknisi',
  target_selesai: 'Target selesai', estimasi_biaya: 'Estimasi biaya', biaya_aktual: 'Biaya aktual', hasil_perbaikan: 'Hasil perbaikan',
  foto_sesudah: 'Foto sesudah',
}
const KOLOM_DISEMBUNYIKAN = ['id', 'ruangan_id', 'fasilitas_id', 'pelapor_id', 'pemeriksa_id', 'pengguna_id', 'oleh_id', 'petugas_verifikasi_id', 'jadwal_id']

function nilaiLog(kolom, v) {
  if (v === null || v === undefined || v === '') return '-'
  if (kolom === 'kondisi') return STATUS[v]?.label ?? v
  if (kolom === 'kondisi_ruangan') return HASIL_RUANGAN[v] ?? v
  if (kolom === 'status') return STATUS_LAPORAN[v] ?? v
  if (kolom === 'peran') return NAMA_PERAN[v] ?? v
  if (kolom === 'foto' || kolom.startsWith('foto_')) return `${v.length} foto`
  if (kolom === 'hasil_verifikasi') return v === 'valid' ? 'Kerusakan benar ada' : 'Bukan kerusakan'
  if (kolom === 'estimasi_biaya' || kolom === 'biaya_aktual') return rupiah(v)
  if (kolom.endsWith('_pada')) return waktuLengkap(v)
  if (typeof v === 'boolean') return v ? 'Ya' : 'Tidak'
  return String(v)
}

// Kalimat kegiatan, contoh "Melakukan inspeksi" / "Mengubah"
function teksAksi(log) {
  if (log.modul === 'inspeksi' && log.aksi === 'tambah') return 'Melakukan inspeksi'
  if (log.modul === 'laporan' && log.aksi === 'tambah') return log.data_baru?.jenis === 'preventif' ? 'Membuat tiket pemeliharaan rutin' : 'Membuat tiket kerusakan'
  if (log.modul === 'laporan' && log.data_baru?.status) return `Mengubah status tiket menjadi ${STATUS_LAPORAN[log.data_baru.status] ?? log.data_baru.status}`
  return { tambah: 'Menambah', ubah: 'Mengubah', hapus: 'Menghapus' }[log.aksi] ?? log.aksi
}

// Rincian perubahan, contoh ["Kondisi: Baik → Rusak", "Jumlah bermasalah: 0 → 1"]
function rincianLog(log) {
  const baru = log.data_baru ?? {}
  const lama = log.data_lama ?? {}
  if (log.aksi === 'ubah') {
    return Object.keys(baru)
      .filter((k) => !KOLOM_DISEMBUNYIKAN.includes(k))
      .map((k) => `${LABEL_KOLOM[k] ?? k}: ${nilaiLog(k, lama[k])} → ${nilaiLog(k, baru[k])}`)
  }
  if (log.modul === 'inspeksi') {
    return [
      `Hasil: ${nilaiLog('kondisi_ruangan', baru.kondisi_ruangan)}`,
      baru.durasi_detik ? `Durasi: ${angka(baru.durasi_detik / 60)} menit` : null,
      baru.foto?.length ? `Foto: ${baru.foto.length}` : null,
      baru.catatan ? `Catatan: ${baru.catatan}` : null,
    ].filter(Boolean)
  }
  if (log.modul === 'laporan') {
    return [
      `${nilaiLog('kondisi', baru.kondisi)} ${baru.jumlah ?? ''} unit`,
      baru.sumber === 'inspeksi' ? 'Dari Rapid Inspection' : 'Laporan manual',
      baru.catatan ? `Keterangan: ${baru.catatan}` : null,
    ].filter(Boolean)
  }
  const data = log.aksi === 'hapus' ? lama : baru
  return ['kode_aset', 'jumlah', 'satuan', 'kondisi', 'kategori', 'jenis', 'kapasitas', 'peran', 'email']
    .filter((k) => data[k] !== undefined && data[k] !== null && data[k] !== '')
    .map((k) => `${LABEL_KOLOM[k]}: ${nilaiLog(k, data[k])}`)
}

// ===================== Halaman =====================

export default function Laporan() {
  const { ruang, fasilitas, inspeksi, laporan, ambilLog } = useData()
  const { pengguna } = useAuth()
  const [tab, setTab] = useState('rekap')

  // Filter (dipakai di Rekap dan Log)
  const [periode, setPeriode] = useState('bulan')
  const [dariKustom, setDariKustom] = useState(() => keInputTanggal(new Date(Date.now() - 29 * HARI)))
  const [sampaiKustom, setSampaiKustom] = useState(() => keInputTanggal(new Date()))
  const [kampus, setKampus] = useState('Semua')
  const [gedung, setGedung] = useState('Semua')
  const [dari, sampai] = hitungRentang(periode, dariKustom, sampaiKustom)
  const kunciRentang = `${dari.toISOString()}|${sampai.toISOString()}`

  // Log diambil dari database setiap kali rentang tanggal berubah
  const [log, setLog] = useState(null)
  const [galatLog, setGalatLog] = useState('')
  useEffect(() => {
    let masihTerpasang = true
    const [d, s] = kunciRentang.split('|').map((x) => new Date(x))
    ambilLog(d, s).then((hasil) => {
      if (!masihTerpasang) return
      setLog(hasil.data)
      setGalatLog(hasil.error ? `Log gagal dimuat: ${hasil.error}` : '')
    })
    return () => {
      masihTerpasang = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kunciRentang])

  // ----- Penyaring data -----
  const ruangById = Object.fromEntries(ruang.map((r) => [r.id, r]))
  const fasilitasById = Object.fromEntries(fasilitas.map((f) => [f.id, f]))
  const cocokLokasi = (ruangId) => {
    const r = ruangById[ruangId]
    if (!r) return kampus === 'Semua' && gedung === 'Semua'
    return (kampus === 'Semua' || r.kampus === kampus) && (gedung === 'Semua' || r.gedung === gedung)
  }
  const dalamPeriode = (iso) => {
    const t = new Date(iso)
    return t >= dari && t <= sampai
  }

  const ruangDipantau = ruang.filter((r) => cocokLokasi(r.id))
  const ruangBerfasilitas = ruangDipantau.filter((r) => r.jumlahFasilitas > 0)

  // ----- Kondisi ruangan (saat ini) -----
  const kondisiRuang = ['baik', 'perawatan', 'rusak', 'belum'].map((k) => ({
    kode: k,
    nama: k === 'belum' ? 'Belum Diinspeksi' : LABEL_RUANG[k] ?? STATUS[k].label,
    nilai: ruangDipantau.filter((r) => r.status === k).length,
    warna: WARNA[k],
  }))
  const daftarGedungRekap = [...new Set(ruangDipantau.map((r) => r.gedung))].sort()
  const kondisiPerGedung = daftarGedungRekap.map((g) => {
    const milik = ruangDipantau.filter((r) => r.gedung === g)
    const n = (k) => milik.filter((r) => r.status === k).length
    return { gedung: g, total: milik.length, baik: n('baik'), perawatan: n('perawatan'), rusak: n('rusak'), belum: n('belum') }
  })

  // ----- Kinerja inspeksi (dalam periode) -----
  const inspeksiPeriode = inspeksi.filter((i) => dalamPeriode(i.waktuAsli) && cocokLokasi(i.ruangId))
  const ruangTerinspeksi = new Set(inspeksiPeriode.map((i) => i.ruangId))
  const cakupanTerinspeksi = ruangBerfasilitas.filter((r) => ruangTerinspeksi.has(r.id)).length
  const durasi = inspeksiPeriode.map((i) => i.durasiDetik).filter((d) => d > 0)
  const rataMenit = durasi.length ? durasi.reduce((a, b) => a + b, 0) / durasi.length / 60 : null
  const inspeksiPerPeran = ['dosen', 'pktl', 'sarpras'].map((p) => ({
    peran: NAMA_PERAN[p],
    jumlah: inspeksiPeriode.filter((i) => i.peran === p).length,
  }))
  const hasilInspeksi = Object.entries(HASIL_RUANGAN).map(([k, label]) => ({
    label,
    jumlah: inspeksiPeriode.filter((i) => i.kondisiRuangan === k).length,
  }))
  // Grafik per hari (maks. 31 hari terakhir dari rentang)
  const jumlahHari = Math.min(31, Math.max(1, Math.ceil((sampai - dari) / HARI)))
  const inspeksiPerHari = Array.from({ length: jumlahHari }, (_, i) => {
    const hari = new Date(sampai.getFullYear(), sampai.getMonth(), sampai.getDate() - (jumlahHari - 1 - i))
    return {
      tanggal: tglPendek(hari),
      jumlah: inspeksiPeriode.filter((x) => new Date(x.waktuAsli).toDateString() === hari.toDateString()).length,
    }
  })

  // ----- Kerusakan & pemeliharaan (tiket dibuat dalam periode) -----
  const tiketPeriode = laporan.filter((l) => dalamPeriode(l.dibuatAsli) && cocokLokasi(l.ruangId))
  const laporanPeriode = tiketPeriode.filter((l) => l.jenis !== 'preventif') // temuan kerusakan (korektif)
  const preventifPeriode = tiketPeriode.filter((l) => l.jenis === 'preventif')
  const biayaAktual = tiketPeriode.filter((l) => l.status === 'selesai').reduce((n, l) => n + (l.biayaAktual ?? 0), 0)
  const kelompokkan = (kunci) => {
    const hasil = {}
    laporanPeriode.forEach((l) => {
      const k = kunci(l)
      hasil[k] = (hasil[k] ?? 0) + 1
    })
    return Object.entries(hasil)
      .map(([nama, jumlah]) => ({ nama, jumlah }))
      .sort((a, b) => b.jumlah - a.jumlah)
  }
  const kerusakanPerKategori = kelompokkan((l) => fasilitasById[l.fasilitasId]?.kategori ?? 'Lainnya')
  const kerusakanPerGedung = kelompokkan((l) => ruangById[l.ruangId]?.gedung ?? '-')
  const palingSeringRusak = kelompokkan((l) => `${l.namaFasilitas} · ${ruangById[l.ruangId]?.nama ?? '-'}`).slice(0, 5)
  const jenisPalingSeringRusak = kelompokkan((l) => l.namaFasilitas).slice(0, 5)

  const hitungStatus = (s) => laporanPeriode.filter((l) => l.status === s).length
  const lamaSelesai = laporanPeriode
    .filter((l) => l.status === 'selesai' && l.selesaiAsli)
    .map((l) => (new Date(l.selesaiAsli) - new Date(l.dibuatAsli)) / 3600000)
  const rataSelesaiJam = lamaSelesai.length ? lamaSelesai.reduce((a, b) => a + b, 0) / lamaSelesai.length : null

  const kartu = [
    { label: 'Ruangan Dipantau', nilai: ruangDipantau.length, ket: `${ruangBerfasilitas.length} punya data fasilitas`, ikon: Building2, warna: 'bg-primary-soft text-primary' },
    { label: 'Inspeksi', nilai: inspeksiPeriode.length, ket: `${ruangTerinspeksi.size} ruangan berbeda`, ikon: ScanSearch, warna: 'bg-sky-50 text-sky-700' },
    { label: 'Cakupan Inspeksi', nilai: persen(cakupanTerinspeksi, ruangBerfasilitas.length), ket: `${cakupanTerinspeksi} dari ${ruangBerfasilitas.length} ruangan`, ikon: Percent, warna: 'bg-ok-soft text-ok' },
    { label: 'Rata-rata Waktu Inspeksi', nilai: rataMenit === null ? '-' : `${angka(rataMenit)} mnt`, ket: 'per ruangan', ikon: Timer, warna: 'bg-slate-100 text-slate-600' },
    { label: 'Temuan Kerusakan', nilai: laporanPeriode.length, ket: `${laporanPeriode.filter((l) => BELUM_SELESAI.includes(l.status)).length} belum selesai`, ikon: AlertTriangle, warna: 'bg-warn-soft text-amber-700' },
    { label: 'Selesai Diperbaiki', nilai: hitungStatus('selesai'), ket: `rata-rata ${teksDurasiJam(rataSelesaiJam)}`, ikon: CheckCircle2, warna: 'bg-ok-soft text-ok' },
  ]

  const teksPeriode = `${tglPanjang(dari)} – ${tglPanjang(sampai)}`
  const teksLokasi = [kampus === 'Semua' ? 'Semua kampus' : kampus, gedung === 'Semua' ? 'semua gedung' : `Gedung ${gedung}`].join(', ')

  // ----- Log yang sudah disaring lokasi -----
  const logLokasi = (log ?? []).filter((x) => (x.ruangan_id ? cocokLokasi(String(x.ruangan_id)) : kampus === 'Semua' && gedung === 'Semua'))

  // ===================== Unduh Excel =====================
  const [mengunduh, setMengunduh] = useState(false)
  async function unduhExcel() {
    setMengunduh(true)
    try {
      const { default: tulisExcel } = await import('write-excel-file/browser')
      const judul = (teks) => ({ value: teks, fontWeight: 'bold' })
      const baris = (...isi) => isi.map((v) => (v === null || v === undefined ? null : { value: v }))

      const ringkasan = [
        [judul('Laporan Monitoring Kondisi Fasilitas'), null],
        baris('Periode', teksPeriode),
        baris('Lokasi', teksLokasi),
        baris('Dibuat oleh', `${pengguna?.nama} (${NAMA_PERAN[pengguna?.peran]})`),
        baris('Dibuat pada', waktuLengkap(new Date().toISOString())),
        [null, null],
        [judul('Indikator'), judul('Nilai')],
        ...kartu.map((k) => baris(k.label, `${k.nilai} (${k.ket})`)),
        [null, null],
        [judul('Kondisi ruangan saat ini'), judul('Jumlah')],
        ...kondisiRuang.map((k) => baris(k.nama, k.nilai)),
        [null, null],
        [judul('Status tiket kerusakan'), judul('Jumlah')],
        ...Object.entries(STATUS_LAPORAN).map(([k, label]) => baris(label, hitungStatus(k))),
        baris('Rata-rata waktu penyelesaian', teksDurasiJam(rataSelesaiJam)),
        baris('Tiket pemeliharaan rutin (preventif)', preventifPeriode.length),
        baris('Total biaya pemeliharaan (selesai)', rupiah(biayaAktual)),
        [null, null],
        [judul('Fasilitas paling sering rusak'), judul('Jumlah laporan')],
        ...palingSeringRusak.map((x) => baris(x.nama, x.jumlah)),
      ]

      const lembarRuangan = [
        ['Kampus', 'Gedung', 'Ruangan', 'Kondisi', 'Jumlah fasilitas', 'Fasilitas bermasalah', 'Inspeksi terakhir'].map(judul),
        ...ruangDipantau.map((r) =>
          baris(r.kampus, r.gedung, r.nama, r.status === 'belum' ? 'Belum Diinspeksi' : LABEL_RUANG[r.status] ?? STATUS[r.status].label,
            r.jumlahFasilitas, r.jumlahMasalah, r.inspeksiTerakhir ?? '-'),
        ),
      ]

      const lembarInspeksi = [
        ['Waktu', 'Ruangan', 'Pemeriksa', 'Peran', 'Hasil', 'Durasi (menit)', 'Foto', 'Catatan'].map(judul),
        ...inspeksiPeriode.map((i) =>
          baris(i.waktu, ruangById[i.ruangId]?.nama ?? '-', i.pemeriksa, NAMA_PERAN[i.peran] ?? i.peran, HASIL_RUANGAN[i.kondisiRuangan] ?? '-',
            i.durasiDetik ? Math.round((i.durasiDetik / 60) * 10) / 10 : null, i.foto.length, i.catatan || '-'),
        ),
      ]

      const lembarKerusakan = [
        ['No.', 'Jenis', 'Dibuat', 'Ruangan', 'Fasilitas', 'Kategori', 'Kondisi', 'Jumlah', 'Sumber', 'Prioritas', 'Status', 'Verifikasi', 'Teknisi', 'Target', 'Hasil / tindak lanjut', 'Selesai', 'Lama penyelesaian (jam)', 'Biaya aktual (Rp)'].map(judul),
        ...tiketPeriode.map((l) =>
          baris(Number(l.id), l.jenis === 'preventif' ? 'Preventif' : 'Korektif', l.dibuat, ruangById[l.ruangId]?.nama ?? '-', l.namaFasilitas,
            fasilitasById[l.fasilitasId]?.kategori ?? '-', l.kondisi ? STATUS[l.kondisi].label : '-', l.jumlah,
            { inspeksi: 'Rapid Inspection', jadwal: 'Jadwal preventif', manual: 'Manual' }[l.sumber], l.prioritas, STATUS_LAPORAN[l.status],
            l.diverifikasiOleh ? `${l.hasilVerifikasi === 'valid' ? 'Valid' : 'Bukan kerusakan'} (${l.diverifikasiOleh})` : '-',
            l.teknisi || '-', l.targetSelesai ?? '-', l.hasilPerbaikan || l.tindakLanjut || '-', l.selesai || '-',
            l.status === 'selesai' && l.selesaiAsli ? Math.round(((new Date(l.selesaiAsli) - new Date(l.dibuatAsli)) / 3600000) * 10) / 10 : null,
            l.biayaAktual),
        ),
      ]

      const lembarLog = [
        ['Waktu', 'Pengguna', 'Peran', 'Modul', 'Kegiatan', 'Data', 'Rincian'].map(judul),
        ...logLokasi.map((x) =>
          baris(waktuLengkap(x.waktu), x.nama_pengguna, NAMA_PERAN[x.peran] ?? x.peran ?? '-', MODUL[x.modul] ?? x.modul, teksAksi(x),
            x.objek, rincianLog(x).join('; ') || '-'),
        ),
      ]

      const lebar = (...w) => w.map((width) => ({ width }))
      await tulisExcel([
        { data: ringkasan, sheet: 'Ringkasan', columns: lebar(34, 50) },
        { data: lembarRuangan, sheet: 'Kondisi Ruangan', columns: lebar(10, 10, 28, 22, 16, 18, 30), stickyRowsCount: 1 },
        { data: lembarInspeksi, sheet: 'Inspeksi', columns: lebar(20, 22, 20, 18, 22, 14, 8, 30), stickyRowsCount: 1 },
        { data: lembarKerusakan, sheet: 'Pemeliharaan', columns: lebar(6, 10, 20, 16, 18, 12, 12, 8, 16, 10, 13, 26, 18, 12, 32, 20, 14, 16), stickyRowsCount: 1 },
        { data: lembarLog, sheet: 'Log Riwayat', columns: lebar(20, 20, 16, 22, 26, 36, 60), stickyRowsCount: 1 },
      ]).toFile(`Laporan Fasilitas ${keInputTanggal(dari)} sd ${keInputTanggal(sampai)}.xlsx`)
    } finally {
      setMengunduh(false)
    }
  }

  // ===================== Cetak / simpan PDF =====================
  function cetak() {
    const esc = (t) => String(t ?? '-').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
    const tabel = (kepala, isi) =>
      `<table><thead><tr>${kepala.map((k) => `<th>${esc(k)}</th>`).join('')}</tr></thead><tbody>${
        isi.length ? isi.map((b) => `<tr>${b.map((v) => `<td>${esc(v)}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${kepala.length}">Tidak ada data</td></tr>`
      }</tbody></table>`

    const html = `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>Laporan Monitoring Fasilitas</title>
<style>
  body{font-family:Inter,Arial,sans-serif;color:#0f172a;margin:32px;font-size:12px}
  h1{font-size:20px;margin:0;color:#6e1421} h2{font-size:14px;margin:22px 0 8px;color:#6e1421;border-bottom:2px solid #8f1d2c;padding-bottom:4px}
  .meta{color:#475569;margin:4px 0 0} .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px}
  .kartu{border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px} .kartu b{display:block;font-size:18px}
  .kartu span{color:#64748b;font-size:11px} table{width:100%;border-collapse:collapse;margin-top:4px}
  th,td{border:1px solid #e2e8f0;padding:5px 7px;text-align:left;vertical-align:top} th{background:#fbecee}
  .dua{display:grid;grid-template-columns:1fr 1fr;gap:16px} .kaki{margin-top:28px;color:#64748b;font-size:11px}
  @media print{body{margin:12mm} h2{break-after:avoid} tr{break-inside:avoid}}
</style></head><body>
<h1>Laporan Monitoring Kondisi Fasilitas</h1>
<p class="meta">Periode: <b>${esc(teksPeriode)}</b> · Lokasi: <b>${esc(teksLokasi)}</b></p>
<p class="meta">Dibuat oleh ${esc(pengguna?.nama)} (${esc(NAMA_PERAN[pengguna?.peran])}) pada ${esc(waktuLengkap(new Date().toISOString()))}</p>
<div class="grid">${kartu.map((k) => `<div class="kartu">${esc(k.label)}<b>${esc(k.nilai)}</b><span>${esc(k.ket)}</span></div>`).join('')}</div>
<h2>1. Kondisi Ruangan Saat Ini</h2>
<div class="dua">
${tabel(['Kondisi', 'Jumlah ruangan'], kondisiRuang.map((k) => [k.nama, k.nilai]))}
${tabel(['Gedung', 'Total', 'Baik', 'Bermasalah', 'Tdk. Dapat Digunakan', 'Belum'], kondisiPerGedung.map((g) => [g.gedung, g.total, g.baik, g.perawatan, g.rusak, g.belum]))}
</div>
<h2>2. Kinerja Rapid Inspection</h2>
<div class="dua">
${tabel(['Peran pemeriksa', 'Jumlah inspeksi'], inspeksiPerPeran.map((x) => [x.peran, x.jumlah]))}
${tabel(['Hasil inspeksi', 'Jumlah'], hasilInspeksi.map((x) => [x.label, x.jumlah]))}
</div>
${tabel(['Waktu', 'Ruangan', 'Pemeriksa', 'Hasil', 'Durasi'], inspeksiPeriode.slice(0, 100).map((i) => [i.waktu, ruangById[i.ruangId]?.nama, `${i.pemeriksa} (${NAMA_PERAN[i.peran] ?? i.peran})`, HASIL_RUANGAN[i.kondisiRuangan], i.durasiDetik ? `${angka(i.durasiDetik / 60)} menit` : '-']))}
<h2>3. Kerusakan</h2>
<div class="dua">
${tabel(['Kategori', 'Temuan'], kerusakanPerKategori.map((x) => [x.nama, x.jumlah]))}
${tabel(['Gedung', 'Temuan'], kerusakanPerGedung.map((x) => [x.nama, x.jumlah]))}
</div>
${tabel(['Fasilitas paling sering rusak', 'Jumlah laporan'], palingSeringRusak.map((x) => [x.nama, x.jumlah]))}
<h2>4. Pemeliharaan</h2>
${tabel(['Baru', 'Verifikasi', 'Diproses', 'Selesai', 'Ditolak', 'Rata-rata penyelesaian', 'Preventif', 'Total biaya'], [[hitungStatus('baru'), hitungStatus('verifikasi') + hitungStatus('terverifikasi'), hitungStatus('diproses'), hitungStatus('selesai'), hitungStatus('ditolak'), teksDurasiJam(rataSelesaiJam), preventifPeriode.length, rupiah(biayaAktual)]])}
${tabel(['No.', 'Dibuat', 'Ruangan', 'Fasilitas', 'Temuan', 'Status', 'Teknisi', 'Hasil / tindak lanjut', 'Biaya'], tiketPeriode.slice(0, 100).map((l) => [`#${l.id}`, l.dibuat, ruangById[l.ruangId]?.nama, l.namaFasilitas, l.kondisi ? `${STATUS[l.kondisi].label} ${l.jumlah} unit` : 'Preventif', STATUS_LAPORAN[l.status], l.teknisi || '-', l.hasilPerbaikan || l.tindakLanjut || '-', rupiah(l.biayaAktual)]))}
<h2>5. Log Riwayat Sistem (${Math.min(logLokasi.length, 150)} dari ${logLokasi.length} kegiatan terbaru)</h2>
${tabel(['Waktu', 'Pengguna', 'Kegiatan', 'Data', 'Rincian'], logLokasi.slice(0, 150).map((x) => [waktuLengkap(x.waktu), `${x.nama_pengguna}${x.peran ? ` (${NAMA_PERAN[x.peran] ?? x.peran})` : ''}`, `${teksAksi(x)} · ${MODUL[x.modul] ?? x.modul}`, x.objek, rincianLog(x).join('; ')]))}
<p class="kaki">Dicetak dari Dashboard Monitoring Kondisi Fasilitas Ruang Kuliah Berbasis Rapid Inspection.</p>
<script>window.onload=()=>setTimeout(()=>window.print(),300)</script>
</body></html>`

    const jendela = window.open('', '_blank')
    if (!jendela) return window.alert('Jendela cetak diblokir browser. Izinkan pop-up untuk halaman ini, lalu coba lagi.')
    jendela.document.write(html)
    jendela.document.close()
  }

  // ===================== Tampilan =====================
  return (
    <>
      <Header judul="Laporan" subjudul="Rekap kondisi fasilitas, kinerja inspeksi, kerusakan, pemeliharaan, dan log riwayat sistem" />
      <InfoMuat />

      {/* Filter */}
      <section aria-label="Filter laporan" className="bg-white border border-line rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-end gap-2.5">
          <label className={`${gayaLabel} w-full sm:w-48`}>
            Periode
            <select className={gayaInput} value={periode} onChange={(e) => setPeriode(e.target.value)}>
              {PILIHAN_PERIODE.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </label>
          {periode === 'kustom' && (
            <>
              <label className={`${gayaLabel} flex-1 sm:flex-none sm:w-40`}>
                Dari
                <input type="date" className={gayaInput} value={dariKustom} onChange={(e) => setDariKustom(e.target.value)} />
              </label>
              <label className={`${gayaLabel} flex-1 sm:flex-none sm:w-40`}>
                Sampai
                <input type="date" className={gayaInput} value={sampaiKustom} onChange={(e) => setSampaiKustom(e.target.value)} />
              </label>
            </>
          )}
          <label className={`${gayaLabel} flex-1 sm:flex-none sm:w-36`}>
            Kampus
            <select className={gayaInput} value={kampus} onChange={(e) => { setKampus(e.target.value); setGedung('Semua') }}>
              <option value="Semua">Semua</option>
              {DAFTAR_KAMPUS.map((k) => <option key={k}>{k}</option>)}
            </select>
          </label>
          <label className={`${gayaLabel} flex-1 sm:flex-none sm:w-36`}>
            Gedung
            <select className={gayaInput} value={gedung} onChange={(e) => setGedung(e.target.value)}>
              <option value="Semua">Semua</option>
              {gedungDiKampus(ruang, kampus).map((g) => <option key={g}>{g}</option>)}
            </select>
          </label>
          <div className="flex gap-2 w-full lg:w-auto lg:ml-auto">
            <button type="button" onClick={unduhExcel} disabled={mengunduh || log === null} className={`${tombolKedua} flex-1 lg:flex-none disabled:opacity-60`}>
              <FileSpreadsheet size={18} /> {mengunduh ? 'Menyiapkan…' : 'Unduh Excel'}
            </button>
            <button type="button" onClick={cetak} disabled={log === null} className={`${tombolUtama} flex-1 lg:flex-none disabled:opacity-60`}>
              <Printer size={18} /> Cetak / PDF
            </button>
          </div>
        </div>
        <p className="text-[13px] text-muted inline-flex items-center gap-1.5">
          <CalendarRange size={15} /> {teksPeriode} · {teksLokasi}
        </p>
      </section>

      <div role="tablist" className="flex gap-1 p-1 rounded-xl bg-slate-200/60 self-start">
        {[['rekap', 'Rekap', BarChart3], ['log', 'Log Riwayat', History]].map(([k, l, Ikon]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`min-h-10 px-4 rounded-lg text-sm font-semibold inline-flex items-center gap-2 ${tab === k ? 'bg-white text-primary shadow-sm' : 'text-slate-600'}`}>
            <Ikon size={16} /> {l}
            {k === 'log' && log && <span className="text-xs text-muted">({logLokasi.length})</span>}
          </button>
        ))}
      </div>

      {tab === 'rekap' ? (
        <>
          {/* Kartu indikator */}
          <section aria-label="Indikator" className="grid gap-3 grid-cols-2 md:grid-cols-3 2xl:grid-cols-6">
            {kartu.map(({ label, nilai, ket, ikon: Ikon, warna }) => (
              <div key={label} className="bg-white border border-line rounded-2xl p-4 flex flex-col gap-2">
                <span className="flex items-center gap-2">
                  <span className={`size-9 shrink-0 rounded-lg grid place-items-center ${warna}`}>
                    <Ikon size={18} />
                  </span>
                  <span className="text-[13px] font-semibold text-slate-600 leading-tight">{label}</span>
                </span>
                <b className="text-2xl">{nilai}</b>
                <span className="text-xs text-muted">{ket}</span>
              </div>
            ))}
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* 1. Kondisi ruangan */}
            <Kotak judul="Kondisi Ruangan Saat Ini" ket="Status terkini setiap ruangan pada lokasi terpilih">
              <div className="grid sm:grid-cols-[180px_1fr] gap-4 items-center">
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={kondisiRuang.filter((k) => k.nilai)} dataKey="nilai" nameKey="nama" innerRadius="55%" outerRadius="90%"
                        paddingAngle={kondisiRuang.filter((k) => k.nilai).length > 1 ? 2 : 0} isAnimationActive={false}>
                        {kondisiRuang.filter((k) => k.nilai).map((k) => <Cell key={k.kode} fill={k.warna} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="flex flex-col gap-2 text-sm">
                  {kondisiRuang.map((k) => (
                    <li key={k.kode} className="flex items-center gap-2.5">
                      <span className="size-3 rounded-full" style={{ background: k.warna }} />
                      <span className="flex-1">{k.nama}</span>
                      <b>{k.nilai}</b>
                      <span className="w-14 text-right text-muted">{persen(k.nilai, ruangDipantau.length)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <TabelKecil
                kepala={['Gedung', 'Total', 'Baik', 'Bermasalah', 'Tdk. Dpt Digunakan', 'Belum']}
                isi={kondisiPerGedung.map((g) => [g.gedung, g.total, g.baik, g.perawatan, g.rusak, g.belum])}
              />
            </Kotak>

            {/* 2. Kinerja inspeksi */}
            <Kotak judul="Kinerja Rapid Inspection" ket="Jumlah inspeksi per hari dan per peran pemeriksa">
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={inspeksiPerHari} margin={{ left: -24, right: 8, top: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="tanggal" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="jumlah" name="Inspeksi" fill={WARNA.utama} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <TabelKecil kepala={['Peran pemeriksa', 'Inspeksi']} isi={inspeksiPerPeran.map((x) => [x.peran, x.jumlah])} />
                <TabelKecil kepala={['Hasil inspeksi', 'Jumlah']} isi={hasilInspeksi.map((x) => [x.label, x.jumlah])} />
              </div>
            </Kotak>

            {/* 3. Kerusakan */}
            <Kotak judul="Kerusakan" ket="Temuan Bermasalah/Rusak dari Rapid Inspection dan laporan dosen">
              <div className="h-44">
                {kerusakanPerKategori.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={kerusakanPerKategori} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="nama" width={84} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="jumlah" name="Temuan" fill={WARNA.perawatan} radius={[0, 4, 4, 0]} barSize={22} isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="h-full grid place-items-center text-sm text-muted">Tidak ada temuan kerusakan pada periode ini.</p>
                )}
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <TabelKecil kepala={['Gedung', 'Temuan']} isi={kerusakanPerGedung.map((x) => [x.nama, x.jumlah])} />
                <TabelKecil kepala={['Jenis fasilitas', 'Temuan']} isi={jenisPalingSeringRusak.map((x) => [x.nama, x.jumlah])} />
              </div>
              <TabelKecil kepala={['Fasilitas paling sering rusak', 'Laporan']} isi={palingSeringRusak.map((x) => [x.nama, x.jumlah])} />
            </Kotak>

            {/* 4. Pemeliharaan */}
            <Kotak judul="Pemeliharaan" ket="Status tindak lanjut temuan kerusakan pada periode ini">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  ['Baru', hitungStatus('baru'), 'bg-bad-soft text-bad-ink'],
                  ['Verifikasi', hitungStatus('verifikasi') + hitungStatus('terverifikasi'), 'bg-violet-50 text-violet-700'],
                  ['Diproses', hitungStatus('diproses'), 'bg-sky-50 text-sky-700'],
                  ['Selesai', hitungStatus('selesai'), 'bg-ok-soft text-ok-ink'],
                  ['Ditolak', hitungStatus('ditolak'), 'bg-slate-100 text-slate-600'],
                ].map(([l, n, w]) => (
                  <div key={l} className={`rounded-xl px-3 py-2.5 ${w}`}>
                    <p className="text-xs font-semibold">{l}</p>
                    <p className="text-xl font-extrabold">{n}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 p-3.5 rounded-xl border border-line">
                <Wrench size={20} className="text-primary" />
                <span className="flex-1 text-sm">Rata-rata waktu penyelesaian (temuan → selesai)</span>
                <b>{teksDurasiJam(rataSelesaiJam)}</b>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="p-3.5 rounded-xl border border-line">
                  <p className="text-xs text-muted">Pemeliharaan rutin (preventif)</p>
                  <b>{preventifPeriode.length} tiket</b>
                </div>
                <div className="p-3.5 rounded-xl border border-line">
                  <p className="text-xs text-muted">Total biaya (selesai)</p>
                  <b>{rupiah(biayaAktual)}</b>
                </div>
              </div>
              <TabelKecil
                kepala={['No.', 'Fasilitas', 'Ruangan', 'Status']}
                isi={tiketPeriode.slice(0, 8).map((l) => [`#${l.id}`, l.namaFasilitas, ruangById[l.ruangId]?.nama ?? '-', STATUS_LAPORAN[l.status]])}
              />
              {tiketPeriode.length > 8 && <p className="text-xs text-muted">Daftar lengkap ada di file Excel (lembar Pemeliharaan).</p>}
            </Kotak>
          </div>
        </>
      ) : (
        <LogRiwayat log={log === null ? null : logLokasi} galat={galatLog} />
      )}
    </>
  )
}

// ===================== Log Riwayat =====================
const PER_HALAMAN_LOG = 20

function LogRiwayat({ log, galat }) {
  const [modul, setModul] = useState('Semua')
  const [orang, setOrang] = useState('Semua')
  const [cari, setCari] = useState('')
  const [halaman, setHalaman] = useState(1)
  const [terbuka, setTerbuka] = useState(null)

  if (galat) return <p role="alert" className="p-3.5 rounded-xl bg-bad-soft text-bad-ink text-sm font-semibold">{galat}</p>
  if (log === null) return <p className="text-sm text-muted">Memuat log riwayat…</p>

  const daftarOrang = [...new Set(log.map((x) => x.nama_pengguna))].sort()
  const tampil = log.filter(
    (x) =>
      (modul === 'Semua' || x.modul === modul) &&
      (orang === 'Semua' || x.nama_pengguna === orang) &&
      `${x.objek} ${x.nama_pengguna} ${teksAksi(x)} ${rincianLog(x).join(' ')}`.toLowerCase().includes(cari.toLowerCase()),
  )
  const jumlahHalaman = Math.max(1, Math.ceil(tampil.length / PER_HALAMAN_LOG))
  const halamanAman = Math.min(halaman, jumlahHalaman)
  const awal = (halamanAman - 1) * PER_HALAMAN_LOG

  return (
    <section aria-label="Log riwayat sistem" className="bg-white border border-line rounded-2xl p-4 flex flex-col gap-3.5">
      <div>
        <h2 className="text-lg font-extrabold">Log Riwayat Sistem</h2>
        <p className="text-[13px] text-muted">Setiap tambah, ubah, dan hapus data tercatat otomatis: siapa, kapan, data apa, dan nilai sebelum → sesudah.</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_200px_200px]">
        <label className="relative">
          <span className="sr-only">Cari di log</span>
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className={`${gayaInput} pl-9`} value={cari} placeholder="Cari ruangan, fasilitas, kode aset, pengguna…"
            onChange={(e) => { setCari(e.target.value); setHalaman(1) }} />
        </label>
        <select aria-label="Filter modul" className={gayaInput} value={modul} onChange={(e) => { setModul(e.target.value); setHalaman(1) }}>
          <option value="Semua">Semua modul</option>
          {Object.entries(MODUL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <select aria-label="Filter pengguna" className={gayaInput} value={orang} onChange={(e) => { setOrang(e.target.value); setHalaman(1) }}>
          <option value="Semua">Semua pengguna</option>
          {daftarOrang.map((o) => <option key={o}>{o}</option>)}
        </select>
      </div>

      <ol className="flex flex-col">
        {tampil.slice(awal, awal + PER_HALAMAN_LOG).map((x) => {
          const rincian = rincianLog(x)
          const buka = terbuka === x.id
          const warnaAksi = { tambah: 'bg-ok', ubah: 'bg-warn', hapus: 'bg-bad' }[x.aksi] ?? 'bg-slate-400'
          return (
            <li key={x.id} className="border-b border-slate-100 last:border-0">
              <button type="button" onClick={() => setTerbuka(buka ? null : x.id)} aria-expanded={buka}
                className="w-full text-left py-3 flex gap-3 items-start hover:bg-slate-50 rounded-lg px-1.5">
                <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${warnaAksi}`} />
                <span className="flex-1 min-w-0 text-[13px]">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <b className="text-sm">{x.nama_pengguna}</b>
                    {x.peran && <span className="text-muted">{NAMA_PERAN[x.peran] ?? x.peran}</span>}
                    <span className="text-muted ml-auto whitespace-nowrap">{waktuLengkap(x.waktu)}</span>
                  </span>
                  <span className="block">
                    {teksAksi(x)} <span className="font-semibold">{x.objek}</span>
                    <span className="ml-1.5 text-[11px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{MODUL[x.modul] ?? x.modul}</span>
                  </span>
                  {!buka && rincian.length > 0 && <span className="block text-slate-600 truncate">{rincian.join(' · ')}</span>}
                  {buka && (
                    <ul className="mt-1.5 flex flex-col gap-0.5 text-slate-700">
                      {rincian.length ? rincian.map((r) => <li key={r}>• {r}</li>) : <li className="text-muted">Tidak ada rincian.</li>}
                    </ul>
                  )}
                </span>
                {rincian.length > 0 && (buka ? <ChevronUp size={16} className="text-muted mt-1" /> : <ChevronDown size={16} className="text-muted mt-1" />)}
              </button>
            </li>
          )
        })}
      </ol>
      {tampil.length === 0 && <p className="text-sm text-muted text-center py-8">Tidak ada kegiatan pada periode dan filter ini.</p>}

      <div className="flex items-center justify-between gap-2 text-[13px] text-muted">
        <span>
          Menampilkan {tampil.length ? awal + 1 : 0}–{Math.min(awal + PER_HALAMAN_LOG, tampil.length)} dari {tampil.length} kegiatan
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
  )
}

// ===================== Komponen kecil =====================
function Kotak({ judul, ket, children }) {
  return (
    <section aria-label={judul} className="bg-white border border-line rounded-2xl p-4 sm:p-5 flex flex-col gap-4 min-w-0">
      <div>
        <h2 className="text-lg font-extrabold">{judul}</h2>
        <p className="text-[13px] text-muted">{ket}</p>
      </div>
      {children}
    </section>
  )
}

// Kolom berisi angka rata kanan, kolom teks rata kiri
function TabelKecil({ kepala, isi }) {
  const angkaDiKolom = kepala.map((_, i) => isi.length > 0 && isi.every((b) => typeof b[i] === 'number'))
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px] border-collapse">
        <thead>
          <tr className="text-left text-slate-600 border-b border-line">
            {kepala.map((k, i) => (
              <th key={k} className={`py-2 pr-3 font-bold ${angkaDiKolom[i] ? 'text-right' : ''}`}>{k}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isi.map((b, n) => (
            <tr key={n} className="border-b border-slate-100 last:border-0">
              {b.map((v, i) => (
                <td key={i} className={`py-1.5 pr-3 ${angkaDiKolom[i] ? 'text-right font-semibold' : ''}`}>{v}</td>
              ))}
            </tr>
          ))}
          {isi.length === 0 && (
            <tr>
              <td colSpan={kepala.length} className="py-3 text-center text-muted">Tidak ada data</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
