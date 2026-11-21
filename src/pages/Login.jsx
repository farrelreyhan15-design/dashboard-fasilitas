import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Building2, Eye, EyeOff, LogIn } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { gayaInput, gayaLabel, tombolUtama } from '../components/Modal.jsx'

export default function Login() {
  const { pengguna, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [sandi, setSandi] = useState('')
  const [lihatSandi, setLihatSandi] = useState(false)
    const [error, setError] = useState('')
  const [sedang, setSedang] = useState(false)

  // Kalau sudah login, langsung ke dashboard
  if (pengguna) return <Navigate to="/" replace />

    async function kirim(e) {
    e.preventDefault()
    if (!email || !sandi) return setError('Email dan kata sandi wajib diisi.')
    setError('')
    setSedang(true)
    const hasil = await login(email, sandi)
    setSedang(false)
    if (hasil !== true) return setError(hasil)
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen bg-page flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-line rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-primary text-white px-7 py-8 flex flex-col gap-3">
          <Building2 size={44} strokeWidth={1.6} />
          <h1 className="text-2xl font-extrabold leading-tight">Facility Monitoring</h1>
          <p className="text-sm text-white/80">Monitoring kondisi fasilitas ruang kuliah Gedung 4 UISI</p>
        </div>

        <form onSubmit={kirim} className="px-7 py-7 flex flex-col gap-4">
          <label className={gayaLabel}>
            Email
            <input
              type="email"
              autoComplete="username"
              className={gayaInput}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@uisi.ac.id"
            />
          </label>

          <label className={gayaLabel}>
            Kata sandi
            <div className="relative">
              <input
                type={lihatSandi ? 'text' : 'password'}
                autoComplete="current-password"
                className={`${gayaInput} pr-12`}
                value={sandi}
                onChange={(e) => setSandi(e.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                aria-label={lihatSandi ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                onClick={() => setLihatSandi(!lihatSandi)}
                className="absolute right-1 top-1/2 -translate-y-1/2 size-10 grid place-items-center text-muted"
              >
                {lihatSandi ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          {error && (
            <p role="alert" className="text-sm font-semibold text-red-700">
              {error}
            </p>
          )}

            <button type="submit" disabled={sedang} className={`${tombolUtama} w-full mt-1 disabled:opacity-60`}>
            <LogIn size={18} /> {sedang ? 'Memproses…' : 'Masuk'}
          </button>

          {/* Daftar akun uji coba. Hapus bagian ini saat sudah memakai Supabase. */}
          <div className="text-xs text-slate-600 bg-slate-50 border border-line rounded-xl p-3.5 leading-relaxed">
            <p className="font-semibold text-ink mb-1">Akun uji coba</p>
            <p>sarpras@uisi.ac.id · sarpras123</p>
            <p>dosen@uisi.ac.id · dosen123</p>
            <p>pktl@uisi.ac.id · pktl123</p>
            <p>mahasiswa@uisi.ac.id · mhs123</p>
          </div>
        </form>
      </div>
    </div>
  )
}