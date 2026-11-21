import { useData } from '../context/DataContext.jsx'

// Pemberitahuan kecil saat data sedang diambil dari database, atau kalau gagal
export default function InfoMuat() {
  const { memuat, galatMuat } = useData()

  if (galatMuat) {
    return (
      <p role="alert" className="p-3.5 rounded-xl bg-bad-soft text-bad-ink text-sm font-semibold">
        {galatMuat}
      </p>
    )
  }
  if (memuat) {
    return (
      <p role="status" className="text-sm text-muted">
        Memuat data dari database…
      </p>
    )
  }
  return null
}
