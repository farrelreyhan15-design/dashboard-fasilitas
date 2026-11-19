import { createContext, useContext, useMemo, useState } from 'react'
import { ruangAwal, fasilitasAwal, aktivitasAwal } from '../data/dataAwal.js'

/*
  Tempat menyimpan data bersama (ruang, fasilitas, aktivitas)
  supaya semua halaman memakai data yang sama.
  Untuk sekarang data disimpan di memori browser (hilang saat halaman di-refresh).
  Nanti bagian ini diganti dengan pemanggilan ke Supabase.
*/

const DataContext = createContext(null)

// Aturan inti skripsi: status ruang = kondisi fasilitas terburuk di ruang itu
export function hitungStatusRuang(daftarFasilitas, sudahDiinspeksi) {
  if (!sudahDiinspeksi || daftarFasilitas.length === 0) return 'belum'
  if (daftarFasilitas.some((f) => f.kondisi === 'rusak')) return 'rusak'
  if (daftarFasilitas.some((f) => f.kondisi === 'perawatan')) return 'perawatan'
  return 'baik'
}

function jamSekarang() {
  return new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

export function DataProvider({ children }) {
  const [ruang, setRuang] = useState(ruangAwal)
  const [fasilitas, setFasilitas] = useState(fasilitasAwal)
  const [aktivitas, setAktivitas] = useState(aktivitasAwal)

  // Ruang lengkap dengan status dan jumlah fasilitasnya
  const ruangDenganStatus = useMemo(
    () =>
      ruang.map((r) => {
        const milik = fasilitas.filter((f) => f.ruangId === r.id)
        return {
          ...r,
          jumlahFasilitas: milik.length,
          jumlahMasalah: milik.filter((f) => f.kondisi !== 'baik').length,
          status: hitungStatusRuang(milik, Boolean(r.inspeksiTerakhir)),
        }
      }),
    [ruang, fasilitas],
  )

  function catat(teks) {
    setAktivitas((lama) => [{ teks, oleh: 'Sarana Prasarana', waktu: jamSekarang() }, ...lama])
  }

  function tambahRuang(data, daftarFasilitasAwal) {
    const id = data.kode
    setRuang((lama) => [{ ...data, id, inspeksiTerakhir: null, baru: true }, ...lama])
    if (daftarFasilitasAwal.length) {
      setFasilitas((lama) => [
        ...lama,
        ...daftarFasilitasAwal.map((f) => ({
          ...f,
          id: `${id}-${f.singkat}`,
          ruangId: id,
          kondisi: 'baik',
          kodeAset: `GD04-${id.replace('.', '')}-${f.singkat}-01`,
          terakhirDicek: 'Belum dicek',
        })),
      ])
    }
    catat(`Ruangan baru ditambahkan: ${data.nama}`)
  }
  
  function ubahRuang(id, data) {
    setRuang((lama) => lama.map((r) => (r.id === id ? { ...r, ...data } : r)))
    catat(`Data ruangan diperbarui: ${data.nama}`)
  }
  function tambahFasilitas(data) {
    setFasilitas((lama) => [...lama, { ...data, baru: true, terakhirDicek: 'Baru ditambahkan' }])
    catat(`Fasilitas ditambahkan: ${data.jumlah} ${data.satuan} ${data.nama} di R. ${data.ruangId}`)
  }

  function hapusFasilitas(id) {
    setFasilitas((lama) => lama.filter((f) => f.id !== id))
  }

    const nilai = { ruang: ruangDenganStatus, fasilitas, aktivitas, tambahRuang, ubahRuang, tambahFasilitas, hapusFasilitas }
  return <DataContext.Provider value={nilai}>{children}</DataContext.Provider>
}

export function useData() {
  return useContext(DataContext)
}
