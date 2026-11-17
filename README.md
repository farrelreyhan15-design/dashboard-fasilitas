# Dashboard Monitoring Fasilitas · Gedung 4 UISI

Prototipe dashboard monitoring kondisi fasilitas ruang kuliah berbasis Rapid Inspection.
Dibangun dengan React + Vite, Tailwind CSS, Recharts, dan React Router.

> Saat ini memakai **data contoh** (belum tersambung ke Supabase).
> Data yang ditambahkan akan hilang saat halaman di-refresh.

## Cara menjalankan

1. Buka folder ini di VS Code (File → Open Folder).
2. Buka terminal (Terminal → New Terminal).
3. Jalankan sekali saja:
   ```
   npm install
   ```
4. Jalankan setiap kali ingin coding:
   ```
   npm run dev
   ```
5. Ctrl + klik alamat `http://localhost:5173` yang muncul di terminal.
6. Untuk berhenti, klik terminal lalu tekan `Ctrl + C`.

## Isi folder

```
src/
  main.jsx               ← titik awal aplikasi
  App.jsx                ← daftar halaman (route)
  index.css              ← warna utama aplikasi
  data/dataAwal.js       ← DATA CONTOH (ruang, fasilitas, aktivitas)
  context/DataContext.jsx← penyimpanan data bersama + aturan status ruang
  components/            ← Sidebar, Header, StatusBadge, Modal
  pages/                 ← Dashboard, DataRuangan, DataFasilitas, SegeraHadir
```

## Halaman yang sudah ada

- **Dashboard** (`/`): ringkasan, status per ruang + filter lantai, grafik, perlu tindakan, aktivitas
- **Data Ruangan** (`/ruangan`): tabel ruang + form Tambah Ruangan
- **Data Fasilitas** (`/fasilitas`): fasilitas per ruang + form Tambah Fasilitas
- Menu lain masih berupa halaman "Sedang dalam pengembangan"

## Aturan status ruang

Status ruang = kondisi fasilitas terburuk di ruang itu
(Rusak → Perlu Perawatan → Baik). Ruang baru berstatus "Belum Diinspeksi".
Lihat fungsi `hitungStatusRuang` di `src/context/DataContext.jsx`.
