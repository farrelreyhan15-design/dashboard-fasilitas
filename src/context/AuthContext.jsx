import { createContext, useContext, useState } from 'react'

/*
  AKUN & HAK AKSES (sementara, tersimpan di browser)
  Nanti isi file ini diganti dengan Supabase Auth, halaman lain tidak perlu diubah.
*/

// Akun awal saat aplikasi pertama kali dibuka
const AKUN_AWAL = [
  { id: 'u1', email: 'sarpras@uisi.ac.id', sandi: 'sarpras123', nama: 'Farrel Reyhan', peran: 'sarpras', aktif: true },
  { id: 'u2', email: 'dosen@uisi.ac.id', sandi: 'dosen123', nama: 'Dosen Uji', peran: 'dosen', aktif: true },
  { id: 'u3', email: 'pktl@uisi.ac.id', sandi: 'pktl123', nama: 'Petugas PKTL', peran: 'pktl', aktif: true },
  { id: 'u4', email: 'mahasiswa@uisi.ac.id', sandi: 'mhs123', nama: 'Mahasiswa Uji', peran: 'mahasiswa', aktif: true },
]

export const NAMA_PERAN = {
  sarpras: 'Sarana Prasarana',
  dosen: 'Dosen',
  pktl: 'Petugas PKTL',
  mahasiswa: 'Mahasiswa',
}

// Daftar aksi beserta penjelasannya (dipakai di halaman Pengaturan)
export const DAFTAR_AKSI = [
  { kode: 'kelolaData', label: 'Tambah, ubah, hapus ruangan dan fasilitas' },
  { kode: 'rapidInspection', label: 'Melakukan rapid inspection' },
  { kode: 'laporan', label: 'Laporan kerusakan' },
  { kode: 'pemeliharaan', label: 'Pemeliharaan' },
  { kode: 'pengaturan', label: 'Pengaturan dan akses pengguna' },
]

// Hak akses: aksi apa saja yang boleh dilakukan setiap peran
export const HAK_AKSES = {
  kelolaData: ['sarpras'],
    rapidInspection: ['dosen', 'pktl', 'sarpras'],
  laporan: ['dosen', 'sarpras'],
  pemeliharaan: ['sarpras'],
  pengaturan: ['sarpras'],
}

// Penyimpanan di browser
function baca(kunci, cadangan) {
  try {
    return JSON.parse(localStorage.getItem(kunci)) ?? cadangan
  } catch {
    return cadangan
  }
}
function simpan(kunci, nilai) {
  try {
    localStorage.setItem(kunci, JSON.stringify(nilai))
  } catch {
    // abaikan kalau browser tidak mengizinkan penyimpanan
  }
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [daftarAkun, setDaftarAkun] = useState(() => baca('daftar-akun', AKUN_AWAL))
  const [idLogin, setIdLogin] = useState(() => baca('id-login', null))

  // Pengguna yang sedang login (selalu mengikuti data terbaru, misalnya kalau perannya diubah)
  const akunLogin = daftarAkun.find((a) => a.id === idLogin && a.aktif)
  const pengguna = akunLogin
    ? { id: akunLogin.id, email: akunLogin.email, nama: akunLogin.nama, peran: akunLogin.peran }
    : null

  function perbaruiAkun(baru) {
    setDaftarAkun(baru)
    simpan('daftar-akun', baru)
  }

  // Mengembalikan true kalau berhasil, atau pesan kesalahan kalau gagal
  function login(email, sandi) {
    const akun = daftarAkun.find((a) => a.email === email.trim().toLowerCase() && a.sandi === sandi)
    if (!akun) return 'Email atau kata sandi salah.'
    if (!akun.aktif) return 'Akun ini sedang dinonaktifkan. Hubungi Sarana Prasarana.'
    setIdLogin(akun.id)
    simpan('id-login', akun.id)
    return true
  }

  function logout() {
    setIdLogin(null)
    simpan('id-login', null)
  }

  // Mengecek apakah pengguna yang login boleh melakukan suatu aksi
  function bisa(aksi) {
    return Boolean(pengguna && HAK_AKSES[aksi]?.includes(pengguna.peran))
  }

  // ===== Kelola akun (untuk halaman Pengaturan) =====

  // Mengembalikan null kalau berhasil, atau pesan kesalahan kalau gagal
  function tambahAkun({ nama, email, peran, sandi }) {
    const emailBersih = email.trim().toLowerCase()
    if (daftarAkun.some((a) => a.email === emailBersih)) return `Email ${emailBersih} sudah terdaftar.`
    perbaruiAkun([...daftarAkun, { id: `u${Date.now()}`, nama: nama.trim(), email: emailBersih, peran, sandi, aktif: true }])
    return null
  }

  function ubahPeran(id, peran) {
    perbaruiAkun(daftarAkun.map((a) => (a.id === id ? { ...a, peran } : a)))
  }

  function ubahStatus(id, aktif) {
    perbaruiAkun(daftarAkun.map((a) => (a.id === id ? { ...a, aktif } : a)))
  }

  const nilai = { pengguna, login, logout, bisa, daftarAkun, tambahAkun, ubahPeran, ubahStatus }
  return <AuthContext.Provider value={nilai}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}