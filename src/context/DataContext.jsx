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

// Alamat publik foto di Storage
const urlFoto = (path) => supabase.storage.from(BUCKET_FOTO).getPublicUrl(path).data.publicUrl

// Nama kondisi untuk catatan aktivitas
const STATUS_TEKS = { baik: 'Baik', perawatan: 'Bermasalah', rusak: 'Rusak', maintenance: 'Maintenance' }

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
    lacakPerUnit: f.lacak_per_unit ?? false,
    terakhirDicek: formatTanggal(f.diperbarui_pada),
    // Data inventaris
    merek: f.merek ?? '',
    model: f.model ?? '',
    spesifikasi: f.spesifikasi ?? '',
    tahunPengadaan: f.tahun_pengadaan ?? '',
    asalPerolehan: f.asal_perolehan ?? '',
    hargaSatuan: f.harga_satuan ?? null,
    sumberDana: f.sumber_dana ?? '',
    penanggungJawab: f.penanggung_jawab ?? '',
    keterangan: f.keterangan ?? '',
    foto: f.foto ?? [],
    fotoUrl: (f.foto ?? []).map(urlFoto),
  }
}

function unitDariDb(u) {
  return {
    id: String(u.id),
    fasilitasId: String(u.fasilitas_id),
    urutan: u.urutan,
    kodeAset: u.kode_aset,
    posisi: u.posisi ?? '',
    merek: u.merek ?? '',
    model: u.model ?? '',
    spesifikasi: u.spesifikasi ?? '',
    nomorSeri: u.nomor_seri ?? '',
    tahunPengadaan: u.tahun_pengadaan ?? '',
    kondisi: u.kondisi,
    catatan: u.catatan ?? '',
    terakhirDiubah: formatTanggal(u.diperbarui_pada),
    // Data inventaris per unit (kosong = mengikuti data kelompoknya)
    asalPerolehan: u.asal_perolehan ?? '',
    hargaPerolehan: u.harga_perolehan ?? null,
    sumberDana: u.sumber_dana ?? '',
    foto: u.foto ?? [],
    fotoUrl: (u.foto ?? []).map(urlFoto),
  }
}

// Isian form unit -> kolom database (yang kosong disimpan sebagai null)
function unitKeDb(data) {
  const kosongJadiNull = (teks) => (String(teks ?? '').trim() === '' ? null : String(teks).trim())
  return {
    posisi: kosongJadiNull(data.posisi),
    merek: kosongJadiNull(data.merek),
    model: kosongJadiNull(data.model),
    spesifikasi: kosongJadiNull(data.spesifikasi),
    nomor_seri: kosongJadiNull(data.nomorSeri),
    tahun_pengadaan: data.tahunPengadaan ? Number(data.tahunPengadaan) : null,
    asal_perolehan: data.asalPerolehan || null,
    harga_perolehan: angkaAtauNull(data.hargaPerolehan),
    sumber_dana: kosongJadiNull(data.sumberDana),
  }
}

const angkaAtauNull = (nilai) => (nilai === '' || nilai === null || nilai === undefined ? null : Number(nilai))

// Isian data inventaris kelompok fasilitas -> kolom database
function inventarisKeDb(data) {
  const kosongJadiNull = (teks) => (String(teks ?? '').trim() === '' ? null : String(teks).trim())
  return {
    merek: kosongJadiNull(data.merek),
    model: kosongJadiNull(data.model),
    spesifikasi: kosongJadiNull(data.spesifikasi),
    tahun_pengadaan: data.tahunPengadaan ? Number(data.tahunPengadaan) : null,
    asal_perolehan: data.asalPerolehan || null,
    harga_satuan: angkaAtauNull(data.hargaSatuan),
    sumber_dana: kosongJadiNull(data.sumberDana),
    penanggung_jawab: kosongJadiNull(data.penanggungJawab),
    keterangan: kosongJadiNull(data.keterangan),
  }
}

