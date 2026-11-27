import { Link } from 'react-router-dom'
import { ArrowLeft, Building2 } from 'lucide-react'

// Halaman Kebijakan Privasi. Bisa dibuka tanpa login (syarat publikasi login Google).
// Ubah KONTAK dan TANGGAL_BERLAKU bila perlu.
const KONTAK = 'farrelreyhan15@gmail.com'
const TANGGAL_BERLAKU = '27 November 2026'

function Bagian({ judul, children }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-lg font-extrabold text-primary">{judul}</h2>
      <div className="flex flex-col gap-2.5 text-[15px] leading-relaxed text-slate-700">{children}</div>
    </section>
  )
}

export default function Privasi() {
  return (
    <div className="min-h-screen bg-page py-8 px-4">
      <article className="max-w-3xl mx-auto bg-white border border-line rounded-2xl shadow-sm overflow-hidden">
        <header className="bg-primary text-white px-7 py-8 flex flex-col gap-3">
          <Building2 size={40} strokeWidth={1.6} />
          <h1 className="text-2xl font-extrabold leading-tight">Kebijakan Privasi</h1>
          <p className="text-sm text-white/85">
            Dashboard Monitoring Kondisi Fasilitas Ruang Kuliah (Facility Monitoring) · Universitas Internasional Semen Indonesia
          </p>
          <p className="text-xs text-white/70">Berlaku sejak {TANGGAL_BERLAKU}</p>
        </header>

        <div className="px-7 py-8 flex flex-col gap-7">
          <Bagian judul="1. Tentang aplikasi ini">
            <p>
              Facility Monitoring adalah dashboard untuk memantau kondisi fasilitas ruang kuliah di lingkungan Universitas Internasional
              Semen Indonesia (UISI) melalui rapid inspection, pelaporan kerusakan, dan pemeliharaan. Aplikasi ini dikembangkan sebagai
              prototipe penelitian tugas akhir (skripsi) dan digunakan oleh sivitas akademika UISI.
            </p>
          </Bagian>

          <Bagian judul="2. Data yang kami ambil dari akun Google">
            <p>Saat Anda masuk dengan akun Google, aplikasi hanya meminta izin dasar dan menerima:</p>
            <ul className="list-disc pl-6 flex flex-col gap-1">
              <li>nama lengkap,</li>
              <li>alamat email,</li>
              <li>tanda pengenal akun Google (untuk mencocokkan akun saat login berikutnya).</li>
            </ul>
            <p>
              Aplikasi <b>tidak</b> menerima kata sandi Google Anda dan <b>tidak</b> mengakses Gmail, Google Drive, kontak, kalender, atau
              data Google lainnya. Kata sandi hanya dimasukkan di halaman milik Google.
            </p>
          </Bagian>

          <Bagian judul="3. Data yang dibuat saat Anda memakai aplikasi">
            <ul className="list-disc pl-6 flex flex-col gap-1">
              <li>peran dan status akun (Sarana Prasarana, Dosen, Petugas PKTL, atau Mahasiswa);</li>
              <li>hasil rapid inspection, catatan, dan foto dokumentasi yang Anda unggah;</li>
              <li>laporan kerusakan, verifikasi, dan data pemeliharaan yang Anda kerjakan;</li>
              <li>catatan riwayat (log) berisi nama, peran, waktu, dan perubahan data yang Anda lakukan;</li>
              <li>notifikasi yang ditujukan kepada Anda.</li>
            </ul>
          </Bagian>

          <Bagian judul="4. Untuk apa data digunakan">
            <ul className="list-disc pl-6 flex flex-col gap-1">
              <li>memastikan hanya pemilik email UISI (@uisi.ac.id dan @student.uisi.ac.id) yang dapat masuk;</li>
              <li>menentukan menu dan hak akses sesuai peran;</li>
              <li>mencatat siapa yang melakukan inspeksi, pelaporan, dan perubahan data, sebagai jejak audit;</li>
              <li>mengirim notifikasi terkait tugas dan kondisi ruangan;</li>
              <li>analisis dan evaluasi dalam penelitian tugas akhir, dalam bentuk rekap tanpa menampilkan data pribadi.</li>
            </ul>
            <p>Data tidak dijual, tidak disewakan, dan tidak digunakan untuk iklan.</p>
          </Bagian>

          <Bagian judul="5. Penggunaan data dari Google">
            <p>
              Penggunaan dan pemindahan informasi yang diterima dari Google API mematuhi{' '}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noreferrer"
                className="text-primary font-semibold underline underline-offset-2"
              >
                Google API Services User Data Policy
              </a>
              , termasuk ketentuan Limited Use.
            </p>
          </Bagian>

          <Bagian judul="6. Tempat penyimpanan dan pihak ketiga">
            <p>Data disimpan dan diproses menggunakan layanan berikut, hanya untuk menjalankan aplikasi:</p>
            <ul className="list-disc pl-6 flex flex-col gap-1">
              <li><b>Supabase</b> untuk login, basis data, dan penyimpanan foto;</li>
              <li><b>Vercel</b> untuk menayangkan halaman aplikasi;</li>
              <li><b>Google</b> untuk proses masuk dengan akun Google.</li>
            </ul>
            <p>Data hanya dapat dilihat oleh pengguna sesuai hak aksesnya. Pengelolaan akun dilakukan oleh Sarana Prasarana UISI.</p>
          </Bagian>

          <Bagian judul="7. Keamanan">
            <p>
              Koneksi menggunakan HTTPS. Akses ke setiap data dibatasi di tingkat basis data berdasarkan peran pengguna (row level
              security), dan setiap perubahan penting tercatat di log riwayat.
            </p>
          </Bagian>

          <Bagian judul="8. Lama penyimpanan dan hak Anda">
            <p>
              Data disimpan selama akun aktif atau selama dibutuhkan untuk pengelolaan fasilitas dan penelitian. Anda dapat meminta
              salinan, perbaikan, atau penghapusan data akun Anda dengan menghubungi kontak di bawah. Anda juga dapat mencabut akses
              aplikasi ini kapan saja melalui pengaturan{' '}
              <a href="https://myaccount.google.com/connections" target="_blank" rel="noreferrer" className="text-primary font-semibold underline underline-offset-2">
                akun Google
              </a>
              .
            </p>
          </Bagian>

          <Bagian judul="9. Kontak">
            <p>
              Pertanyaan tentang kebijakan ini dapat dikirim ke{' '}
              <a href={`mailto:${KONTAK}`} className="text-primary font-semibold underline underline-offset-2">
                {KONTAK}
              </a>
              . Kebijakan ini dapat diperbarui sewaktu-waktu; tanggal berlaku di atas akan disesuaikan.
            </p>
          </Bagian>

          <div className="pt-2 border-t border-line">
            <Link to="/login" className="inline-flex items-center gap-2 min-h-11 font-semibold text-primary">
              <ArrowLeft size={18} /> Kembali ke halaman masuk
            </Link>
          </div>
        </div>
      </article>
    </div>
  )
}
