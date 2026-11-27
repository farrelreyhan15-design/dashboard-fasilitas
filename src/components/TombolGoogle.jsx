import { useEffect, useRef, useState } from 'react'

/*
  Tombol "Sign in with Google" versi personal (Google Identity Services), seperti di Gapura UISI.
  - Kalau browser sudah masuk akun Google, tombol langsung menampilkan nama & email akun itu.
  - Login terjadi di jendela kecil Google, halaman dashboard tidak berpindah.
  - Google juga menampilkan kartu "One Tap" di pojok kanan atas.
  Kalau skrip Google gagal dimuat atau VITE_GOOGLE_CLIENT_ID belum diisi,
  komponen ini memanggil gagalDimuat() supaya halaman login memakai tombol cadangan.
*/

const ID_KLIEN = import.meta.env.VITE_GOOGLE_CLIENT_ID
const ALAMAT_SKRIP = 'https://accounts.google.com/gsi/client'

// Memuat skrip Google sekali saja
let skripGoogle = null
function muatSkripGoogle() {
  if (window.google?.accounts?.id) return Promise.resolve()
  if (!skripGoogle) {
    skripGoogle = new Promise((selesai, gagal) => {
      const el = document.createElement('script')
      el.src = ALAMAT_SKRIP
      el.async = true
      el.onload = selesai
      el.onerror = () => {
        skripGoogle = null
        gagal(new Error('Skrip Google gagal dimuat'))
      }
      document.head.appendChild(el)
    })
  }
  return skripGoogle
}

// Kode acak pengaman (nonce): Google menerima versi SHA-256, Supabase menerima versi aslinya
async function buatNonce() {
  const acak = crypto.getRandomValues(new Uint8Array(32))
  const asli = btoa(String.fromCharCode(...acak))
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(asli))
  const hex = Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('')
  return { asli, hex }
}

export default function TombolGoogle({ saatToken, gagalDimuat }) {
  const wadah = useRef(null)
  const [siap, setSiap] = useState(false)
  // Simpan fungsi terbaru di ref supaya Google tidak perlu diinisialisasi ulang
  const panggilBalik = useRef(saatToken)
  panggilBalik.current = saatToken

  useEffect(() => {
    if (!ID_KLIEN) {
      gagalDimuat?.()
      return
    }
    let batal = false

    async function pasang() {
      try {
        await muatSkripGoogle()
        const nonce = await buatNonce()
        if (batal || !wadah.current) return

        window.google.accounts.id.initialize({
          client_id: ID_KLIEN,
          nonce: nonce.hex,
          callback: (jawaban) => panggilBalik.current(jawaban.credential, nonce.asli),
          auto_select: false,
          cancel_on_tap_outside: true,
          context: 'signin',
          itp_support: true,
          use_fedcm_for_prompt: true,
        })
        window.google.accounts.id.renderButton(wadah.current, {
          type: 'standard',
          theme: 'filled_blue',
          size: 'large',
          shape: 'pill',
          text: 'signin_with',
          logo_alignment: 'left',
          locale: 'id',
          width: Math.min(400, wadah.current.offsetWidth || 320),
        })
        window.google.accounts.id.prompt() // kartu One Tap
        setSiap(true)
      } catch {
        if (!batal) gagalDimuat?.()
      }
    }
    pasang()

    return () => {
      batal = true
      window.google?.accounts?.id?.cancel()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="relative min-h-11">
      {!siap && <div className="absolute inset-0 rounded-full bg-slate-100 animate-pulse" role="status" aria-label="Memuat tombol Google" />}
      <div ref={wadah} className="flex justify-center" />
    </div>
  )
}
