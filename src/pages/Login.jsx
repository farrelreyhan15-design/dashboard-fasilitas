import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Building2, ChevronDown, Eye, EyeOff, KeyRound, LogIn } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import TombolGoogle from '../components/TombolGoogle.jsx'
import { gayaInput, gayaLabel, tombolUtama } from '../components/Modal.jsx'

export default function Login() {
  const { pengguna, login, loginGoogle, loginDenganTokenGoogle, pesanLogin } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [sandi, setSandi] = useState('')
  const [lihatSandi, setLihatSandi] = useState(false)
  const [formSandiTerbuka, setFormSandiTerbuka] = useState(false)
  const [error, setError] = useState('')
  const [sedang, setSedang] = useState(false)
  const [keGoogle, setKeGoogle] = useState(false)
  const [pakaiCadangan, setPakaiCadangan] = useState(false) // tombol Google personal gagal dimuat
  const [memeriksaGoogle, setMemeriksaGoogle] = useState(false)

  // Kalau sudah login, langsung ke dashboard
  if (pengguna) return <Navigate to="/" replace />

  async function masukGoogle() {
    setError('')
    setKeGoogle(true)
    const hasil = await loginGoogle()
    // Kalau berhasil, browser sudah pindah ke halaman Google
    if (hasil !== true) {
      setKeGoogle(false)
      setError(hasil)
    }
  }

  // Dipanggil tombol Google personal / One Tap setelah pengguna memilih akun
  async function masukDenganToken(token, nonce) {
    setError('')
    setMemeriksaGoogle(true)
    const hasil = await loginDenganTokenGoogle(token, nonce)
    setMemeriksaGoogle(false)
    if (hasil !== true) return setError(hasil)
    navigate('/', { replace: true })
  }

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

  const galat = error || pesanLogin

  return (
    <div className="min-h-screen bg-page flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-line rounded-2xl shadow-sm overflow-hidden">
        {/* Bagian atas berwarna */}
        <div className="bg-primary text-white px-7 py-8 flex flex-col gap-3">
          <Building2 size={44} strokeWidth={1.6} />
          <h1 className="text-2xl font-extrabold leading-tight">Facility Monitoring</h1>
          <p className="text-sm text-white/80">Monitoring kondisi fasilitas ruangan UISI</p>
        </div>

        <div className="px-7 py-7 flex flex-col gap-4">
          {/* Login utama: akun Google UISI */}
          <div className="flex flex-col gap-2">
            {pakaiCadangan ? (
              <button
                type="button"
                onClick={masukGoogle}
                disabled={keGoogle}
                className="w-full min-h-12 inline-flex items-center justify-center gap-2.5 rounded-xl border border-slate-300 bg-white font-bold text-ink hover:bg-slate-50 disabled:opacity-60"
              >
                <LogIn size={19} className="text-primary" />
                {keGoogle ? 'Membuka Google…' : 'Masuk dengan Akun Google UISI'}
              </button>
            ) : (
              <>
                <TombolGoogle saatToken={masukDenganToken} gagalDimuat={() => setPakaiCadangan(true)} />
                {memeriksaGoogle && <p role="status" className="text-sm text-center text-muted">Memeriksa akun…</p>}
              </>
            )}
            <p className="text-xs text-muted text-center leading-relaxed">
              Gunakan email <b className="text-slate-700">@uisi.ac.id</b> (dosen & staf) atau{' '}
              <b className="text-slate-700">@student.uisi.ac.id</b> (mahasiswa).
              {!pakaiCadangan && (
                <>
                  {' '}
                  <button type="button" onClick={masukGoogle} className="underline underline-offset-2 hover:text-primary">
                    Tombol tidak muncul?
                  </button>
                </>
              )}
            </p>
          </div>

          {galat && (
            <p role="alert" className="text-sm font-semibold text-red-700 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5">
              {galat}
            </p>
          )}

          {/* Login cadangan: email + kata sandi (akun yang dibuat Sarpras) */}
          <div className="border-t border-line pt-3">
            <button
              type="button"
              aria-expanded={formSandiTerbuka}
              onClick={() => setFormSandiTerbuka(!formSandiTerbuka)}
              className="w-full min-h-10 flex items-center justify-between text-sm font-semibold text-slate-600"
            >
              <span className="inline-flex items-center gap-2">
                <KeyRound size={16} /> Masuk dengan email & kata sandi
              </span>
              <ChevronDown size={18} className={`transition-transform ${formSandiTerbuka ? 'rotate-180' : ''}`} />
            </button>

            {formSandiTerbuka && (
              <form onSubmit={kirim} className="flex flex-col gap-4 pt-3">
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

                <button type="submit" disabled={sedang} className={`${tombolUtama} w-full disabled:opacity-60`}>
                  <LogIn size={18} /> {sedang ? 'Memproses…' : 'Masuk'}
                </button>
                <p className="text-xs text-muted">Untuk akun yang dibuat oleh Sarana Prasarana, misalnya akun uji coba.</p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
