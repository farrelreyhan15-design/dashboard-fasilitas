import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase.js'

/*
  AKUN & HAK AKSES (memakai Supabase Auth)
  - Email dan kata sandi disimpan dan diperiksa oleh Supabase (auth.users)
  - Nama, peran, dan status aktif disimpan di tabel profiles
*/

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
  { kode: 'lapor', label: 'Melaporkan kerusakan fasilitas' },
  { kode: 'laporan', label: 'Laporan rekap dan log riwayat sistem' },
  { kode: 'pemeliharaan', label: 'Pemeliharaan (tindak lanjut kerusakan)' },
  { kode: 'pengaturan', label: 'Pengaturan dan akses pengguna' },
]

// Hak akses: aksi apa saja yang boleh dilakukan setiap peran
export const HAK_AKSES = {
  kelolaData: ['sarpras'],
  rapidInspection: ['dosen', 'pktl', 'sarpras'],
  lapor: ['dosen', 'sarpras'],
  laporan: ['sarpras'],
  pemeliharaan: ['sarpras'],
  pengaturan: ['sarpras'],
}

const KOLOM_PROFIL = 'id, email, nama, peran, aktif'

// Mengambil profil (nama, peran, aktif) milik satu akun
async function ambilProfil(idAkun) {
  const { data } = await supabase.from('profiles').select(KOLOM_PROFIL).eq('id', idAkun).maybeSingle()
  return data
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [pengguna, setPengguna] = useState(null)
  const [memuat, setMemuat] = useState(true)
  const [daftarAkun, setDaftarAkun] = useState([])

  // Saat aplikasi dibuka: cek apakah masih ada sesi login sebelumnya
  useEffect(() => {
    let masihTerpasang = true

    supabase.auth.getSession().then(async ({ data }) => {
      const profil = data.session ? await ambilProfil(data.session.user.id) : null
      if (!masihTerpasang) return
      setPengguna(profil?.aktif ? profil : null)
      setMemuat(false)
    })

    // Kalau sesi berakhir (logout atau kedaluwarsa), kosongkan pengguna
    const { data: langganan } = supabase.auth.onAuthStateChange((kejadian) => {
      if (kejadian === 'SIGNED_OUT') setPengguna(null)
    })

    return () => {
      masihTerpasang = false
      langganan.subscription.unsubscribe()
    }
  }, [])

  // Khusus Sarpras: ambil daftar semua akun untuk halaman Pengaturan
  useEffect(() => {
    if (pengguna?.peran !== 'sarpras') return
    supabase
      .from('profiles')
      .select(KOLOM_PROFIL)
      .order('dibuat_pada')
      .then(({ data }) => setDaftarAkun(data ?? []))
  }, [pengguna?.peran])

  // Mengembalikan true kalau berhasil, atau pesan kesalahan kalau gagal
  async function login(email, sandi) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: sandi,
    })
    if (error) {
      return error.status === 400
        ? 'Email atau kata sandi salah.'
        : 'Gagal terhubung ke server. Periksa koneksi internet lalu coba lagi.'
    }

    const profil = await ambilProfil(data.user.id)
    if (!profil) {
      await supabase.auth.signOut()
      return 'Profil akun tidak ditemukan. Hubungi Sarana Prasarana.'
    }
    if (!profil.aktif) {
      await supabase.auth.signOut()
      return 'Akun ini sedang dinonaktifkan. Hubungi Sarana Prasarana.'
    }

    setPengguna(profil)
    return true
  }

  async function logout() {
    await supabase.auth.signOut()
    setPengguna(null)
  }

  // Mengecek apakah pengguna yang login boleh melakukan suatu aksi
  function bisa(aksi) {
    return Boolean(pengguna && HAK_AKSES[aksi]?.includes(pengguna.peran))
  }

  // ===== Kelola akun (untuk halaman Pengaturan) =====

  // Mengembalikan null kalau berhasil, atau pesan kesalahan kalau gagal
  async function tambahAkun({ nama, email, peran, sandi }) {
    const emailBersih = email.trim().toLowerCase()

    // Klien sementara yang tidak menyimpan sesi,
    // supaya Sarpras tidak ikut "pindah login" ke akun baru
    const klienDaftar = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'daftar-akun-baru' },
    })

    const { data, error } = await klienDaftar.auth.signUp({
      email: emailBersih,
      password: sandi,
      options: { data: { nama: nama.trim() } },
    })
    if (error) {
      return error.message.toLowerCase().includes('registered')
        ? `Email ${emailBersih} sudah terdaftar.`
        : `Gagal menambah akun: ${error.message}`
    }
    if (!data.user?.identities?.length) return `Email ${emailBersih} sudah terdaftar.`

    // Profil sudah dibuat otomatis oleh trigger (peran awal: mahasiswa), lalu perannya diatur di sini
    const { error: errorPeran } = await supabase.from('profiles').update({ peran }).eq('id', data.user.id)
    if (errorPeran) return `Akun dibuat, tetapi peran gagal diatur: ${errorPeran.message}`

    setDaftarAkun((lama) => [...lama, { id: data.user.id, email: emailBersih, nama: nama.trim(), peran, aktif: true }])
    return null
  }

  async function ubahPeran(id, peran) {
    const { error } = await supabase.from('profiles').update({ peran }).eq('id', id)
    if (!error) setDaftarAkun((lama) => lama.map((a) => (a.id === id ? { ...a, peran } : a)))
  }

  async function ubahStatus(id, aktif) {
    const { error } = await supabase.from('profiles').update({ aktif }).eq('id', id)
    if (!error) setDaftarAkun((lama) => lama.map((a) => (a.id === id ? { ...a, aktif } : a)))
  }

  // Selama sesi lama sedang dicek, tampilkan layar memuat
  if (memuat) {
    return <div className="min-h-screen grid place-items-center text-sm text-muted">Memuat…</div>
  }

  const nilai = { pengguna, login, logout, bisa, daftarAkun, tambahAkun, ubahPeran, ubahStatus }
  return <AuthContext.Provider value={nilai}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
