import { CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react'
import { STATUS } from '../data/konstanta.js'

const IKON = { baik: CheckCircle2, perawatan: AlertTriangle, rusak: XCircle, belum: Clock }

// Label status berwarna: Baik / Perlu Perawatan / Rusak / Belum Diinspeksi
export default function StatusBadge({ status }) {
  const s = STATUS[status] ?? STATUS.belum
  const Ikon = IKON[status] ?? Clock
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold px-2.5 py-1 rounded-full ${s.bg} ${s.text}`}>
      <Ikon size={14} />
      {s.label}
    </span>
  )
}
