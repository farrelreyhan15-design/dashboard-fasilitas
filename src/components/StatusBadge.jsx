import { CheckCircle2, AlertTriangle, XCircle, Clock, Wrench } from 'lucide-react'
import { STATUS, LABEL_RUANG } from '../data/konstanta.js'

const IKON = { baik: CheckCircle2, perawatan: AlertTriangle, rusak: XCircle, maintenance: Wrench, belum: Clock }

// Label status berwarna.
//   Fasilitas: <StatusBadge status={f.kondisi} />       -> Baik / Bermasalah / Rusak / Maintenance
//   Ruangan:   <StatusBadge status={r.status} ruang />  -> Baik / Bermasalah / Tidak Dapat Digunakan / Belum Diinspeksi
export default function StatusBadge({ status, ruang = false }) {
  const s = STATUS[status] ?? STATUS.belum
  const Ikon = IKON[status] ?? Clock
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold px-2.5 py-1 rounded-full ${s.bg} ${s.text}`}>
      <Ikon size={14} />
      {ruang ? (LABEL_RUANG[status] ?? s.label) : s.label}
    </span>
  )
}
