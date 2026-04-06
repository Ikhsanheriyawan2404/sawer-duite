import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { API_URL } from '../lib/api'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import QRCode from 'qrcode'

function Payment() {
  const { uuid } = useParams()
  const navigate = useNavigate()
  const [tx, setTx] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [timeLeft, setTimeLeft] = useState<string>('')
  const [isExpired, setIsExpired] = useState(false)
  const [isPaid, setIsPaid] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const lastStatusRef = useRef<string | null>(null)
  const lastExpiredAtRef = useRef<string | null>(null)
  const isPaidRef = useRef(false)
  const isExpiredRef = useRef(false)
  const loadingRef = useRef(true)
  const txRef = useRef<any>(null)

  useDocumentTitle(isPaid ? 'Pembayaran Berhasil' : isExpired ? 'Pembayaran Expired' : 'Pembayaran')
  useEffect(() => { isPaidRef.current = isPaid }, [isPaid])
  useEffect(() => { isExpiredRef.current = isExpired }, [isExpired])
  useEffect(() => { loadingRef.current = loading }, [loading])
  useEffect(() => { txRef.current = tx }, [tx])

  // Poll transaction status (every 3s)
  useEffect(() => {
    if (!uuid) return
    let isMounted = true
    const controller = new AbortController()

    const syncTx = (data: any) => {
      if (!isMounted) return
      const now = new Date().getTime()
      const expiry = new Date(data.expired_at).getTime()

      if (data.status === 'paid') {
        if (!isPaidRef.current) setIsPaid(true)
      } else if (data.status === 'expired' || expiry - now <= 0) {
        if (!isExpiredRef.current) setIsExpired(true)
      }

      // Avoid unnecessary re-renders when nothing changes
      const statusChanged = lastStatusRef.current !== data.status
      const expiryChanged = lastExpiredAtRef.current !== data.expired_at
      if (statusChanged || expiryChanged || !txRef.current) {
        setTx(data)
        lastStatusRef.current = data.status
        lastExpiredAtRef.current = data.expired_at
      }

      if (loadingRef.current) setLoading(false)
    }

    const fetchTx = async () => {
      try {
        const res = await fetch(`${API_URL}/transactions/${uuid}`, { signal: controller.signal })
        if (!res.ok) throw new Error('failed')
        const data = await res.json()
        syncTx(data)
      } catch {
        if (loading && isMounted) setLoading(false)
      }
    }

    fetchTx()
    const timer = setInterval(() => {
      if (!isPaidRef.current && !isExpiredRef.current) fetchTx()
    }, 3000)

    return () => {
      isMounted = false
      controller.abort()
      clearInterval(timer)
    }
  }, [uuid])

  useEffect(() => {
    if (tx?.qris_payload && canvasRef.current && !isExpired && !isPaid && !loading) {
      QRCode.toCanvas(canvasRef.current, tx.qris_payload, {
        width: 280,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
    }
  }, [tx, isExpired, isPaid, loading])

  useEffect(() => {
    if (!tx?.expired_at || isExpired || isPaid || loading) return

    const timer = setInterval(() => {
      const now = new Date().getTime()
      const expiry = new Date(tx.expired_at).getTime()
      const diff = expiry - now

      if (diff <= 0) {
        setIsExpired(true)
        setTimeLeft('EXPIRED')
        clearInterval(timer)
      } else {
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((diff % (1000 * 60)) / 1000)
        setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [tx, isExpired, isPaid, loading])

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val)
  }

  if (loading) return <main className="page page-center"><p>Memuat data pembayaran...</p></main>
  if (!tx) return <main className="page page-center"><h2>Pembayaran tidak ditemukan</h2></main>

  const uniqueCodeValue = Math.max(tx.amount - (tx.base_amount ?? tx.amount), 0)
  const uniqueCodeDisplay = uniqueCodeValue.toString().padStart(2, '0')

  return (
    <main className="page page-center overlay-page">
      <section className="login-card" style={{ maxWidth: '500px', textAlign: 'center', alignItems: 'center' }}>
        <p className="section-intro-label" style={{
          color: isPaid ? '#16a34a' : isExpired ? '#dc2626' : '#0052ff',
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontSize: '12px',
          marginBottom: '10px'
        }}>
          {!isPaid && !isExpired && <span className="status-pulse-dot" style={{ backgroundColor: '#0052ff' }} />}
          {isPaid ? 'PEMBAYARAN BERHASIL' : isExpired ? 'SESSI KADALUARSA' : 'QRIS DINAMIS'}
        </p>

        <div style={{ marginTop: '16px' }}>
          <p className="muted" style={{ fontSize: '14px' }}>Total Pembayaran</p>
          <h1 style={{
            color: isPaid ? '#16a34a' : isExpired ? '#999' : 'var(--accent)',
            fontSize: 'clamp(2rem, 8vw, 3rem)'
          }}>
            {formatCurrency(tx.amount)}
          </h1>

          {!isPaid && (
            <div style={{
              display: 'inline-block',
              marginTop: '8px',
              padding: '4px 12px',
              background: isExpired ? '#fee2e2' : '#fef3c7',
              color: isExpired ? '#dc2626' : '#d97706',
              borderRadius: '99px',
              fontSize: '12px',
              fontWeight: '600'
            }}>
              {isExpired ? 'Sesi Telah Berakhir' : `Berakhir dalam ${timeLeft}`}
            </div>
          )}
        </div>

        {!isPaid && (
          <div className="payment-summary-card w-full">
            <div className="payment-summary-row">
              <span className="payment-summary-label">Total</span>
              <span className="payment-summary-value payment-summary-value--accent">{formatCurrency(tx.amount)}</span>
            </div>
            <div className="payment-summary-row">
              <span className="payment-summary-label">Admin Fee</span>
              <span className="payment-summary-value payment-summary-value--muted">{formatCurrency(0)}</span>
            </div>
            <div className="payment-summary-row">
              <span className="payment-summary-label">Unique Code</span>
              <span className="payment-summary-value">{uniqueCodeDisplay}</span>
            </div>
          </div>
        )}

        <div style={{
          background: '#fff',
          padding: '24px',
          borderRadius: '24px',
          border: isPaid ? '2px solid #22c55e' : '2px solid var(--border)',
          margin: '20px 0',
          display: 'grid',
          placeItems: 'center',
          position: 'relative',
          minHeight: '320px',
          width: '100%'
        }}>
          {isPaid ? (
            <div style={{ padding: '20px' }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 20px',
                boxShadow: '0 8px 24px rgba(34, 197, 94, 0.3)'
              }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <h3 style={{ color: '#16a34a', marginBottom: '8px', fontSize: '1.4rem' }}>Terima Kasih!</h3>
              <p className="muted" style={{ fontSize: '14px', marginBottom: '24px', lineHeight: '1.6' }}>
                Pembayaran kamu telah berhasil diterima. Dukunganmu sangat berarti!
              </p>
              <button
                onClick={() => navigate(`/${tx.target?.username || ''}`)}
                className="btn btn-primary w-full"
                style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
              >
                Kembali ke Profil
              </button>
            </div>
          ) : isExpired ? (
            <div style={{ padding: '20px' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>⌛</div>
              <h3 style={{ color: '#111', marginBottom: '8px', fontSize: '1.2rem' }}>Waktu Habis</h3>
              <p className="muted" style={{ fontSize: '14px', marginBottom: '24px', lineHeight: '1.5' }}>
                QR Code ini sudah tidak berlaku karena melewati batas waktu 5 menit.
              </p>
              <button
                onClick={() => navigate(`/${tx.target?.username || ''}`)}
                className="btn btn-primary w-full"
              >
                Buat Transaksi Baru
              </button>
            </div>
          ) : (
            <>
              <img src="/qris.svg" alt="QRIS" style={{ height: '24px', marginBottom: '16px' }} />
              <canvas ref={canvasRef} style={{ maxWidth: '100%', height: 'auto' }} />
              <p style={{ marginTop: '16px', fontWeight: '700', letterSpacing: '4px', fontSize: '14px', color: '#333' }}>QRIS GPN</p>
            </>
          )}
        </div>

        {!isExpired && !isPaid && (
          <>
            <div style={{ textAlign: 'left', width: '100%', background: 'var(--muted)', padding: '16px', borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span className="muted" style={{ fontSize: '13px' }}>ID Transaksi</span>
                <span className="mono" style={{ fontSize: '12px' }}>{tx.uuid.slice(0, 8)}...</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="muted" style={{ fontSize: '13px' }}>Pengirim</span>
                <span style={{ fontSize: '13px', fontWeight: '600' }}>{tx.sender || 'Seseorang'}</span>
              </div>
            </div>

            <p className="muted" style={{ fontSize: '12px', marginTop: '16px', lineHeight: 1.4 }}>
              Silakan scan QR di atas menggunakan aplikasi mobile banking atau e-wallet kamu.
            </p>
          </>
        )}
      </section>
    </main>
  )
}

export default Payment
