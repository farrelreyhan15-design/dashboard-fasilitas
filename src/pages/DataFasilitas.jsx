import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Search, Pencil, Trash2, QrCode, DoorOpen, CheckCircle2, X } from 'lucide-react'
import Header from '../components/Header.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import Modal, { gayaInput, gayaLabel, tombolUtama, tombolKedua } from '../components/Modal.jsx'
import { useData } from '../context/DataContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { KATEGORI, SATUAN, STATUS } from '../data/dataAwal.js'

const FORM_KOSONG = { nama: '', kategori: 'Elektronik', jumlah: '1', satuan: 'unit', kondisi: 'baik' }

// Singkatan untuk kode aset, contoh "Kursi Mahasiswa" -> "KM"
function singkatan(nama) {
  const huruf = nama.replace(/[^A-Za-z ]/g, '').trim().split(/\s+/).map((k) => k[0] ?? '').join('').toUpperCase()
  return huruf.length >= 2 ? huruf : nama.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'FAS'
}

export default function DataFasilitas() {
  const { ruang, fasilitas, tambahFasilitas, hapusFasilitas } = useData()
    const { bisa } = useAuth()
  const [params, setParams] = useSearchParams()
  const ruangId = params.get('ruang') ?? ruang[0]?.id
  const ruangAktif = ruang.find((r) => r.id === ruangId) ?? ruang[0]

  const [cari, setCari] = useState('')
  const [formTerbuka, setFormTerbuka] = useState(false)
  const [form, setForm] = useState(FORM_KOSONG)
  const [error, setError] = useState('')
  const [pesan, setPesan] = useState('')

  const milikRuang = fasilitas.filter((f) => f.ruangId === ruangAktif?.id)
  const ubah = (kolom) => (e) => setForm({ ...form, [kolom]: e.target.value })

  // Pratinjau kode aset otomatis
  const singkat = form.nama.trim() ? singkatan(form.nama) : 'XXX'
  const urutan = String(milikRuang.filter((f) => f.kodeAset.includes(`-${singkat}-`)).length + 1).padStart(2, '0')
  const kodeAset = `GD04-${ruangAktif?.kode.replace('.', '')}-${singkat}-${urutan}`

  function simpan() {
    if (!form.nama.trim() || !(Number(form.jumlah) > 0)) return setError('Nama fasilitas dan jumlah wajib diisi.')
    tambahFasilitas({
      id: `${ruangAktif.id}-${singkat}-${Date.now()}`,
      ruangId: ruangAktif.id,
      nama: form.nama.trim(),
      kategori: form.kategori,
      jumlah: Number(form.jumlah),
      satuan: form.satuan,
      kondisi: form.kondisi,
      kodeAset,
    })
    setPesan(`${form.jumlah} ${form.satuan} ${form.nama.trim()} ditambahkan ke ${ruangAktif.nama}. Status ruangan di dashboard ikut diperbarui.`)
    setFormTerbuka(false)
  }

  if (!ruangAktif) {
    return (
      <>
        <Header judul="Data Fasilitas" subjudul="Belum ada ruangan" />
        <p className="text-muted">Tambahkan ruangan terlebih dahulu di menu Data Ruangan.</p>
      </>
    )
  }

  return (
    <>
      <Header judul="Data Fasilitas" subjudul="Daftar fasilitas di setiap ruangan, lengkap dengan kode aset dan kondisi terakhir" />

      {pesan && (
        <div role="status" className="flex items-center gap-3 p-3.5 rounded-xl bg-ok-soft border border-green-200 text-ok-ink">
          <CheckCircle2 size={22} />
          <span className="flex-1 text-sm font-semibold">{pesan}</span>
          <button type="button" aria-label="Tutup pemberitahuan" onClick={() => setPesan('')} className="size-9 grid place-items-center">
            <X size={18} />
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-5 items-start">
        {/* Daftar ruangan di kiri */}
        <section aria-label="Pilih ruangan" className="flex-[1_1_260px] min-w-0 bg-white border border-line rounded-2xl p-4 flex flex-col gap-2.5">
          <h2 className="font-extrabold">Ruangan</h2>
          <label className="flex items-center gap-2 min-h-10 px-3 border border-slate-200 rounded-xl text-muted">
            <Search size={16} />
            <input
              type="search"
              aria-label="Cari ruangan"
              placeholder="Cari ruangan..."
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              className="flex-1 min-w-0 bg-transparent outline-none text-sm text-ink"
            />
          </label>
          <div className="flex flex-col gap-2 max-h-[560px] overflow-y-auto pr-1">
            {ruang
              .filter((r) => r.nama.toLowerCase().includes(cari.toLowerCase()))
              .map((r) => {
                const aktif = r.id === ruangAktif.id
                return (
                  <button
                    key={r.id}
                    type="button"
                    aria-pressed={aktif}
                    onClick={() => {
                      setParams({ ruang: r.id })
                      setPesan('')
                    }}
                    className={`flex items-center justify-between gap-2 min-h-13 px-3 py-2 rounded-xl text-left ${
                      aktif ? 'border-2 border-primary bg-blue-50' : 'border border-line bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span>
                      <span className="block text-sm font-bold">{r.nama}</span>
                      <span className="block text-xs text-muted">
                        Lantai {r.lantai} · {r.jumlahFasilitas} fasilitas
                      </span>
                    </span>
                    <span className={`size-2.5 rounded-full ${STATUS[r.status].dot}`} />
                  </button>
                )
              })}
          </div>
        </section>

        {/* Fasilitas ruangan terpilih */}
        <section aria-label="Fasilitas ruangan" className="flex-[999_1_640px] min-w-0 flex flex-col gap-4">
          <div className="bg-white border border-line rounded-2xl px-5 py-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <span className="size-13 rounded-xl bg-primary-soft text-primary grid place-items-center">
                <DoorOpen size={26} />
              </span>
              <div>
                <p className="text-xl font-extrabold flex items-center gap-2.5">
                  {ruangAktif.nama} <StatusBadge status={ruangAktif.status} />
                </p>
                <p className="text-[13px] text-muted">
                  GD-04 | Lantai {ruangAktif.lantai} | {ruangAktif.jenis}
                  {ruangAktif.kapasitas ? ` | Kapasitas: ${ruangAktif.kapasitas} orang` : ''}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-[13px] text-slate-600">
                <b>{milikRuang.length}</b> fasilitas · <b className="text-bad-ink">{ruangAktif.jumlahMasalah}</b> bermasalah
              </span>
              {bisa('kelolaData') && (
                <button
                  type="button"
                  onClick={() => {
                    setForm(FORM_KOSONG)
                    setError('')
                    setFormTerbuka(true)
                  }}
                  className={tombolUtama}
                >
                  <Plus size={18} /> Tambah Fasilitas
                </button>
              )}
            </div>
          </div>

          <div className="bg-white border border-line rounded-2xl py-2">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm border-collapse">
                <thead>
                  <tr className="text-left text-slate-600 text-[13px] border-b border-line">
                  {['Fasilitas', 'Kategori', 'Jumlah', 'Kode Aset / QR', 'Kondisi', 'Terakhir Dicek', 'Aksi']
                      .filter((h) => h !== 'Aksi' || bisa('kelolaData'))
                      .map((h) => (
                      <th key={h} className="px-4 py-3 font-bold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {milikRuang.map((f) => (
                    <tr key={f.id} className={`border-b border-slate-100 ${f.baru ? 'bg-ok-soft/50' : ''}`}>
                      <td className="px-4 py-3 font-bold">{f.nama}</td>
                      <td className="px-4 py-3">{f.kategori}</td>
                      <td className="px-4 py-3">
                        {f.jumlah} {f.satuan}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-mono px-2 py-1 rounded-md bg-slate-100 text-slate-700">
                          <QrCode size={14} />
                          {f.kodeAset}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={f.kondisi} />
                      </td>
                      <td className="px-4 py-3 text-muted">{f.terakhirDicek}</td>
                                           {bisa('kelolaData') && (
                        <td className="px-4 py-2">
                          <div className="flex gap-1.5">
                            <button type="button" aria-label={`Ubah ${f.nama}`} className="size-9 grid place-items-center rounded-lg border border-slate-200 hover:bg-slate-50">
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              aria-label={`Hapus ${f.nama}`}
                              onClick={() => hapusFasilitas(f.id)}
                              className="size-9 grid place-items-center rounded-lg border border-red-200 text-red-700 hover:bg-red-50"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  {milikRuang.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-muted">
                        Belum ada fasilitas. Klik "Tambah Fasilitas" untuk menambahkan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      {formTerbuka && (
        <Modal
          judul="Tambah Fasilitas"
          keterangan={`Ke ruangan: ${ruangAktif.nama}`}
          tutup={() => setFormTerbuka(false)}
          footer={
            <>
              <button type="button" onClick={() => setFormTerbuka(false)} className={tombolKedua}>
                Batal
              </button>
              <button type="button" onClick={simpan} className={tombolUtama}>
                Simpan Fasilitas
              </button>
            </>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={`${gayaLabel} sm:col-span-2`}>
              Nama fasilitas *
              <input className={gayaInput} value={form.nama} onChange={ubah('nama')} placeholder="Contoh: AC, Proyektor, Kursi Mahasiswa" />
            </label>
            <label className={gayaLabel}>
              Kategori
              <select className={gayaInput} value={form.kategori} onChange={ubah('kategori')}>
                {KATEGORI.map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <label className={gayaLabel}>
                Jumlah *
                <input type="number" min="1" className={gayaInput} value={form.jumlah} onChange={ubah('jumlah')} />
              </label>
              <label className={gayaLabel}>
                Satuan
                <select className={gayaInput} value={form.satuan} onChange={ubah('satuan')}>
                  {SATUAN.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
            </div>

            <fieldset className="sm:col-span-2">
              <legend className="text-[13px] font-semibold mb-2">Kondisi awal</legend>
              <div className="grid grid-cols-3 gap-2">
                {['baik', 'perawatan', 'rusak'].map((k) => {
                  const aktif = form.kondisi === k
                  const warna = {
                    baik: 'border-ok bg-ok-soft text-ok-ink',
                    perawatan: 'border-warn bg-warn-soft text-warn-ink',
                    rusak: 'border-bad bg-bad-soft text-bad-ink',
                  }[k]
                  return (
                    <button
                      key={k}
                      type="button"
                      aria-pressed={aktif}
                      onClick={() => setForm({ ...form, kondisi: k })}
                      className={`min-h-11 rounded-xl text-sm font-semibold ${aktif ? `border-2 ${warna}` : 'border border-slate-300 text-slate-600'}`}
                    >
                      {STATUS[k].label}
                    </button>
                  )
                })}
              </div>
            </fieldset>

            <div className="sm:col-span-2 flex items-center gap-3.5 p-3.5 rounded-xl bg-slate-50 border border-line">
              <span className="size-14 rounded-lg bg-white border border-line grid place-items-center">
                <QrCode size={32} />
              </span>
              <div>
                <p className="text-[13px] font-semibold">Kode aset &amp; QR dibuat otomatis</p>
                <p className="text-[13px] font-mono text-slate-700">{kodeAset}</p>
                <p className="text-xs text-muted">QR dapat dicetak dan ditempel di fasilitas untuk rapid inspection.</p>
              </div>
            </div>

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
