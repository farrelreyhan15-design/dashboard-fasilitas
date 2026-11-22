// Fungsi bantu untuk data inventaris di menu Data Fasilitas:
// hitung kondisi & nilai aset, cek kelengkapan data, serta unduh Excel dan PDF.
import { STATUS } from '../data/konstanta.js'

export const ASAL_PEROLEHAN = { pembelian: 'Pembelian', hibah: 'Hibah', sewa: 'Sewa', lainnya: 'Lainnya' }
export const SARAN_SUMBER_DANA = ['Anggaran Universitas', 'Anggaran Yayasan', 'Hibah Pemerintah', 'Hibah Perusahaan / CSR', 'Dana Penelitian']
export const SARAN_PENANGGUNG_JAWAB = ['Biro Sarana dan Prasarana', 'Program Studi', 'Laboratorium', 'Biro Umum']

// Rupiah lengkap, contoh 4500000 -> "Rp 4.500.000"
export const rupiah = (n) => (n === null || n === undefined || n === '' ? '-' : `Rp ${Number(n).toLocaleString('id-ID')}`)
// Rupiah ringkas untuk kartu, contoh 125400000 -> "Rp 125,4 jt"
export const rupiahRingkas = (n) =>
  `Rp ${new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(n)}`

// Rincian unit per kondisi untuk satu kelompok fasilitas.
// Untuk barang per unit, dihitung dari kondisi masing-masing unit.
export function rincianKondisi(f, daftarUnit = []) {
  if (f.lacakPerUnit && daftarUnit.length) {
    const hitung = (k) => daftarUnit.filter((u) => u.kondisi === k).length
    return { baik: hitung('baik'), perawatan: hitung('perawatan'), rusak: hitung('rusak'), maintenance: hitung('maintenance') }
  }
  const bermasalah = f.kondisi === 'baik' ? 0 : f.jumlahRusak || f.jumlah
  return {
    baik: f.jumlah - bermasalah,
    perawatan: f.kondisi === 'perawatan' ? bermasalah : 0,
    rusak: f.kondisi === 'rusak' ? bermasalah : 0,
    maintenance: f.kondisi === 'maintenance' ? bermasalah : 0,
  }
}

// Data satu unit dilengkapi dari kelompoknya (kolom unit yang kosong ikut data kelompok)
export function unitLengkap(u, f) {
  return {
    ...u,
    merek: u.merek || f.merek,
    model: u.model || f.model,
    spesifikasi: u.spesifikasi || f.spesifikasi,
    tahunPengadaan: u.tahunPengadaan || f.tahunPengadaan,
    asalPerolehan: u.asalPerolehan || f.asalPerolehan,
    sumberDana: u.sumberDana || f.sumberDana,
    harga: u.hargaPerolehan ?? f.hargaSatuan ?? null,
  }
}

// Nilai aset satu kelompok fasilitas. null = harga belum diisi sama sekali.
export function nilaiFasilitas(f, daftarUnit = []) {
  if (f.lacakPerUnit && daftarUnit.length) {
    const harga = daftarUnit.map((u) => u.hargaPerolehan ?? f.hargaSatuan).filter((h) => h !== null && h !== undefined)
    return harga.length ? harga.reduce((a, b) => a + Number(b), 0) : null
  }
  return f.hargaSatuan === null || f.hargaSatuan === undefined ? null : Number(f.hargaSatuan) * f.jumlah
}

// Data inventaris yang masih kosong. Kosong = lengkap.
export function dataKurang(f) {
  const kurang = []
  if (!f.merek) kurang.push('merek')
  if (!f.tahunPengadaan) kurang.push('tahun')
  if (!f.asalPerolehan) kurang.push('asal perolehan')
  if (f.hargaSatuan === null || f.hargaSatuan === undefined) kurang.push('harga')
  if (!f.penanggungJawab) kurang.push('penanggung jawab')
  return kurang
}

