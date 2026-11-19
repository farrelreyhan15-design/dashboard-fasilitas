import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, Search, Pencil, Trash2, CheckCircle2, X } from 'lucide-react'
import Header from '../components/Header.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import Modal, { gayaInput, gayaLabel, tombolUtama, tombolKedua } from '../components/Modal.jsx'
import { useData } from '../context/DataContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { FASILITAS_STANDAR, JENIS_RUANG } from '../data/dataAwal.js'

const FORM_KOSONG = {
  kode: '',
  nama: '',
  lantai: '1',
  jenis: 'Ruang Kuliah',
  kapasitas: '',
  fasilitasDipilih: ['AC', 'Proyektor', 'Lampu', 'Kursi Mahasiswa'],
}

export default function DataRuangan() {
  const { ruang, tambahRuang } = useData()
  const { bisa } = useAuth()
  const [params] = useSearchParams()
  const [cari, setCari] = useState(params.get('cari') ?? '')
  const [filterLantai, setFilterLantai] = useState('Semua')
  const [formTerbuka, setFormTerbuka] = useState(false)
  const [form, setForm] = useState(FORM_KOSONG)
  const [error, setError] = useState('')
  const [pesan, setPesan] = useState('')

  const ubah = (kolom) => (e) => setForm({ ...form, [kolom]: e.target.value })

  function pilihFasilitas(nama) {
    const sudah = form.fasilitasDipilih.includes(nama)
    setForm({
      ...form,
      fasilitasDipilih: sudah ? form.fasilitasDipilih.filter((n) => n !== nama) : [...form.fasilitasDipilih, nama],
    })
  }

  function simpan() {
    const kode = form.kode.trim()
    if (!kode || !form.nama.trim()) return setError('Kode dan nama ruangan wajib diisi.')
    if (ruang.some((r) => r.kode === kode)) return setError(`Kode ${kode} sudah dipakai ruangan lain.`)

    const daftar = FASILITAS_STANDAR.filter(([nama]) => form.fasilitasDipilih.includes(nama)).map(
      ([nama, kategori, jumlah, satuan, singkat]) => ({ nama, kategori, jumlah, satuan, singkat }),
    )
    tambahRuang(
      {
        kode,
        nama: form.nama.trim(),
        lantai: Number(form.lantai),
        jenis: form.jenis,
        kapasitas: Number(form.kapasitas) || null,
      },
      daftar,
    )
    setPesan(`${form.nama.trim()} berhasil ditambahkan dengan ${daftar.length} fasilitas.`)
    setFormTerbuka(false)
  }

  const ruangTampil = ruang.filter(
    (r) =>
      (filterLantai === 'Semua' || `Lantai ${r.lantai}` === filterLantai) &&
      (r.nama + r.kode).toLowerCase().includes(cari.toLowerCase()),
  )

  return (
    <>
      <Header judul="Data Ruangan" subjudul="Kelola daftar ruangan Gedung 4 beserta fasilitasnya" />

      {pesan && (
        <div role="status" className="flex items-center gap-3 p-3.5 rounded-xl bg-ok-soft border border-green-200 text-ok-ink">
          <CheckCircle2 size={22} />
          <span className="flex-1 text-sm font-semibold">{pesan}</span>
          <Link to="/fasilitas" className="text-sm font-bold underline">
            Atur fasilitas
          </Link>
          <button type="button" aria-label="Tutup pemberitahuan" onClick={() => setPesan('')} className="size-9 grid place-items-center">
            <X size={18} />
          </button>
        </div>
      )}

      <section aria-label="Daftar ruangan" className="bg-white border border-line rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex flex-wrap gap-2.5 items-center">
          <label className="flex-[1_1_260px] flex items-center gap-2.5 min-h-11 px-3.5 border border-slate-200 rounded-xl text-muted">
            <Search size={18} />
            <input
              type="search"
              aria-label="Cari ruangan"
              placeholder="Cari ruangan atau kode..."
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              className="flex-1 min-w-0 bg-transparent outline-none text-sm text-ink"
            />
          </label>
          <select aria-label="Filter lantai" value={filterLantai} onChange={(e) => setFilterLantai(e.target.value)} className={`${gayaInput} w-auto`}>
            <option>Semua</option>
            <option>Lantai 1</option>
            <option>Lantai 2</option>
            <option>Lantai 3</option>
          </select>
          {bisa('kelolaData') && (
            <button
              type="button"
              onClick={() => {
                setForm(FORM_KOSONG)
                setError('')
                setFormTerbuka(true)
              }}
              className={`${tombolUtama} sm:ml-auto`}
            >
              <Plus size={18} /> Tambah Ruangan
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm border-collapse">
            <thead>
              <tr className="text-left bg-slate-50 text-slate-600 text-[13px]">
                {['Kode', 'Nama Ruangan', 'Lantai', 'Jenis', 'Kapasitas', 'Fasilitas', 'Kondisi', 'Aksi'].map((h) => (
                  <th key={h} className="px-3.5 py-3 font-bold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ruangTampil.map((r) => (
                <tr key={r.id} className={`border-b border-slate-100 ${r.baru ? 'bg-ok-soft/50' : ''}`}>
                  <td className="px-3.5 py-3 text-muted">GD04-{r.kode}</td>
                  <td className="px-3.5 py-3 font-bold">{r.nama}</td>
                  <td className="px-3.5 py-3">Lantai {r.lantai}</td>
                  <td className="px-3.5 py-3">{r.jenis}</td>
                  <td className="px-3.5 py-3">{r.kapasitas ? `${r.kapasitas} orang` : '-'}</td>
                  <td className="px-3.5 py-3">{r.jumlahFasilitas} item</td>
                  <td className="px-3.5 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-3.5 py-2">
                    <div className="flex gap-1.5">
                      <Link
                        to={`/fasilitas?ruang=${r.id}`}
                        className="inline-flex items-center min-h-9 px-3 rounded-lg border border-primary/30 text-primary text-[13px] font-semibold hover:bg-primary-soft"
                      >
                        Fasilitas
                      </Link>
                      {bisa('kelolaData') && (
                        <>
                          <button type="button" aria-label={`Ubah ${r.nama}`} className="size-9 grid place-items-center rounded-lg border border-slate-200 hover:bg-slate-50">
                            <Pencil size={15} />
                          </button>
                          <button type="button" aria-label={`Hapus ${r.nama}`} className="size-9 grid place-items-center rounded-lg border border-red-200 text-red-700 hover:bg-red-50">
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[13px] text-muted">Menampilkan {ruangTampil.length} ruangan</p>
      </section>

      {formTerbuka && (
        <Modal
          judul="Tambah Ruangan"
          keterangan='Ruangan baru langsung muncul di dashboard dengan status "Belum Diinspeksi".'
          tutup={() => setFormTerbuka(false)}
          footer={
            <>
              <button type="button" onClick={() => setFormTerbuka(false)} className={tombolKedua}>
                Batal
              </button>
              <button type="button" onClick={simpan} className={tombolUtama}>
                Simpan Ruangan
              </button>
            </>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={gayaLabel}>
              Kode ruangan *
              <input className={gayaInput} value={form.kode} onChange={ubah('kode')} placeholder="Contoh: 4.307" />
            </label>
            <label className={gayaLabel}>
              Nama ruangan *
              <input className={gayaInput} value={form.nama} onChange={ubah('nama')} placeholder="Contoh: R. 4.307" />
            </label>
            <label className={gayaLabel}>
              Gedung
              <select className={gayaInput} disabled>
                <option>Gedung 4 (GD-04)</option>
              </select>
            </label>
            <label className={gayaLabel}>
              Lantai
              <select className={gayaInput} value={form.lantai} onChange={ubah('lantai')}>
                <option value="1">Lantai 1</option>
                <option value="2">Lantai 2</option>
                <option value="3">Lantai 3</option>
              </select>
            </label>
            <label className={gayaLabel}>
              Jenis ruangan
              <select className={gayaInput} value={form.jenis} onChange={ubah('jenis')}>
                {JENIS_RUANG.map((j) => (
                  <option key={j}>{j}</option>
                ))}
              </select>
            </label>
            <label className={gayaLabel}>
              Kapasitas (orang)
              <input type="number" min="1" className={gayaInput} value={form.kapasitas} onChange={ubah('kapasitas')} placeholder="40" />
            </label>

            <fieldset className="sm:col-span-2 flex flex-col gap-2.5">
              <legend className="text-[13px] font-semibold mb-2">Fasilitas awal (jumlah bisa diatur di Data Fasilitas)</legend>
              <div className="flex flex-wrap gap-2">
                {FASILITAS_STANDAR.map(([nama]) => {
                  const aktif = form.fasilitasDipilih.includes(nama)
                  return (
                    <button
                      key={nama}
                      type="button"
                      aria-pressed={aktif}
                      onClick={() => pilihFasilitas(nama)}
                      className={`min-h-10 px-3.5 rounded-full text-[13px] font-semibold ${
                        aktif ? 'border-2 border-primary bg-primary-soft text-primary-dark' : 'border border-slate-300 text-slate-600'
                      }`}
                    >
                      {nama}
                    </button>
                  )
                })}
              </div>
            </fieldset>

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