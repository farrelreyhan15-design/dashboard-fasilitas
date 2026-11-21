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

// Aturan inti skripsi (sama dengan aturan di database):
//   - ada fasilitas yang rusak SELURUH unitnya  -> 'rusak'     (Tidak Dapat Digunakan)
//   - ada fasilitas perawatan / rusak sebagian  -> 'perawatan' (Bermasalah)
//   - semua fasilitas baik                      -> 'baik'
//   - belum punya data fasilitas                -> 'belum'     (Belum Diinspeksi)
export function hitungStatusRuang(daftarFasilitas) {
  if (daftarFasilitas.length === 0) return 'belum'
  if (daftarFasilitas.some((f) => f.kondisi === 'rusak' && (f.jumlahRusak || f.jumlah) >= f.jumlah)) return 'rusak'
  if (daftarFasilitas.some((f) => f.kondisi !== 'baik')) return 'perawatan'
  return 'baik'
}

const BUCKET_FOTO = 'dokumentasi-inspeksi'

// Memperkecil foto dari kamera HP (bisa 5-10 MB) menjadi maksimal 1280 px, format JPEG
async function kecilkanFoto(file) {
  try {
    const gambar = await createImageBitmap(file)
    const skala = Math.min(1, 1280 / Math.max(gambar.width, gambar.height))
    const kanvas = document.createElement('canvas')
    kanvas.width = Math.round(gambar.width * skala)
    kanvas.height = Math.round(gambar.height * skala)
    kanvas.getContext('2d').drawImage(gambar, 0, 0, kanvas.width, kanvas.height)
    return await new Promise((selesai) => kanvas.toBlob(selesai, 'image/jpeg', 0.8))
  } catch {
    return file // kalau gagal diperkecil, kirim foto aslinya
  }
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
    jumlahRusak: f.jumlah_rusak ?? 0,
    satuan: f.satuan,
    kondisi: f.kondisi,
    catatan: f.catatan ?? '',
    terakhirDicek: formatTanggal(f.diperbarui_pada),
  }
}