// Rekap per kategori atau per gedung
function rekap(daftar, kunci, unitPerFasilitas) {
  const peta = new Map()
  for (const f of daftar) {
    const k = kunci(f)
    const r = peta.get(k) ?? { nama: k, jenis: 0, unit: 0, baik: 0, perawatan: 0, rusak: 0, maintenance: 0, nilai: 0 }
    const kondisi = rincianKondisi(f, unitPerFasilitas(f))
    r.jenis += 1
    r.unit += f.jumlah
    for (const s of ['baik', 'perawatan', 'rusak', 'maintenance']) r[s] += kondisi[s]
    r.nilai += nilaiFasilitas(f, unitPerFasilitas(f)) ?? 0
    peta.set(k, r)
  }
  return [...peta.values()].sort((a, b) => a.nama.localeCompare(b.nama))
}

// Menyiapkan semua data yang dibutuhkan Excel & PDF
function siapkan({ daftar, unit, ruangById }) {
  const unitPerFasilitas = (f) => unit.filter((u) => u.fasilitasId === f.id).sort((a, b) => a.urutan - b.urutan)
  const urut = [...daftar].sort((a, b) => {
    const ra = ruangById[a.ruangId]
    const rb = ruangById[b.ruangId]
    return `${ra.kampus}${ra.gedung}${ra.nama}${a.nama}`.localeCompare(`${rb.kampus}${rb.gedung}${rb.nama}${b.nama}`, 'id', { numeric: true })
  })
  const baris = urut.map((f) => {
    const milik = unitPerFasilitas(f)
    return { f, r: ruangById[f.ruangId], milik, kondisi: rincianKondisi(f, milik), nilai: nilaiFasilitas(f, milik) }
  })
  const units = baris.flatMap(({ f, r, milik }) => milik.map((u) => ({ f, r, u: unitLengkap(u, f) })))
  const total = baris.reduce(
    (t, b) => ({
      unit: t.unit + b.f.jumlah,
      baik: t.baik + b.kondisi.baik,
      perawatan: t.perawatan + b.kondisi.perawatan,
      rusak: t.rusak + b.kondisi.rusak,
      maintenance: t.maintenance + b.kondisi.maintenance,
      nilai: t.nilai + (b.nilai ?? 0),
      lengkap: t.lengkap + (dataKurang(b.f).length === 0 ? 1 : 0),
    }),
    { unit: 0, baik: 0, perawatan: 0, rusak: 0, maintenance: 0, nilai: 0, lengkap: 0 },
  )
  return {
    baris,
    units,
    total,
    perKategori: rekap(urut, (f) => f.kategori, unitPerFasilitas),
    perGedung: rekap(urut, (f) => `${ruangById[f.ruangId].kampus} · ${ruangById[f.ruangId].gedung}`, unitPerFasilitas),
  }
}

const tanggalCetak = () => new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
const waktuCetak = () => new Date().toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const namaBerkas = () => `Inventaris Fasilitas UISI ${new Date().toISOString().slice(0, 10)}`

