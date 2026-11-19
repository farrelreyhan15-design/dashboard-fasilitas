import { useState } from 'react'
import { UserPlus, Search, Check, Minus, CheckCircle2, X } from 'lucide-react'
import Header from '../components/Header.jsx'
import Modal, { gayaInput, gayaLabel, tombolUtama, tombolKedua } from '../components/Modal.jsx'
import { useAuth, NAMA_PERAN, DAFTAR_AKSI, HAK_AKSES } from '../context/AuthContext.jsx'

const DAFTAR_PERAN = Object.keys(NAMA_PERAN) // ['sarpras', 'dosen', 'pktl', 'mahasiswa']
const FORM_KOSONG = { nama: '', email: '', peran: 'dosen', sandi: '' }

function inisial(nama) {
  return nama.split(' ').map((k) => k[0]).join('').slice(0, 2).toUpperCase()
}

export default function Pengaturan() {
  const { pengguna, daftarAkun, tambahAkun, ubahPeran, ubahStatus } = useAuth()
  const [cari, setCari] = useState('')
  const [filterPeran, setFilterPeran] = useState('semua')
  const [formTerbuka, setFormTerbuka] = useState(false)
  const [form, setForm] = useState(FORM_KOSONG)
  const [error, setError] = useState('')
  const [pesan, setPesan] = useState('')

  const ubah = (kolom) => (e) => setForm({ ...form, [kolom]: e.target.value })

  function simpanAkun() {
    if (!form.nama.trim() || !form.email.trim()) return setError('Nama dan email wajib diisi.')
    if (!form.email.includes('@')) return setError('Format email belum benar.')
    if (form.sandi.length < 6) return setError('Kata sandi minimal 6 karakter.')
    const gagal = tambahAkun(form)
    if (gagal) return setError(gagal)
    setPesan(`Akun ${form.nama.trim()} (${NAMA_PERAN[form.peran]}) berhasil ditambahkan.`)
    setFormTerbuka(false)
  }

  const akunTampil = daftarAkun.filter(
    (a) =>
      (filterPeran === 'semua' || a.peran === filterPeran) &&
      (a.nama + a.email).toLowerCase().includes(cari.toLowerCase()),
  )

  return (
    <>
      <Header judul="Pengaturan" subjudul="Kelola akun pengguna dan hak akses setiap peran" />

      {pesan && (
        <div role="status" className="flex items-center gap-3 p-3.5 rounded-xl bg-ok-soft border border-green-200 text-ok-ink">
          <CheckCircle2 size={22} />
          <span className="flex-1 text-sm font-semibold">{pesan}</span>
          <button type="button" aria-label="Tutup pemberitahuan" onClick={() => setPesan('')} className="size-9 grid place-items-center">
            <X size={18} />
          </button>
        </div>
      )}

      {/* ===== Daftar pengguna ===== */}
      <section aria-label="Akses pengguna" className="bg-white border border-line rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold">Akses Pengguna</h2>
            <p className="text-sm text-muted">Akun yang dinonaktifkan tidak bisa login.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setForm(FORM_KOSONG)
              setError('')
              setFormTerbuka(true)
            }}
            className={tombolUtama}
          >
            <UserPlus size={18} /> Tambah Pengguna
          </button>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <label className="flex-[1_1_260px] flex items-center gap-2.5 min-h-11 px-3.5 border border-slate-200 rounded-xl text-muted">
            <Search size={18} />
            <input
              type="search"
              aria-label="Cari pengguna"
              placeholder="Cari nama atau email..."
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              className="flex-1 min-w-0 bg-transparent outline-none text-sm text-ink"
            />
          </label>
          <select aria-label="Filter peran" value={filterPeran} onChange={(e) => setFilterPeran(e.target.value)} className={`${gayaInput} sm:w-56`}>
            <option value="semua">Semua peran</option>
            {DAFTAR_PERAN.map((p) => (
              <option key={p} value={p}>
                {NAMA_PERAN[p]}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-180 text-sm border-collapse">
            <thead>
              <tr className="text-left bg-slate-50 text-slate-600 text-[13px]">
                <th className="px-3.5 py-3 font-bold">Nama</th>
                <th className="px-3.5 py-3 font-bold">Email</th>
                <th className="px-3.5 py-3 font-bold">Peran</th>
                <th className="px-3.5 py-3 font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {akunTampil.map((a) => {
                const diriSendiri = a.id === pengguna.id
                return (
                  <tr key={a.id} className={`border-b border-slate-100 ${a.aktif ? '' : 'opacity-60'}`}>
                    <td className="px-3.5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="size-9 shrink-0 rounded-full bg-primary-soft text-primary grid place-items-center text-xs font-bold">
                          {inisial(a.nama)}
                        </span>
                        <span className="font-bold">
                          {a.nama}
                          {diriSendiri && <span className="ml-2 text-xs font-semibold text-muted">(Anda)</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-3.5 py-3 text-slate-700">{a.email}</td>
                    <td className="px-3.5 py-3">
                      <select
                        aria-label={`Peran ${a.nama}`}
                        value={a.peran}
                        disabled={diriSendiri}
                        onChange={(e) => ubahPeran(a.id, e.target.value)}
                        className={`${gayaInput} w-auto min-h-9 disabled:bg-slate-50 disabled:text-slate-500`}
                      >
                        {DAFTAR_PERAN.map((p) => (
                          <option key={p} value={p}>
                            {NAMA_PERAN[p]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3.5 py-3">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={a.aktif}
                        aria-label={`Status ${a.nama}`}
                        disabled={diriSendiri}
                        onClick={() => ubahStatus(a.id, !a.aktif)}
                        className="inline-flex items-center gap-2.5 min-h-9 disabled:cursor-not-allowed"
                      >
                        <span className={`relative w-10 h-6 rounded-full transition-colors ${a.aktif ? 'bg-ok' : 'bg-slate-300'}`}>
                          <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${a.aktif ? 'left-4.5' : 'left-0.5'}`} />
                        </span>
                        <span className={`text-[13px] font-semibold ${a.aktif ? 'text-ok-ink' : 'text-slate-500'}`}>
                          {a.aktif ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </button>
                    </td>
                  </tr>
                )
              })}
              {akunTampil.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3.5 py-6 text-center text-muted">
                    Tidak ada pengguna yang cocok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-[13px] text-muted">Peran dan status akun Anda sendiri tidak bisa diubah, supaya tidak terkunci dari halaman ini.</p>
      </section>

      {/* ===== Tabel hak akses ===== */}
      <section aria-label="Hak akses per peran" className="bg-white border border-line rounded-2xl p-5 flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-extrabold">Hak Akses per Peran</h2>
          <p className="text-sm text-muted">Semua peran dapat melihat Dashboard, Data Ruangan, dan Data Fasilitas.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-180 text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-[13px]">
                <th className="px-3.5 py-3 font-bold text-left">Aksi</th>
                {DAFTAR_PERAN.map((p) => (
                  <th key={p} className="px-3.5 py-3 font-bold text-center">
                    {NAMA_PERAN[p]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAFTAR_AKSI.map((aksi) => (
                <tr key={aksi.kode} className="border-b border-slate-100">
                  <td className="px-3.5 py-3 font-semibold">{aksi.label}</td>
                  {DAFTAR_PERAN.map((p) => {
                    const boleh = HAK_AKSES[aksi.kode].includes(p)
                    return (
                      <td key={p} className="px-3.5 py-3 text-center">
                        {boleh ? (
                          <Check size={20} className="inline text-ok" aria-label="Boleh" />
                        ) : (
                          <Minus size={20} className="inline text-slate-300" aria-label="Tidak boleh" />
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {formTerbuka && (
        <Modal
          judul="Tambah Pengguna"
          keterangan="Pengguna baru bisa langsung login dengan email dan kata sandi ini."
          tutup={() => setFormTerbuka(false)}
          footer={
            <>
              <button type="button" onClick={() => setFormTerbuka(false)} className={tombolKedua}>
                Batal
              </button>
              <button type="button" onClick={simpanAkun} className={tombolUtama}>
                Simpan Pengguna
              </button>
            </>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={gayaLabel}>
              Nama lengkap *
              <input className={gayaInput} value={form.nama} onChange={ubah('nama')} placeholder="Contoh: Budi Santoso" />
            </label>
            <label className={gayaLabel}>
              Email *
              <input type="email" className={gayaInput} value={form.email} onChange={ubah('email')} placeholder="nama@uisi.ac.id" />
            </label>
            <label className={gayaLabel}>
              Peran
              <select className={gayaInput} value={form.peran} onChange={ubah('peran')}>
                {DAFTAR_PERAN.map((p) => (
                  <option key={p} value={p}>
                    {NAMA_PERAN[p]}
                  </option>
                ))}
              </select>
            </label>
            <label className={gayaLabel}>
              Kata sandi awal *
              <input type="text" className={gayaInput} value={form.sandi} onChange={ubah('sandi')} placeholder="Minimal 6 karakter" />
            </label>
            {error && (
              <p role="alert" className="sm:col-span-2 text-sm font-semibold text-red-700">
                {error}
              </p>
            )}
          </div>
        </Modal>
      )}
    </>
  )
}