function inspeksiDariDb(i) {
  return {
    id: String(i.id),
    ruangId: String(i.ruangan_id),
    pemeriksa: i.nama_pemeriksa,
    peran: i.peran,
    catatan: i.catatan ?? '',
    kondisiRuangan: i.kondisi_ruangan,
    durasiDetik: i.durasi_detik,
    foto: (i.foto ?? []).map((path) => supabase.storage.from(BUCKET_FOTO).getPublicUrl(path).data.publicUrl),
    waktu: formatTanggal(i.waktu),
    waktuAsli: i.waktu,
    detail: (i.inspeksi_detail ?? []).map((d) => ({
      nama: d.nama_fasilitas,
      kondisi: d.kondisi,
      jumlah: d.jumlah_rusak,
      catatan: d.catatan ?? '',
    })),
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
  const [inspeksi, setInspeksi] = useState([])
  const [memuat, setMemuat] = useState(true)
  const [galatMuat, setGalatMuat] = useState('')

  // Ambil semua data setiap kali ada pengguna yang login
  const idPengguna = pengguna?.id
  useEffect(() => {
    if (!idPengguna) return
    let masihTerpasang = true

    async function muat() {
      const [hasilRuang, hasilFasilitas, hasilAktivitas, hasilInspeksi] = await Promise.all([
        supabase.from('ruangan').select('*').order('kampus').order('gedung').order('ruangan'),
        supabase.from('fasilitas').select('*').order('id'),
        supabase.from('aktivitas').select('*').order('waktu', { ascending: false }).limit(20),
        supabase.from('inspeksi').select('*').order('waktu', { ascending: false }).limit(1000),
      ])
      if (!masihTerpasang) return

      const galat = hasilRuang.error ?? hasilFasilitas.error ?? hasilAktivitas.error ?? hasilInspeksi.error
      setGalatMuat(galat ? `Gagal memuat data: ${galat.message}` : '')
      setRuang((hasilRuang.data ?? []).map(ruangDariDb))
      setFasilitas((hasilFasilitas.data ?? []).map(fasilitasDariDb))
      setAktivitas((hasilAktivitas.data ?? []).map(aktivitasDariDb))
      setInspeksi((hasilInspeksi.data ?? []).map(inspeksiDariDb))
      setMemuat(false)
    }

    muat()
    return () => {
      masihTerpasang = false
    }
  }, [idPengguna])

  // Ruang lengkap dengan status, jumlah fasilitas, dan inspeksi terakhirnya
  const ruangDenganStatus = useMemo(
    () =>
      ruang.map((r) => {
        const milik = fasilitas.filter((f) => f.ruangId === r.id)
        const terakhir = inspeksi.find((i) => i.ruangId === r.id) // daftar inspeksi sudah urut dari yang terbaru
        return {
          ...r,
          jumlahFasilitas: milik.length,
          jumlahMasalah: milik.filter((f) => f.kondisi !== 'baik').length,
          status: hitungStatusRuang(milik),
          inspeksiTerakhir: terakhir ? `${terakhir.waktu} oleh ${terakhir.pemeriksa}` : null,
        }
      }),
    [ruang, fasilitas, inspeksi],
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

  // ===== Rapid Inspection =====
  // hasil = [{ fasilitasId, kondisi, jumlah, catatan }, ...], daftarFoto = file gambar dari HP/laptop
  async function simpanInspeksi(ruangId, catatan, hasil, durasiDetik, daftarFoto = []) {
    // 1) Unggah foto dulu ke Storage, di folder milik akun yang login
    const pathFoto = []
    for (const [urutan, file] of daftarFoto.entries()) {
      const foto = await kecilkanFoto(file)
      const path = `${pengguna.id}/${Date.now()}-${urutan + 1}.jpg`
      const { error } = await supabase.storage.from(BUCKET_FOTO).upload(path, foto, { contentType: 'image/jpeg' })
      if (error) return { error: `Foto ke-${urutan + 1} gagal diunggah: ${error.message}` }
      pathFoto.push(path)
    }

    // 2) Simpan hasil inspeksi lewat fungsi database
    const { error } = await supabase.rpc('simpan_inspeksi', {
      p_ruangan_id: Number(ruangId),
      p_catatan: catatan,
      p_hasil: hasil.map((h) => ({
        fasilitas_id: Number(h.fasilitasId),
        kondisi: h.kondisi,
        jumlah: h.kondisi === 'baik' ? null : Number(h.jumlah),
        catatan: h.catatan,
      })),
      p_durasi: durasiDetik,
      p_foto: pathFoto,
    })
    if (error) return { error: error.code === 'P0001' ? error.message : pesanGalat(error) }

    // Ambil ulang data yang berubah: fasilitas ruangan ini, inspeksi terbaru, aktivitas terbaru
    const [hasilFasilitas, hasilInspeksi, hasilAktivitas] = await Promise.all([
      supabase.from('fasilitas').select('*').eq('ruangan_id', Number(ruangId)).order('id'),
      supabase.from('inspeksi').select('*').order('waktu', { ascending: false }).limit(1000),
      supabase.from('aktivitas').select('*').order('waktu', { ascending: false }).limit(20),
    ])
    if (hasilFasilitas.data) {
      const baru = hasilFasilitas.data.map(fasilitasDariDb)
      setFasilitas((lama) => [...lama.filter((f) => f.ruangId !== ruangId), ...baru])
    }
    if (hasilInspeksi.data) setInspeksi(hasilInspeksi.data.map(inspeksiDariDb))
    if (hasilAktivitas.data) setAktivitas(hasilAktivitas.data.map(aktivitasDariDb))
    return {}
  }

  // Riwayat inspeksi satu ruangan, lengkap dengan detail fasilitasnya
  async function ambilRiwayatInspeksi(ruangId) {
    const { data, error } = await supabase
      .from('inspeksi')
      .select('*, inspeksi_detail(nama_fasilitas, kondisi, jumlah_rusak, catatan)')
      .eq('ruangan_id', Number(ruangId))
      .order('waktu', { ascending: false })
      .limit(50)
    if (error) return { error: error.message, data: [] }
    return { data: data.map(inspeksiDariDb) }
  }

  const nilai = {
    ruang: ruangDenganStatus,
    fasilitas,
    aktivitas,
    inspeksi,
    simpanInspeksi,
    ambilRiwayatInspeksi,
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