// ===================== Excel =====================
export async function unduhExcelInventaris({ daftar, unit, ruangById, teksFilter, pengguna, lihatNilai }) {
  const { default: tulisExcel } = await import('write-excel-file/browser')
  const { baris, units, total, perKategori, perGedung } = siapkan({ daftar, unit, ruangById })

  const judul = (teks) => ({ value: teks, fontWeight: 'bold', backgroundColor: '#FBECEE' })
  const sel = (v) => (v === null || v === undefined || v === '' ? null : typeof v === 'number' ? { value: v, type: Number } : { value: String(v) })
  const uang = (v) => (v === null || v === undefined ? null : { value: Number(v), type: Number, format: '#,##0' })
  const tebal = (teks) => ({ value: teks, fontWeight: 'bold' })

  // --- Ringkasan ---
  const kepalaRekap = ['', 'Jenis', 'Unit', 'Baik', 'Bermasalah', 'Rusak', 'Maintenance', ...(lihatNilai ? ['Nilai aset (Rp)'] : [])]
  const isiRekap = (r) => [sel(r.nama), sel(r.jenis), sel(r.unit), sel(r.baik), sel(r.perawatan), sel(r.rusak), sel(r.maintenance), ...(lihatNilai ? [uang(r.nilai)] : [])]
  const ringkasan = [
    [{ value: 'DAFTAR INVENTARIS FASILITAS', fontWeight: 'bold', fontSize: 14 }],
    [sel('Universitas Internasional Semen Indonesia')],
    [sel('Filter'), sel(teksFilter)],
    [sel('Diunduh oleh'), sel(`${pengguna?.nama ?? '-'}`)],
    [sel('Diunduh pada'), sel(waktuCetak())],
    [],
    [tebal('Ringkasan'), null],
    [sel('Jenis barang (kelompok)'), sel(baris.length)],
    [sel('Total unit'), sel(total.unit)],
    [sel('Baik / Bermasalah / Rusak / Maintenance'), sel(`${total.baik} / ${total.perawatan} / ${total.rusak} / ${total.maintenance}`)],
    [sel('Data inventaris lengkap'), sel(`${total.lengkap} dari ${baris.length} jenis barang`)],
    ...(lihatNilai ? [[sel('Total nilai aset (Rp)'), uang(total.nilai)]] : []),
    [],
    kepalaRekap.map((k, i) => judul(i === 0 ? 'Rekap per kategori' : k)),
    ...perKategori.map(isiRekap),
    [],
    kepalaRekap.map((k, i) => judul(i === 0 ? 'Rekap per gedung' : k)),
    ...perGedung.map(isiRekap),
  ]

  // --- Daftar barang ---
  const kepalaBarang = [
    'No', 'Kode Aset', 'Nama Barang', 'Kategori', 'Kampus', 'Gedung', 'Ruangan', 'Merek', 'Model / Tipe', 'Spesifikasi',
    'Tahun Perolehan', 'Asal Perolehan', 'Sumber Dana', 'Jumlah', 'Satuan', ...(lihatNilai ? ['Harga Satuan (Rp)', 'Nilai Total (Rp)'] : []),
    'Baik', 'Bermasalah', 'Rusak', 'Maintenance', 'Kondisi', 'Pencatatan', 'Penanggung Jawab', 'Keterangan', 'Kelengkapan Data', 'Terakhir Dicek',
  ]
  const lembarBarang = [
    kepalaBarang.map(judul),
    ...baris.map(({ f, r, kondisi, nilai }, i) => {
      const kurang = dataKurang(f)
      return [
        sel(i + 1), sel(f.kodeAset), sel(f.nama), sel(f.kategori), sel(r.kampus), sel(r.gedung), sel(r.nama), sel(f.merek), sel(f.model),
        sel(f.spesifikasi), sel(f.tahunPengadaan ? Number(f.tahunPengadaan) : null), sel(ASAL_PEROLEHAN[f.asalPerolehan]), sel(f.sumberDana),
        sel(f.jumlah), sel(f.satuan), ...(lihatNilai ? [uang(f.hargaSatuan), uang(nilai)] : []),
        sel(kondisi.baik), sel(kondisi.perawatan), sel(kondisi.rusak), sel(kondisi.maintenance), sel(STATUS[f.kondisi]?.label),
        sel(f.lacakPerUnit ? 'Per unit' : 'Per kelompok'), sel(f.penanggungJawab), sel(f.keterangan),
        sel(kurang.length ? `Belum: ${kurang.join(', ')}` : 'Lengkap'), sel(f.terakhirDicek),
      ]
    }),
  ]

  // --- Rincian unit ---
  const kepalaUnit = [
    'No', 'Kode Unit', 'Kode Kelompok', 'Nama Barang', 'Ruangan', 'Posisi', 'Merek', 'Model / Tipe', 'Spesifikasi', 'Nomor Seri',
    'Tahun Perolehan', 'Asal Perolehan', 'Sumber Dana', ...(lihatNilai ? ['Harga Perolehan (Rp)'] : []), 'Kondisi', 'Catatan', 'Terakhir Diubah',
  ]
  const lembarUnit = [
    kepalaUnit.map(judul),
    ...units.map(({ f, r, u }, i) => [
      sel(i + 1), sel(u.kodeAset), sel(f.kodeAset), sel(f.nama), sel(r.nama), sel(u.posisi), sel(u.merek), sel(u.model), sel(u.spesifikasi),
      sel(u.nomorSeri), sel(u.tahunPengadaan ? Number(u.tahunPengadaan) : null), sel(ASAL_PEROLEHAN[u.asalPerolehan]), sel(u.sumberDana),
      ...(lihatNilai ? [uang(u.harga)] : []), sel(STATUS[u.kondisi]?.label), sel(u.catatan), sel(u.terakhirDiubah),
    ]),
  ]

  const lebar = (...w) => w.map((width) => ({ width }))
  await tulisExcel([
    { data: ringkasan, sheet: 'Ringkasan', columns: lebar(38, 14, 10, 10, 12, 10, 13, 18) },
    {
      data: lembarBarang,
      sheet: 'Daftar Barang',
      stickyRowsCount: 1,
      columns: lebar(5, 18, 22, 13, 10, 9, 16, 14, 16, 24, 10, 13, 20, 8, 8, ...(lihatNilai ? [16, 16] : []), 7, 11, 7, 12, 13, 12, 24, 26, 30, 20),
    },
    {
      data: lembarUnit.length > 1 ? lembarUnit : [...lembarUnit, [sel('Tidak ada barang yang dicatat per unit pada filter ini.')]],
      sheet: 'Rincian Unit',
      stickyRowsCount: 1,
      columns: lebar(5, 18, 16, 18, 14, 28, 14, 16, 24, 16, 10, 13, 20, ...(lihatNilai ? [16] : []), 13, 26, 20),
    },
  ]).toFile(`${namaBerkas()}.xlsx`)
}

