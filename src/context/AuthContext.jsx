import { createContext, useContext, useState } from 'react'

/*
  AKUN CONTOH (sementara)
  Nanti isi file ini diganti dengan Supabase Auth.
*/
const AKUN_CONTOH = [
  { email: 'sarpras@uisi.ac.id', sandi: 'sarpras123', nama: 'Farrel Reyhan', peran: 'sarpras' },
  { email: 'dosen@uisi.ac.id', sandi: 'dosen123', nama: 'Dosen Uji', peran: 'dosen' },
  { email: 'pktl@uisi.ac.id', sandi: 'pktl123', nama: 'Petugas PKTL', peran: 'pktl' },
  { email: 'mahasiswa@uisi.ac.id', sandi: 'mhs123', nama: 'Mahasiswa Uji', peran: 'mahasiswa' },
]

export const NAMA_PERAN = {
  sarpras: 'Sarana Prasarana',
  dosen: 'Dosen',
  pktl: 'Petugas PKTL',
  mahasiswa: 'Mahasiswa',
}

// Kunci untuk mengingat pengguna yang sedang login di browser
const KUNCI = 'pengguna-login'

function bacaTersimpan() {
  try {
    return JSON.parse(localStorage.getItem(KUNCI))
  } catch {
    return null
  }
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [pengguna, setPengguna] = useState(bacaTersimpan)

  // Mengembalikan true kalau email dan kata sandi cocok
  function login(email, sandi) {
    const akun = AKUN_CONTOH.find((a) => a.email === email.trim().toLowerCase() && a.sandi === sandi)
    if (!akun) return false
    const data = { email: akun.email, nama: akun.nama, peran: akun.peran }
    setPengguna(data)
    try {
      localStorage.setItem(KUNCI, JSON.stringify(data))
    } catch {
      // abaikan kalau browser tidak mengizinkan penyimpanan
    }
    return true
  }

  function logout() {
    setPengguna(null)
    try {
      localStorage.removeItem(KUNCI)
    } catch {
      // abaikan
    }
  }

  return <AuthContext.Provider value={{ pengguna, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}