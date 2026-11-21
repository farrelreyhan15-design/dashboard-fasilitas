/*
  KONSTANTA & FUNGSI BANTU
  Daftar pilihan (status, kategori, jenis ruang) dan fungsi kecil untuk menampilkan data.
  Data ruangan dan fasilitasnya sendiri sekarang disimpan di database Supabase.
*/

export const STATUS = {
  baik: { label: 'Baik', bg: 'bg-ok-soft', text: 'text-ok-ink', dot: 'bg-ok' },
  perawatan: { label: 'Perlu Perawatan', bg: 'bg-warn-soft', text: 'text-warn-ink', dot: 'bg-warn' },
  rusak: { label: 'Rusak', bg: 'bg-bad-soft', text: 'text-bad-ink', dot: 'bg-bad' },
  belum: { label: 'Belum Diinspeksi', bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
}

export const KATEGORI = ['Elektronik', 'Furnitur', 'Kelistrikan', 'Bangunan', 'Kebersihan', 'Kendaraan', 'Lainnya']
export const SATUAN = ['unit', 'titik', 'set', 'buah']
export const SATUAN_KAPASITAS = ['Kursi', 'Komputer', 'Penumpang']
export const JENIS_RUANG = [
  'Ruang Kuliah', 'Laboratorium', 'Laboratorium Komputer', 'Auditorium', 'Ruang Rapat', 'Ruang Diskusi',
  'Studio', 'Ruang Kreatif', 'Lobby', 'Ruang Transit', 'Area Terbuka', 'Area Parkir', 'Masjid', 'Kendaraan', 'Lainnya',
]

// Fasilitas standar yang bisa dipilih saat menambah ruangan: [nama, kategori, jumlah, satuan, singkatan]
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

// Mengubah nama menjadi id, contoh "CM - 101" -> "cm-101"
export function buatId(teks) {
  return teks.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// Nama ruangan dari gedung dan ruangan, contoh "G4" + "R1" -> "G4 - R1"
export function buatNama(gedung, ruangan) {
  return `${gedung.trim()} - ${ruangan.trim()}`
}

// Menampilkan kapasitas, contoh "46 kursi" atau "Tidak tersedia"
export function teksKapasitas(r) {
  if (!r.kapasitas) return 'Tidak tersedia'
  return r.satuanKapasitas ? `${r.kapasitas} ${r.satuanKapasitas.toLowerCase()}` : String(r.kapasitas)
}

// Menampilkan lokasi, contoh "Kampus B · CM · Lantai 2" atau "Kampus A · G4"
export function teksLokasi(r) {
  return [r.kampus, r.gedung, r.lantai ? `Lantai ${r.lantai}` : null].filter(Boolean).join(' · ')
}

export const DAFTAR_KAMPUS = ['Kampus A', 'Kampus B']

// Daftar gedung per kampus, dipakai untuk filter dan form
export function gedungDiKampus(daftarRuang, kampus) {
  return [...new Set(daftarRuang.filter((r) => kampus === 'Semua' || r.kampus === kampus).map((r) => r.gedung))].sort()
}
