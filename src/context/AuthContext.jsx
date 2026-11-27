import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase.js'

/*
  AKUN & HAK AKSES (memakai Supabase Auth)
  - Login utama: akun Google UISI (@uisi.ac.id = Dosen, @student.uisi.ac.id = Mahasiswa)
  - Login email + kata sandi tetap ada untuk akun uji yang didaftarkan Sarpras
  - Nama, peran, dan status aktif disimpan di tabel profiles
  - Email berperan khusus (Sarpras, PKTL) didaftarkan di tabel akun_terdaftar
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
  { kode: 'laporan', label: 'Laporan rekap dan log riwayat sistem' },
  { kode: 'pemeliharaan', label: 'Pemeliharaan (PKTL: verifikasi lapangan yang ditugaskan)' },
  { kode: 'pengaturan', label: 'Pengaturan dan akses pengguna' },
]

// Hak akses: aksi apa saja yang boleh dilakukan setiap peran
export const HAK_AKSES = {
  kelolaData: ['sarpras'],
  rapidInspection: ['dosen', 'pktl', 'sarpras'],
  laporan: ['sarpras'],
  pemeliharaan: ['sarpras', 'pktl'],
  pengaturan: ['sarpras'],
}

const KOLOM_PROFIL = 'id, email, nama, peran, aktif'
const PESAN_BUKAN_UISI = 'Akun ini tidak diizinkan. Masuk dengan akun Google UISI (@uisi.ac.id atau @student.uisi.ac.id).'

// Kalau login Google ditolak, Supabase kembali ke halaman ini dengan pesan error di alamat (URL).
// Dibaca sekali saat aplikasi dimuat, lalu alamatnya dibersihkan.
function bacaGalatLoginDariUrl() {
  const dariQuery = new URLSearchParams(window.location.search).get('error_description')
  const dariHash = new URLSearchParams(window.location.hash.slice(1)).get('error_description')
  const teks = dariQuery || dariHash
  if (!teks) return ''
  window.history.replaceState(null, '', window.location.pathname)
  return /database error saving new user|EMAIL_TIDAK_DIIZINKAN/i.test(teks) ? PESAN_BUKAN_UISI : `Login Google gagal: ${teks}`
}
const GALAT_LOGIN_AWAL = bacaGalatLoginDariUrl()

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
  const [daftarTerdaftar, setDaftarTerdaftar] = useState([]) // email berperan khusus (akun_terdaftar)
  const [pesanLogin, setPesanLogin] = useState(GALAT_LOGIN_AWAL)

  // Saat aplikasi dibuka: cek apakah masih ada sesi login sebelumnya
  useEffect(() => {
    let masihTerpasang = true

    supabase.auth.getSession().then(async ({ data }) => {
      const profil = data.session ? await ambilProfil(data.session.user.id) : null
      if (!masihTerpasang) return
      // Sesi ada (mis. baru kembali dari login Google) tetapi akun dinonaktifkan: keluarkan lagi
      if (data.session && !profil?.aktif) {
        await supabase.auth.signOut()
        setPesanLogin(profil ? 'Akun ini sedang dinonaktifkan. Hubungi Sarana Prasarana.' : 'Profil akun tidak ditemukan. Hubungi Sarana Prasarana.')
      }
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
    supabase
      .from('akun_terdaftar')
      .select('email, nama, peran, dibuat_pada')
      .order('dibuat_pada', { ascending: false })
      .then(({ data }) => setDaftarTerdaftar(data ?? []))
  }, [pengguna?.peran])

  // Login dengan akun Google. Browser akan pindah ke halaman Google, lalu kembali ke dashboard.
  async function loginGoogle() {
    setPesanLogin('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
        queryParams: { prompt: 'select_account' }, // selalu tampilkan pilihan akun Google
      },
    })
    return error ? `Login Google gagal: ${error.message}` : true
  }

  // Login dengan tombol Google personal / One Tap (jendela kecil, halaman tidak berpindah).
  // token = kartu identitas dari Google, nonce = kode acak pengaman yang sama dengan yang dikirim ke Google.
  async function loginDenganTokenGoogle(token, nonce) {
    setPesanLogin('')
    const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'google', token, nonce })
    if (error) {
      return /database error saving new user|EMAIL_TIDAK_DIIZINKAN/i.test(error.message)
        ? PESAN_BUKAN_UISI
        : `Login Google gagal: ${error.message}`
    }
    return periksaProfil(data.user.id)
  }

  // Setelah berhasil masuk: pastikan profil ada dan aktif, lalu simpan sebagai pengguna
  async function periksaProfil(idAkun) {
    const profil = await ambilProfil(idAkun)
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

    return periksaProfil(data.user.id)
  }

  async function logout() {
    await supabase.auth.signOut()
    window.google?.accounts?.id?.disableAutoSelect() // supaya Google tidak langsung memasukkan lagi
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

    // Email harus terdaftar dulu, karena database hanya mengizinkan akun kata sandi untuk email terdaftar
    const galatDaftar = await daftarkanEmail({ email: emailBersih, nama, peran })
    if (galatDaftar) return galatDaftar

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

  // Mendaftarkan email dengan peran khusus. Kalau akunnya sudah ada, perannya langsung diubah.
  // Mengembalikan null kalau berhasil, atau pesan kesalahan.
  async function daftarkanEmail({ email, nama, peran }) {
    const emailBersih = email.trim().toLowerCase()
    const baris = { email: emailBersih, nama: nama?.trim() || null, peran, didaftarkan_oleh: pengguna.id }
    const { error } = await supabase.from('akun_terdaftar').upsert(baris)
    if (error) return `Gagal mendaftarkan email: ${error.message}`
    setDaftarTerdaftar((lama) => [{ ...baris, dibuat_pada: new Date().toISOString() }, ...lama.filter((x) => x.email !== emailBersih)])

    const akunAda = daftarAkun.find((a) => a.email.toLowerCase() === emailBersih)
    if (akunAda && akunAda.peran !== peran && akunAda.id !== pengguna.id) await ubahPeran(akunAda.id, peran)
    return null
  }

  async function hapusTerdaftar(email) {
    const { error } = await supabase.from('akun_terdaftar').delete().eq('email', email)
    if (!error) setDaftarTerdaftar((lama) => lama.filter((x) => x.email !== email))
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

  const nilai = {
    pengguna, login, loginGoogle, loginDenganTokenGoogle, pesanLogin, logout, bisa,
    daftarAkun, tambahAkun, ubahPeran, ubahStatus, daftarTerdaftar, daftarkanEmail, hapusTerdaftar,
  }
  return <AuthContext.Provider value={nilai}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
