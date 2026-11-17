/*
  DATA CONTOH
  Semua isi file ini hanya contoh untuk tampilan.
  Nanti diganti dengan data asli dari Supabase.
*/

export const STATUS = {
  baik: { label: 'Baik', bg: 'bg-ok-soft', text: 'text-ok-ink', dot: 'bg-ok' },
  perawatan: { label: 'Perlu Perawatan', bg: 'bg-warn-soft', text: 'text-warn-ink', dot: 'bg-warn' },
  rusak: { label: 'Rusak', bg: 'bg-bad-soft', text: 'text-bad-ink', dot: 'bg-bad' },
  belum: { label: 'Belum Diinspeksi', bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
}

export const KATEGORI = ['Elektronik', 'Furnitur', 'Kelistrikan', 'Bangunan', 'Kebersihan', 'Lainnya']
export const SATUAN = ['unit', 'titik', 'set', 'buah']
export const JENIS_RUANG = ['Ruang Kuliah', 'Laboratorium', 'Ruang Rapat', 'Ruang Dosen', 'Lainnya']

// Fasilitas standar di setiap ruang kuliah: [nama, kategori, jumlah, satuan, singkatan]
export const FASILITAS_STANDAR = [
  ['AC', 'Elektronik', 2, 'unit', 'AC'],
  ['Proyektor', 'Elektronik', 1, 'unit', 'PRJ'],
  ['Layar Proyektor', 'Elektronik', 1, 'unit', 'LYR'],
  ['Lampu', 'Kelistrikan', 8, 'titik', 'LMP'],
  ['Kursi Mahasiswa', 'Furnitur', 40, 'unit', 'KRS'],
  ['Meja & Kursi Dosen', 'Furnitur', 1, 'set', 'MJD'],
  ['Papan Tulis', 'Furnitur', 1, 'unit', 'PPT'],
  ['Stop Kontak', 'Kelistrikan', 4, 'titik', 'STK'],
  ['Pintu & Jendela', 'Bangunan', 1, 'set', 'PJD'],
]

const nomorRuang = [
  '4.101', '4.102', '4.103', '4.104', '4.105', '4.106',
  '4.201', '4.202', '4.203', '4.204', '4.205', '4.206',
  '4.301', '4.302', '4.303', '4.304', '4.305', '4.306',
]

// Fasilitas yang sedang bermasalah (contoh)
const masalah = {
  '4.103': { 'Kursi Mahasiswa': 'perawatan' },
  '4.105': { AC: 'rusak' },
  '4.203': { Proyektor: 'perawatan' },
  '4.205': { Lampu: 'perawatan' },
  '4.302': { 'Papan Tulis': 'perawatan' },
  '4.304': { Proyektor: 'rusak' },
}

export const ruangAwal = nomorRuang.map((no, i) => ({
  id: no,
  kode: no,
  nama: 'R. ' + no,
  lantai: Number(no[2]),
  jenis: 'Ruang Kuliah',
  kapasitas: 40,
  inspeksiTerakhir: `17 Nov 2026, ${String(8 + Math.floor(i / 6)).padStart(2, '0')}.${String((i * 7) % 60).padStart(2, '0')}`,
}))

export const fasilitasAwal = nomorRuang.flatMap((no) =>
  FASILITAS_STANDAR.map(([nama, kategori, jumlah, satuan, singkat]) => ({
    id: `${no}-${singkat}`,
    ruangId: no,
    nama,
    kategori,
    jumlah,
    satuan,
    kondisi: masalah[no]?.[nama] ?? 'baik',
    kodeAset: `GD04-${no.replace('.', '')}-${singkat}-01`,
    terakhirDicek: '17 Nov 2026, 08.40',
  })),
)

export const aktivitasAwal = [
  { teks: 'Laporan baru: R. 4.304 proyektor tidak tampil', oleh: 'Dosen', waktu: '09.35' },
  { teks: 'Rapid inspection R. 4.306 selesai, kondisi Baik', oleh: 'Petugas PKTL', waktu: '09.10' },
  { teks: 'Laporan baru: R. 4.105 AC tidak menyala', oleh: 'Dosen', waktu: '09.05' },
  { teks: 'Fasilitas ditambahkan: 2 unit AC di R. 4.203', oleh: 'Sarana Prasarana', waktu: 'Kemarin 13.05' },
]
