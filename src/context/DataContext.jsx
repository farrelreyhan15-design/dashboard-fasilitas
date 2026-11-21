import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from './AuthContext.jsx'
import { buatId } from '../data/konstanta.js'

/*
  Tempat menyimpan data bersama (ruang, fasilitas, aktivitas)
  supaya semua halaman memakai data yang sama.
  Data diambil dari database Supabase setelah pengguna login,
  dan setiap perubahan langsung disimpan ke database.
*/

const DataContext = createContext(null)

// Aturan inti skripsi: status ruang = kondisi fasilitas terburuk di ruang itu.
// Ruang yang belum punya data fasilitas berstatus "Belum Diinspeksi".
export function hitungStatusRuang(daftarFasilitas) {
  if (daftarFasilitas.length === 0) return 'belum'
  if (daftarFasilitas.some((f) => f.kondisi === 'rusak')) return 'rusak'
  if (daftarFasilitas.some((f) => f.kondisi === 'perawatan')) return 'perawatan'
  return 'baik'
}

// ===== Penerjemah: nama kolom database (snake_case) <-> nama di aplikasi (camelCase) =====

function formatTanggal(waktu) {
  if (!waktu) return '-'
  return new Date(waktu).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ruangDariDb(r) {
  return {
    id: String(r.id),
    nama: r.nama,
    kampus: `Kampus ${r.kampus}`,
    gedung: r.gedung,
    ruangan: r.ruangan,
    lantai: r.lantai,
    jenis: r.jenis,
    kapasitas: r.kapasitas,
    satuanKapasitas: r.satuan_kapasitas,
    luas: r.luas,
    penanggungJawab: r.penanggung_jawab ?? '',
    deskripsi: r.deskripsi ?? '',
    inspeksiTerakhir: null,
  }
}

function ruangKeDb(data) {
  return {
    kampus: data.kampus.replace('Kampus ', ''),
    gedung: data.gedung,
    ruangan: data.ruangan,
    lantai: data.lantai,
    jenis: data.jenis,
    kapasitas: data.kapasitas,
    satuan_kapasitas: data.satuanKapasitas,
    luas: data.luas,
    penanggung_jawab: data.penanggungJawab || null,
    deskripsi: data.deskripsi || null,
  }
}

function fasilitasDariDb(f) {
  return {
    id: String(f.id),
    ruangId: String(f.ruangan_id),
    kodeAset: f.kode_aset ?? '-',
    nama: f.nama,
    kategori: f.kategori,
    jumlah: f.jumlah,
    satuan: f.satuan,
    kondisi: f.kondisi,
    catatan: f.catatan ?? '',
    terakhirDicek: formatTanggal(f.diperbarui_pada),
  }
}

function aktivitasDariDb(a) {
  return { id: a.id, teks: a.teks, oleh: a.oleh, waktu: formatTanggal(a.waktu) }
}

// Pesan kesalahan yang mudah dipahami pengguna
function pesanGalat(error) {
  if (error.code === '23505') return 'Data dengan nama atau kode yang sama sudah terdaftar.'
  if (error.code === '42501') return 'Akun ini tidak punya izin untuk melakukan perubahan ini.'
  return `Gagal menyimpan ke database: ${error.message}`
}

export function DataProvider({ children }) {
  const { pengguna } = useAuth()
  const [ruang, setRuang] = useState([])
  const [fasilitas, setFasilitas] = useState([])
  const [aktivitas, setAktivitas] = useState([])
  const [memuat, setMemuat] = useState(true)
  const [galatMuat, setGalatMuat] = useState('')

  // Ambil semua data setiap kali ada pengguna yang login
  const idPengguna = pengguna?.id
  useEffect(() => {
    if (!idPengguna) return
    let masihTerpasang = true

    async function muat() {
      const [hasilRuang, hasilFasilitas, hasilAktivitas] = await Promise.all([
        supabase.from('ruangan').select('*').order('kampus').order('gedung').order('ruangan'),
        supabase.from('fasilitas').select('*').order('id'),
        supabase.from('aktivitas').select('*').order('waktu', { ascending: false }).limit(20),
      ])
      if (!masihTerpasang) return

      const galat = hasilRuang.error ?? hasilFasilitas.error ?? hasilAktivitas.error
      setGalatMuat(galat ? `Gagal memuat data: ${galat.message}` : '')
      setRuang((hasilRuang.data ?? []).map(ruangDariDb))
      setFasilitas((hasilFasilitas.data ?? []).map(fasilitasDariDb))
      setAktivitas((hasilAktivitas.data ?? []).map(aktivitasDariDb))
      setMemuat(false)
    }

    muat()
    return () => {
      masihTerpasang = false
    }
  }, [idPengguna])

  // Ruang lengkap dengan status dan jumlah fasilitasnya
  const ruangDenganStatus = useMemo(
    () =>
      ruang.map((r) => {
        const milik = fasilitas.filter((f) => f.ruangId === r.id)
        return {
          ...r,
          jumlahFasilitas: milik.length,
          jumlahMasalah: milik.filter((f) => f.kondisi !== 'baik').length,
          status: hitungStatusRuang(milik),
        }
      }),
    [ruang, fasilitas],
  )

  // Mencatat aktivitas ke database dan menampilkannya di dashboard
  async function catat(teks) {
    const { data } = await supabase
      .from('aktivitas')
      .insert({ teks, oleh: pengguna?.nama ?? 'Pengguna' })
      .select()
      .single()
    if (data) setAktivitas((lama) => [aktivitasDariDb(data), ...lama])
  }

  // ===== Ruangan =====
  // Semua fungsi mengembalikan { error } kalau gagal

  async function tambahRuang(data, daftarFasilitasAwal) {
    const { data: baru, error } = await supabase.from('ruangan').insert(ruangKeDb(data)).select().single()
    if (error) return { error: pesanGalat(error) }

    const ruangBaru = ruangDariDb(baru)
    setRuang((lama) => [ruangBaru, ...lama])

    if (daftarFasilitasAwal.length) {
      const kode = buatId(baru.nama).toUpperCase()
      const { data: fasilitasBaru } = await supabase
        .from('fasilitas')
        .insert(
          daftarFasilitasAwal.map((f) => ({
            ruangan_id: baru.id,
            nama: f.nama,
            kategori: f.kategori,
            jumlah: f.jumlah,
            satuan: f.satuan,
            kondisi: 'baik',
            kode_aset: `${kode}-${f.singkat}-01`,
          })),
        )
        .select()
      if (fasilitasBaru) setFasilitas((lama) => [...lama, ...fasilitasBaru.map(fasilitasDariDb)])
    }

    await catat(`Ruangan baru ditambahkan: ${baru.nama}`)
    return { id: ruangBaru.id }
  }

  async function ubahRuang(id, data) {
    const { data: hasil, error } = await supabase
      .from('ruangan')
      .update(ruangKeDb(data))
      .eq('id', Number(id))
      .select()
      .single()
    if (error) return { error: pesanGalat(error) }

    setRuang((lama) => lama.map((r) => (r.id === id ? ruangDariDb(hasil) : r)))
    await catat(`Data ruangan diperbarui: ${hasil.nama}`)
    return {}
  }

  // ===== Fasilitas =====

  async function tambahFasilitas(data) {
    const { data: baru, error } = await supabase
      .from('fasilitas')
      .insert({
        ruangan_id: Number(data.ruangId),
        nama: data.nama,
        kategori: data.kategori,
        jumlah: data.jumlah,
        satuan: data.satuan,
        kondisi: data.kondisi,
        kode_aset: data.kodeAset,
      })
      .select()
      .single()
    if (error) return { error: pesanGalat(error) }

    setFasilitas((lama) => [...lama, fasilitasDariDb(baru)])
    const namaRuang = ruang.find((r) => r.id === data.ruangId)?.nama ?? ''
    await catat(`Fasilitas ditambahkan: ${data.jumlah} ${data.satuan} ${data.nama} di ${namaRuang}`)
    return {}
  }

  async function hapusFasilitas(id) {
    const { error } = await supabase.from('fasilitas').delete().eq('id', Number(id))
    if (error) return { error: pesanGalat(error) }

    const dihapus = fasilitas.find((f) => f.id === id)
    setFasilitas((lama) => lama.filter((f) => f.id !== id))
    if (dihapus) await catat(`Fasilitas dihapus: ${dihapus.nama} (${dihapus.kodeAset})`)
    return {}
  }

  const nilai = {
    ruang: ruangDenganStatus,
    fasilitas,
    aktivitas,
    memuat,
    galatMuat,
    tambahRuang,
    ubahRuang,
    tambahFasilitas,
    hapusFasilitas,
  }
  return <DataContext.Provider value={nilai}>{children}</DataContext.Provider>
}

export function useData() {
  return useContext(DataContext)
}