// Kode unit: kode kelompok + nomor urut, contoh "G4-R1-AC" + 2 -> "G4-R1-AC-02"
const kodeUnit = (kodeKelompok, urutan) => `${kodeKelompok}-${String(urutan).padStart(2, '0')}`

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

function laporanDariDb(l) {
  return {
    id: String(l.id),
    ruangId: String(l.ruangan_id),
    fasilitasId: l.fasilitas_id ? String(l.fasilitas_id) : null,
    namaFasilitas: l.nama_fasilitas,
    sumber: l.sumber,
    kondisi: l.kondisi,
    jumlah: l.jumlah,
    catatan: l.catatan ?? '',
    foto: (l.foto ?? []).map(urlFoto),
    status: l.status,
    pelapor: l.nama_pelapor,
    peranPelapor: l.peran_pelapor,
    penangan: l.penangan ?? '',
    tindakLanjut: l.tindak_lanjut ?? '',
    dibuat: formatTanggal(l.dibuat_pada),
    diproses: l.diproses_pada ? formatTanggal(l.diproses_pada) : '',
    selesai: l.selesai_pada ? formatTanggal(l.selesai_pada) : '',
    dibuatAsli: l.dibuat_pada,
    selesaiAsli: l.selesai_pada,
    unitIds: (l.laporan_unit ?? []).map((u) => String(u.unit_id)),
    jenis: l.jenis ?? 'korektif',
    prioritas: l.prioritas ?? 'sedang',
    petugasVerifikasiId: l.petugas_verifikasi_id,
    petugasVerifikasi: l.petugas_verifikasi ?? '',
    ditugaskan: l.ditugaskan_pada ? formatTanggal(l.ditugaskan_pada) : '',
    hasilVerifikasi: l.hasil_verifikasi,
    catatanVerifikasi: l.catatan_verifikasi ?? '',
    fotoVerifikasi: (l.foto_verifikasi ?? []).map(urlFoto),
    diverifikasiOleh: l.diverifikasi_oleh ?? '',
    diverifikasi: l.diverifikasi_pada ? formatTanggal(l.diverifikasi_pada) : '',
    jenisTindakan: l.jenis_tindakan,
    teknisi: l.teknisi ?? '',
    targetSelesai: l.target_selesai, // 'YYYY-MM-DD'
    estimasiBiaya: l.estimasi_biaya === null || l.estimasi_biaya === undefined ? null : Number(l.estimasi_biaya),
    biayaAktual: l.biaya_aktual === null || l.biaya_aktual === undefined ? null : Number(l.biaya_aktual),
    hasilPerbaikan: l.hasil_perbaikan ?? '',
    fotoSesudah: (l.foto_sesudah ?? []).map(urlFoto),
    jadwalId: l.jadwal_id ? String(l.jadwal_id) : null,
  }
}