// ===================== PDF (lewat jendela cetak browser) =====================
export function cetakInventaris({ daftar, unit, ruangById, teksFilter, pengguna, lihatNilai }) {
  const { baris, units, total, perKategori, perGedung } = siapkan({ daftar, unit, ruangById })
  const esc = (t) =>
    String(t === null || t === undefined || t === '' ? '-' : t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
  // Sel yang tidak boleh terpotong ke baris baru: rupiah, kode aset, angka kondisi
  const tetap = (v) => typeof v === 'string' && (v.startsWith('Rp ') || /^[A-Z0-9]+(-[A-Z0-9]+)+$/.test(v) || / \/ /.test(v))
  const tabel = (kepala, isi, kelas = '') =>
    `<table class="${kelas}"><thead><tr>${kepala.map((k) => `<th>${esc(k)}</th>`).join('')}</tr></thead><tbody>${
      isi.length
        ? isi.map((b) => `<tr>${b.map((v) => `<td${tetap(v) ? ' class="nw"' : ''}>${esc(v)}</td>`).join('')}</tr>`).join('')
        : `<tr><td colspan="${kepala.length}">Tidak ada data</td></tr>`
    }</tbody></table>`

  const kepalaRekap = ['', 'Jenis', 'Unit', 'Baik', 'Bermasalah', 'Rusak', 'Maint.', ...(lihatNilai ? ['Nilai aset'] : [])]
  const isiRekap = (r) => [r.nama, r.jenis, r.unit, r.baik, r.perawatan, r.rusak, r.maintenance, ...(lihatNilai ? [r.nilai ? rupiah(r.nilai) : '-'] : [])]

  const kartu = [
    ['Jenis barang', baris.length],
    ['Total unit', total.unit],
    ['Baik', total.baik],
    ['Bermasalah', total.perawatan],
    ['Rusak', total.rusak],
    ['Maintenance', total.maintenance],
    ['Data lengkap', `${total.lengkap}/${baris.length}`],
    ...(lihatNilai ? [['Total nilai aset', total.nilai ? rupiah(total.nilai) : '-']] : []),
  ]

  const html = `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>${esc(namaBerkas())}</title>
<style>
  @page{size:A4 landscape;margin:12mm}
  body{font-family:Inter,Arial,sans-serif;color:#0f172a;margin:24px;font-size:10px}
  .kop{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #8f1d2c;padding-bottom:8px}
  .kop h1{font-size:18px;margin:0;color:#6e1421} .kop p{margin:2px 0 0;color:#475569}
  h2{font-size:12.5px;margin:16px 0 6px;color:#6e1421}
  .kartu{display:grid;grid-template-columns:repeat(${kartu.length},1fr);gap:6px;margin-top:12px}
  .kartu div{border:1px solid #e2e8f0;border-radius:6px;padding:6px 8px;color:#64748b} .kartu b{display:block;font-size:14px;color:#0f172a}
  table{width:100%;border-collapse:collapse} th,td{border:1px solid #e2e8f0;padding:3.5px 5px;text-align:left;vertical-align:top}
  th{background:#fbecee;font-weight:700} tr:nth-child(even) td{background:#fcfafa}
  .dua{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  .nw{white-space:nowrap}
  .ttd{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:28px;text-align:center;break-inside:avoid}
  .ttd .garis{display:inline-block;min-width:230px;margin-top:58px;border-top:1px solid #0f172a;padding-top:3px;font-weight:700}
  .kaki{margin-top:16px;color:#64748b;font-size:9px}
  @media print{body{margin:0} h2{break-after:avoid} tr{break-inside:avoid} thead{display:table-header-group}}
</style></head><body>
<div class="kop">
  <div>
    <h1>Daftar Inventaris Fasilitas</h1>
    <p><b>Universitas Internasional Semen Indonesia</b></p>
    <p>Filter: ${esc(teksFilter)}</p>
  </div>
  <p style="text-align:right">Dicetak ${esc(waktuCetak())}<br>oleh ${esc(pengguna?.nama)}</p>
</div>
<div class="kartu">${kartu.map(([l, v]) => `<div>${esc(l)}<b>${esc(v)}</b></div>`).join('')}</div>

<h2>A. Rekap Inventaris</h2>
<div class="dua">
${tabel(kepalaRekap.map((k, i) => (i === 0 ? 'Kategori' : k)), perKategori.map(isiRekap))}
${tabel(kepalaRekap.map((k, i) => (i === 0 ? 'Kampus · Gedung' : k)), perGedung.map(isiRekap))}
</div>

<h2>B. Daftar Barang (${baris.length} jenis, ${total.unit} unit)</h2>
${tabel(
  ['No', 'Kode Aset', 'Nama Barang', 'Lokasi', 'Merek / Tipe', 'Spesifikasi', 'Tahun', 'Asal / Sumber Dana', 'Jumlah', 'B / Bm / R / M',
    ...(lihatNilai ? ['Harga Satuan', 'Nilai Total'] : []), 'Penanggung Jawab', 'Keterangan'],
  baris.map(({ f, r, kondisi, nilai }, i) => [
    i + 1, f.kodeAset, `${f.nama} (${f.kategori})`, `${r.nama}, ${r.kampus}`, [f.merek, f.model].filter(Boolean).join(' ') || '-',
    f.spesifikasi, f.tahunPengadaan, [ASAL_PEROLEHAN[f.asalPerolehan], f.sumberDana].filter(Boolean).join(' · ') || '-',
    `${f.jumlah} ${f.satuan}`, `${kondisi.baik} / ${kondisi.perawatan} / ${kondisi.rusak} / ${kondisi.maintenance}`,
    ...(lihatNilai ? [rupiah(f.hargaSatuan), rupiah(nilai)] : []), f.penanggungJawab, f.keterangan,
  ]),
)}
<p class="kaki">B = Baik, Bm = Bermasalah, R = Rusak, M = Maintenance.</p>

<h2>C. Rincian Barang per Unit (${units.length} unit)</h2>
${tabel(
  ['No', 'Kode Unit', 'Nama Barang', 'Ruangan', 'Posisi', 'Merek / Tipe', 'Spesifikasi', 'Nomor Seri', 'Tahun', 'Asal', ...(lihatNilai ? ['Harga'] : []), 'Kondisi', 'Catatan'],
  units.map(({ f, r, u }, i) => [
    i + 1, u.kodeAset, f.nama, r.nama, u.posisi, [u.merek, u.model].filter(Boolean).join(' ') || '-', u.spesifikasi, u.nomorSeri,
    u.tahunPengadaan, ASAL_PEROLEHAN[u.asalPerolehan], ...(lihatNilai ? [rupiah(u.harga)] : []), STATUS[u.kondisi]?.label, u.catatan,
  ]),
)}

<div class="ttd">
  <div>&nbsp;<br>Dibuat oleh,<br><span class="garis">${esc(pengguna?.nama)}</span></div>
  <div>Gresik, ${esc(tanggalCetak())}<br>Mengetahui,<br><span class="garis">Kepala Biro Sarana dan Prasarana</span></div>
</div>
<p class="kaki">Dicetak dari Dashboard Monitoring Kondisi Fasilitas Ruang Kuliah Berbasis Rapid Inspection.</p>
<script>window.onload=()=>setTimeout(()=>window.print(),300)</script>
</body></html>`

  const jendela = window.open('', '_blank')
  if (!jendela) return window.alert('Jendela cetak diblokir browser. Izinkan pop-up untuk halaman ini, lalu coba lagi.')
  jendela.document.write(html)
  jendela.document.close()
}