function jadwalDariDb(j) {
  return {
    id: String(j.id),
    fasilitasId: String(j.fasilitas_id),
    kegiatan: j.kegiatan,
    intervalHari: j.interval_hari,
    terakhir: j.terakhir, // 'YYYY-MM-DD' atau null
    berikutnya: j.berikutnya,
    aktif: j.aktif,
    catatan: j.catatan ?? '',
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
  const [unit, setUnit] = useState([])
  const [laporan, setLaporan] = useState([])
  const [jadwal, setJadwal] = useState([])
  const [memuat, setMemuat] = useState(true)
  const [galatMuat, setGalatMuat] = useState('')
  const [versiData, setVersiData] = useState(0) // dinaikkan untuk memuat ulang semua data
  const [statusLangsung, setStatusLangsung] = useState('menyambung') // koneksi real-time: menyambung / terhubung / terputus
  const [diperbaruiPada, setDiperbaruiPada] = useState(null) // waktu data terakhir dimuat

  // Ambil semua data setiap kali ada pengguna yang login
  const idPengguna = pengguna?.id
  useEffect(() => {
    if (!idPengguna) return
    let masihTerpasang = true

    async function muat() {
      const [hasilRuang, hasilFasilitas, hasilAktivitas, hasilInspeksi, hasilUnit] = await Promise.all([
        supabase.from('ruangan').select('*').order('kampus').order('gedung').order('ruangan'),
        supabase.from('fasilitas').select('*').order('id'),
        supabase.from('aktivitas').select('*').order('waktu', { ascending: false }).limit(20),
        supabase.from('inspeksi').select('*').order('waktu', { ascending: false }).limit(1000),
        supabase.from('unit_fasilitas').select('*').order('fasilitas_id').order('urutan'),
      ])
      if (!masihTerpasang) return

      const galat = hasilRuang.error ?? hasilFasilitas.error ?? hasilAktivitas.error ?? hasilInspeksi.error ?? hasilUnit.error
      setGalatMuat(galat ? `Gagal memuat data: ${galat.message}` : '')
      setRuang((hasilRuang.data ?? []).map(ruangDariDb))
      setFasilitas((hasilFasilitas.data ?? []).map(fasilitasDariDb))
      setAktivitas((hasilAktivitas.data ?? []).map(aktivitasDariDb))
      setInspeksi((hasilInspeksi.data ?? []).map(inspeksiDariDb))
      setUnit((hasilUnit.data ?? []).map(unitDariDb))
      await Promise.all([muatLaporan(), muatJadwal()])
      setMemuat(false)
      setDiperbaruiPada(new Date())
    }

    muat()
    return () => {
      masihTerpasang = false
    }
  }, [idPengguna, versiData])

  // REAL-TIME: dengarkan perubahan data dari pengguna lain, lalu muat ulang otomatis.
  // Beberapa perubahan yang datang berdekatan (mis. satu inspeksi mengubah banyak fasilitas)
  // digabung menjadi satu kali muat ulang.
  useEffect(() => {
    if (!idPengguna) return
    let jeda = null
    const muatNanti = () => {
      clearTimeout(jeda)
      jeda = setTimeout(() => setVersiData((v) => v + 1), 1200)
    }

    const kanal = supabase.channel(`data-langsung-${idPengguna}`)
    for (const tabel of ['ruangan', 'fasilitas', 'unit_fasilitas', 'inspeksi', 'laporan', 'jadwal_preventif']) {
      kanal.on('postgres_changes', { event: '*', schema: 'public', table: tabel }, muatNanti)
    }
    kanal.subscribe((status) => {
      if (status === 'SUBSCRIBED') setStatusLangsung('terhubung')
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') setStatusLangsung('terputus')
    })

    // Saat tab dibuka kembali setelah ditinggal, muat ulang supaya tidak ada yang terlewat
    const saatTerlihat = () => document.visibilityState === 'visible' && muatNanti()
    document.addEventListener('visibilitychange', saatTerlihat)

    return () => {
      clearTimeout(jeda)
      supabase.removeChannel(kanal)
      document.removeEventListener('visibilitychange', saatTerlihat)
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

  async function tambahFasilitas(data, fotoBaru = []) {
    const unggahan = await unggahFoto(fotoBaru)
    if (unggahan.error) return { error: unggahan.error }
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
        lacak_per_unit: Boolean(data.lacakPerUnit),
        ...inventarisKeDb(data),
        foto: unggahan.pathFoto,
      })
      .select()
      .single()
    if (error) return { error: pesanGalat(error) }

    setFasilitas((lama) => [...lama, fasilitasDariDb(baru)])

    // Barang yang dilacak per unit: langsung buat unitnya, contoh AC 2 unit -> -01 dan -02
    if (data.lacakPerUnit) {
      const galatUnit = await buatUnitAwal(baru)
      if (galatUnit) return { error: galatUnit }
    }

    const namaRuang = ruang.find((r) => r.id === data.ruangId)?.nama ?? ''
    await catat(`Fasilitas ditambahkan: ${data.jumlah} ${data.satuan} ${data.nama} di ${namaRuang}`)
    return { id: String(baru.id) }
  }

  // Membuat unit sebanyak "jumlah" untuk satu kelompok fasilitas (baris database)
  async function buatUnitAwal(barisFasilitas) {
    const daftar = Array.from({ length: barisFasilitas.jumlah }, (_, i) => ({
      fasilitas_id: barisFasilitas.id,
      urutan: i + 1,
      kode_aset: kodeUnit(barisFasilitas.kode_aset, i + 1),
      kondisi: barisFasilitas.kondisi,
    }))
    const { data, error } = await supabase.from('unit_fasilitas').insert(daftar).select()
    if (error) return `Fasilitas tersimpan, tetapi unitnya gagal dibuat: ${pesanGalat(error)}`
    setUnit((lama) => [...lama, ...data.map(unitDariDb)])
    return null
  }

  // Mengubah nama / kategori / satuan / data inventaris (dan jumlah, kalau tidak dilacak per unit)
  //   data.foto = path foto lama yang dipertahankan, fotoBaru = file foto yang baru dipilih
  async function ubahFasilitas(id, data, fotoBaru = []) {
    const unggahan = await unggahFoto(fotoBaru)
    if (unggahan.error) return { error: unggahan.error }
    const isian = { nama: data.nama, kategori: data.kategori, satuan: data.satuan, ...inventarisKeDb(data) }
    if (data.foto) isian.foto = [...data.foto, ...unggahan.pathFoto]
    if (data.jumlah) isian.jumlah = Number(data.jumlah)
    const { data: hasil, error } = await supabase.from('fasilitas').update(isian).eq('id', Number(id)).select().single()
    if (error) return { error: pesanGalat(error) }
    setFasilitas((lama) => lama.map((f) => (f.id === id ? fasilitasDariDb(hasil) : f)))
    await catat(`Data fasilitas diperbarui: ${hasil.nama} (${hasil.kode_aset})`)
    return {}
  }

  // Mengubah fasilitas kelompok menjadi dilacak per unit
  async function aktifkanPerUnit(id) {
    const f = fasilitas.find((x) => x.id === id)
    const kodeKelompok = f.kodeAset.replace(/-\d+$/, '')
    const { data: hasil, error } = await supabase
      .from('fasilitas')
      .update({ lacak_per_unit: true, kode_aset: kodeKelompok })
      .eq('id', Number(id))
      .select()
      .single()
    if (error) return { error: pesanGalat(error) }
    setFasilitas((lama) => lama.map((x) => (x.id === id ? fasilitasDariDb(hasil) : x)))
    const galatUnit = await buatUnitAwal({ ...hasil, kondisi: 'baik' })
    if (galatUnit) return { error: galatUnit }
    await catat(`${hasil.nama} (${hasil.kode_aset}) sekarang dicatat per unit`)
    return {}
  }

  // ===== Unit fasilitas =====

  // Jumlah di kelompok berubah otomatis (trigger database), jadi ambil ulang baris kelompoknya
  async function segarkanFasilitas(id) {
    const { data } = await supabase.from('fasilitas').select('*').eq('id', Number(id)).single()
    if (data) setFasilitas((lama) => lama.map((f) => (f.id === id ? fasilitasDariDb(data) : f)))
  }

  async function ubahUnit(id, data, fotoBaru = []) {
    const unggahan = await unggahFoto(fotoBaru)
    if (unggahan.error) return { error: unggahan.error }
    const isian = unitKeDb(data)
    if (data.foto) isian.foto = [...data.foto, ...unggahan.pathFoto]
    const { data: hasil, error } = await supabase.from('unit_fasilitas').update(isian).eq('id', Number(id)).select().single()
    if (error) return { error: pesanGalat(error) }
    setUnit((lama) => lama.map((u) => (u.id === id ? unitDariDb(hasil) : u)))
    return {}
  }

  async function tambahUnit(fasilitasId) {
    const f = fasilitas.find((x) => x.id === fasilitasId)
    const milik = unit.filter((u) => u.fasilitasId === fasilitasId)
    const urutan = Math.max(0, ...milik.map((u) => u.urutan)) + 1
    const { data: baru, error } = await supabase
      .from('unit_fasilitas')
      .insert({ fasilitas_id: Number(fasilitasId), urutan, kode_aset: kodeUnit(f.kodeAset, urutan) })
      .select()
      .single()
    if (error) return { error: pesanGalat(error) }
    setUnit((lama) => [...lama, unitDariDb(baru)])
    await segarkanFasilitas(fasilitasId)
    await catat(`Unit baru ditambahkan: ${baru.kode_aset}`)
    return { id: String(baru.id) }
  }

  async function hapusUnit(id) {
    const u = unit.find((x) => x.id === id)
    const { error } = await supabase.from('unit_fasilitas').delete().eq('id', Number(id))
    if (error) return { error: pesanGalat(error) }
    setUnit((lama) => lama.filter((x) => x.id !== id))
    await segarkanFasilitas(u.fasilitasId)
    await catat(`Unit dihapus: ${u.kodeAset}`)
    return {}
  }

  // ===== Perubahan kondisi oleh Sarpras (termasuk Maintenance) =====

  // Untuk fasilitas yang dicatat per KELOMPOK (kursi, lampu, ...)
  async function ubahKondisiFasilitas(id, kondisi, jumlah, catatan) {
    const { error } = await supabase.rpc('ubah_kondisi_fasilitas', {
      p_fasilitas_id: Number(id),
      p_kondisi: kondisi,
      p_jumlah: kondisi === 'baik' ? null : Number(jumlah),
      p_catatan: catatan,
    })
    if (error) return { error: error.code === 'P0001' ? error.message : pesanGalat(error) }
    await segarkanFasilitas(id)
    const f = fasilitas.find((x) => x.id === id)
    await catat(`Kondisi ${f?.nama} (${f?.kodeAset}) diubah menjadi ${STATUS_TEKS[kondisi]}`)
    return {}
  }

  // Untuk satu UNIT (AC-01, AC-02, ...). Kondisi kelompoknya dihitung ulang oleh database.
  async function ubahKondisiUnit(unitId, kondisi, catatan) {
    const { error } = await supabase.rpc('ubah_kondisi_unit', { p_unit_id: Number(unitId), p_kondisi: kondisi, p_catatan: catatan })
    if (error) return { error: error.code === 'P0001' ? error.message : pesanGalat(error) }
    const { data } = await supabase.from('unit_fasilitas').select('*').eq('id', Number(unitId)).single()
    if (data) {
      setUnit((lama) => lama.map((u) => (u.id === unitId ? unitDariDb(data) : u)))
      await segarkanFasilitas(String(data.fasilitas_id))
      await catat(`Kondisi unit ${data.kode_aset} diubah menjadi ${STATUS_TEKS[kondisi]}`)
    }
    return {}
  }

  // Riwayat kondisi satu fasilitas: dari inspeksi + dari perubahan oleh Sarpras, urut terbaru
  async function ambilRiwayatFasilitas(fasilitasId) {
    const [hasilInspeksi, hasilSarpras] = await Promise.all([
      supabase
        .from('inspeksi_detail')
        .select('id, kondisi_sebelum, kondisi, jumlah_rusak, catatan, inspeksi(waktu, nama_pemeriksa, peran, foto)')
        .eq('fasilitas_id', Number(fasilitasId))
        .order('id', { ascending: false })
        .limit(50),
      supabase.from('perubahan_kondisi').select('*').eq('fasilitas_id', Number(fasilitasId)).order('waktu', { ascending: false }).limit(50),
    ])
    const galat = hasilInspeksi.error ?? hasilSarpras.error
    if (galat) return { error: galat.message, data: [] }

    const dariInspeksi = hasilInspeksi.data.map((d) => ({
      id: `i${d.id}`,
      sumber: 'inspeksi',
      sebelum: d.kondisi_sebelum,
      kondisi: d.kondisi,
      jumlah: d.jumlah_rusak,
      catatan: d.catatan ?? '',
      waktuAsli: d.inspeksi?.waktu,
      oleh: d.inspeksi?.nama_pemeriksa ?? '-',
      kodeUnit: '',
      foto: (d.inspeksi?.foto ?? []).map((path) => supabase.storage.from(BUCKET_FOTO).getPublicUrl(path).data.publicUrl),
    }))
    const dariSarpras = hasilSarpras.data.map((d) => ({
      id: `s${d.id}`,
      sumber: 'sarpras',
      sebelum: d.kondisi_sebelum,
      kondisi: d.kondisi,
      jumlah: d.jumlah,
      catatan: d.catatan ?? '',
      waktuAsli: d.waktu,
      oleh: d.oleh,
      kodeUnit: d.unit_id ? d.kode_aset : '',
      foto: [],
    }))
    const gabungan = [...dariInspeksi, ...dariSarpras]
      .sort((a, b) => new Date(b.waktuAsli) - new Date(a.waktuAsli))
      .map((d) => ({ ...d, waktu: formatTanggal(d.waktuAsli) }))
    return { data: gabungan }
  }

  async function hapusFasilitas(id) {
    const { error } = await supabase.from('fasilitas').delete().eq('id', Number(id))
    if (error) return { error: pesanGalat(error) }

    const dihapus = fasilitas.find((f) => f.id === id)
    setFasilitas((lama) => lama.filter((f) => f.id !== id))
    setUnit((lama) => lama.filter((u) => u.fasilitasId !== id))
    if (dihapus) await catat(`Fasilitas dihapus: ${dihapus.nama} (${dihapus.kodeAset})`)
    return {}
  }

  // ===== Foto =====
  // Mengunggah foto ke Storage, di folder milik akun yang login. Mengembalikan daftar path-nya.
  async function unggahFoto(daftarFoto) {
    const pathFoto = []
    for (const [urutan, file] of daftarFoto.entries()) {
      const foto = await kecilkanFoto(file)
      const path = `${pengguna.id}/${Date.now()}-${urutan + 1}.jpg`
      const { error } = await supabase.storage.from(BUCKET_FOTO).upload(path, foto, { contentType: 'image/jpeg' })
      if (error) return { error: `Foto ke-${urutan + 1} gagal diunggah: ${error.message}` }
      pathFoto.push(path)
    }
    return { pathFoto }
  }

  // ===== Rapid Inspection =====
  // hasil = [{ fasilitasId, kondisi, jumlah, catatan }, ...], daftarFoto = file gambar dari HP/laptop
  async function simpanInspeksi(ruangId, catatan, hasil, durasiDetik, daftarFoto = []) {
    // 1) Unggah foto dulu
    const unggahan = await unggahFoto(daftarFoto)
    if (unggahan.error) return { error: unggahan.error }
    const pathFoto = unggahan.pathFoto

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
    await muatLaporan() // temuan Bermasalah/Rusak otomatis menjadi laporan
    return {}
  }

  // ===== Laporan =====
  async function muatLaporan() {
    const { data } = await supabase
      .from('laporan')
      .select('*, laporan_unit(unit_id)')
      .order('dibuat_pada', { ascending: false })
      .limit(500)
    if (data) setLaporan(data.map(laporanDariDb))
  }

  async function muatAktivitas() {
    const { data } = await supabase.from('aktivitas').select('*').order('waktu', { ascending: false }).limit(20)
    if (data) setAktivitas(data.map(aktivitasDariDb))
  }

  async function muatJadwal() {
    const { data } = await supabase.from('jadwal_preventif').select('*').order('berikutnya')
    if (data) setJadwal(data.map(jadwalDariDb))
  }

  // ===== Pemeliharaan: alur tiket =====
  // Setelah setiap aksi: ambil ulang tiket, aktivitas, dan kondisi fasilitas/unit yang terkait
  async function setelahAksiTiket(laporanId) {
    const l = laporan.find((x) => x.id === laporanId)
    if (l?.fasilitasId) {
      const { data } = await supabase.from('unit_fasilitas').select('*').eq('fasilitas_id', Number(l.fasilitasId)).order('urutan')
      if (data) setUnit((lama) => [...lama.filter((u) => u.fasilitasId !== l.fasilitasId), ...data.map(unitDariDb)])
      await segarkanFasilitas(l.fasilitasId)
    }
    await Promise.all([muatLaporan(), muatAktivitas(), muatJadwal()])
  }

  async function jalankanRpc(nama, parameter, laporanId) {
    const { error } = await supabase.rpc(nama, parameter)
    if (error) return { error: error.code === 'P0001' ? error.message : pesanGalat(error) }
    await setelahAksiTiket(laporanId)
    return {}
  }

  const tugaskanVerifikasi = (id, petugasId, catatan) =>
    jalankanRpc('tugaskan_verifikasi', { p_laporan_id: Number(id), p_petugas_id: petugasId, p_catatan: catatan }, id)

  async function kirimVerifikasi(id, hasil, unitIds, catatan, daftarFoto = []) {
    const unggahan = await unggahFoto(daftarFoto)
    if (unggahan.error) return { error: unggahan.error }
    return jalankanRpc(
      'kirim_verifikasi',
      { p_laporan_id: Number(id), p_hasil: hasil, p_unit_ids: unitIds ? unitIds.map(Number) : null, p_catatan: catatan, p_foto: unggahan.pathFoto },
      id,
    )
  }

  const mulaiPemeliharaan = (id, data) =>
    jalankanRpc(
      'mulai_pemeliharaan',
      {
        p_laporan_id: Number(id),
        p_jenis_tindakan: data.jenisTindakan,
        p_teknisi: data.teknisi,
        p_target: data.target,
        p_estimasi_biaya: data.estimasi === '' ? null : Number(data.estimasi),
        p_catatan: data.catatan,
      },
      id,
    )

  async function tambahProgres(id, catatan, daftarFoto = []) {
    const unggahan = await unggahFoto(daftarFoto)
    if (unggahan.error) return { error: unggahan.error }
    return jalankanRpc('tambah_progres', { p_laporan_id: Number(id), p_catatan: catatan, p_foto: unggahan.pathFoto }, id)
  }

  async function selesaikanPemeliharaan(id, hasil, biaya, daftarFoto = []) {
    const unggahan = await unggahFoto(daftarFoto)
    if (unggahan.error) return { error: unggahan.error }
    return jalankanRpc(
      'selesaikan_pemeliharaan',
      { p_laporan_id: Number(id), p_hasil: hasil, p_biaya_aktual: biaya === '' ? null : Number(biaya), p_foto_sesudah: unggahan.pathFoto },
      id,
    )
  }

  const tolakLaporan = (id, alasan) => jalankanRpc('tolak_laporan', { p_laporan_id: Number(id), p_alasan: alasan }, id)
  const ubahPrioritas = (id, prioritas) => jalankanRpc('ubah_prioritas', { p_laporan_id: Number(id), p_prioritas: prioritas }, id)

  // Catatan progres satu tiket (urut dari yang terlama)
  async function ambilProgres(id) {
    const { data, error } = await supabase.from('laporan_progres').select('*').eq('laporan_id', Number(id)).order('waktu')
    if (error) return { error: error.message, data: [] }
    return { data: data.map((p) => ({ id: String(p.id), waktu: formatTanggal(p.waktu), oleh: p.oleh, catatan: p.catatan, foto: (p.foto ?? []).map(urlFoto) })) }
  }

  // ===== Jadwal pemeliharaan preventif =====
  // Satu jadwal dibuat untuk setiap fasilitas terpilih (mis. semua AC di Gedung 4)
  async function tambahJadwal(daftarFasilitasId, data) {
    const { error } = await supabase.from('jadwal_preventif').insert(
      daftarFasilitasId.map((fasilitasId) => ({
        fasilitas_id: Number(fasilitasId),
        kegiatan: data.kegiatan.trim(),
        interval_hari: Number(data.intervalHari),
        berikutnya: data.berikutnya,
        catatan: data.catatan.trim() || null,
      })),
    )
    if (error) return { error: pesanGalat(error) }
    await muatJadwal()
    await catat(`Jadwal preventif "${data.kegiatan.trim()}" dibuat untuk ${daftarFasilitasId.length} fasilitas`)
    return {}
  }

  async function ubahJadwal(id, data) {
    const { error } = await supabase
      .from('jadwal_preventif')
      .update({
        kegiatan: data.kegiatan.trim(),
        interval_hari: Number(data.intervalHari),
        berikutnya: data.berikutnya,
        catatan: data.catatan.trim() || null,
        aktif: data.aktif,
      })
      .eq('id', Number(id))
    if (error) return { error: pesanGalat(error) }
    await muatJadwal()
    return {}
  }

  async function hapusJadwal(id) {
    const { error } = await supabase.from('jadwal_preventif').delete().eq('id', Number(id))
    if (error) return { error: pesanGalat(error) }
    await muatJadwal()
    return {}
  }

  async function buatTiketPreventif(jadwalId) {
    const { data, error } = await supabase.rpc('buat_tiket_preventif', { p_jadwal_id: Number(jadwalId) })
    if (error) return { error: error.code === 'P0001' ? error.message : pesanGalat(error) }
    await Promise.all([muatLaporan(), muatAktivitas()])
    return { id: String(data) }
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

  // ===== Jadwal pemakaian ruangan (menu Ruang UISI) =====
  // tanggal = 'YYYY-MM-DD'
  async function ambilJadwalRuangan(tanggal) {
    const { data, error } = await supabase.from('jadwal_ruangan').select('*').eq('tanggal', tanggal).order('jam_mulai')
    if (error) return { error: error.message, data: [] }
    return {
      data: data.map((b) => ({
        id: String(b.id),
        ruangId: String(b.ruangan_id),
        jamMulai: b.jam_mulai,
        jamSelesai: b.jam_selesai,
        jenis: b.jenis,
        kegiatan: b.kegiatan,
        peminjam: b.peminjam,
      })),
    }
  }

  // ===== Log riwayat sistem (khusus Sarpras) =====
  // dari, sampai = objek Date. Mengembalikan baris log mentah dari database.
  async function ambilLog(dari, sampai) {
    const { data, error } = await supabase
      .from('log_sistem')
      .select('*')
      .gte('waktu', dari.toISOString())
      .lte('waktu', sampai.toISOString())
      .order('waktu', { ascending: false })
      .limit(3000)
    if (error) return { error: error.message, data: [] }
    return { data }
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
    statusLangsung,
    diperbaruiPada,
    tambahRuang,
    ubahRuang,
    tambahFasilitas,
    ubahFasilitas,
    hapusFasilitas,
    aktifkanPerUnit,
    unit,
    ubahUnit,
    tambahUnit,
    hapusUnit,
    ambilRiwayatFasilitas,
    ubahKondisiFasilitas,
    ubahKondisiUnit,
    laporan,
    jadwal,
    tugaskanVerifikasi,
    kirimVerifikasi,
    mulaiPemeliharaan,
    tambahProgres,
    selesaikanPemeliharaan,
    tolakLaporan,
    ubahPrioritas,
    ambilProgres,
    tambahJadwal,
    ubahJadwal,
    hapusJadwal,
    buatTiketPreventif,
    ambilLog,
    ambilJadwalRuangan,
    muatUlang: () => setVersiData((v) => v + 1),
  }
  return <DataContext.Provider value={nilai}>{children}</DataContext.Provider>
}

export function useData() {
  return useContext(DataContext)
}
