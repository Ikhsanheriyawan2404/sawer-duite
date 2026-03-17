import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { API_URL } from '../lib/api'
import QRCode from 'qrcode'

function Payment() {
  const { uuid } = useParams()
  const navigate = useNavigate()
  const [tx, setTx] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [timeLeft, setTimeLeft] = useState<string>('')
  const [isExpired, setIsExpired] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    fetch(`${API_URL}/transactions/${uuid}`)
      .then(res => res.json())
      .then(data => {
        // Cek kadaluarsa langsung dari status database atau waktu sistem
        const now = new Date().getTime()
        const expiry = new Date(data.expired_at).getTime()
        
        if (data.status === 'expired' || expiry - now <= 0) {
          setIsExpired(true)
        }
        
        setTx(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [uuid])

  // Hanya generate QR jika benar-benar TIDAK expired
  useEffect(() => {
    if (tx?.qris_payload && canvasRef.current && !isExpired && !loading) {
      QRCode.toCanvas(canvasRef.current, tx.qris_payload, {
        width: 280,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
    }
  }, [tx, isExpired, loading])

  useEffect(() => {
    if (!tx?.expired_at || isExpired || loading) return

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
  }, [tx, isExpired, loading])

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
      <section className="login-card" style={{ width: 'min(500px, 100%)', textAlign: 'center' }}>
        <div className="section-label" style={{ background: isExpired ? '#fee2e2' : '#e6f0ff', color: isExpired ? '#dc2626' : '#0052ff' }}>
          <span className="pulse-dot" style={{ backgroundColor: isExpired ? '#ef4444' : '#0052ff', animation: isExpired ? 'none' : undefined }} />
          <span className="label-text">{isExpired ? 'SESSION EXPIRED' : 'QRIS DYNAMIC'}</span>
        </div>

        <div style={{ marginTop: '16px' }}>
          <p className="muted" style={{ fontSize: '14px' }}>Total Pembayaran</p>
          <h1 style={{ color: isExpired ? '#999' : 'var(--accent)', fontSize: '2.5rem' }}>{formatCurrency(tx.amount)}</h1>

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
        </div>

        <div className="payment-summary-card">
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

        <div style={{
          background: '#fff',
          padding: '24px',
          borderRadius: '24px',
          border: '2px solid var(--border)',
          margin: '20px 0',
          display: 'grid',
          placeItems: 'center',
          position: 'relative',
          minHeight: '320px'
        }}>
          {isExpired ? (
            <div style={{ padding: '20px' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>⌛</div>
              <h3 style={{ color: '#111', marginBottom: '8px', fontSize: '1.2rem' }}>Waktu Habis</h3>
              <p className="muted" style={{ fontSize: '14px', marginBottom: '24px', lineHeight: '1.5' }}>
                QR Code ini sudah tidak berlaku karena melewati batas waktu 3 menit.
              </p>
              <button 
                onClick={() => navigate(`/${tx.target?.username || ''}`)} 
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
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

        {!isExpired && (
          <>
            <div style={{ textAlign: 'left', width: '100%', background: 'var(--muted)', padding: '16px', borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span className="muted" style={{ fontSize: '13px' }}>ID Transaksi</span>
                <span className="mono" style={{ fontSize: '12px' }}>{tx.uuid.slice(0, 8)}...</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="muted" style={{ fontSize: '13px' }}>Pengirim</span>
                <span style={{ fontSize: '13px', fontWeight: '600' }}>{tx.sender || 'Someone'}</span>
              </div>
            </div>

            <p className="muted" style={{ fontSize: '12px', marginTop: '16px' }}>
              Silakan scan QR di atas menggunakan aplikasi mobile banking atau e-wallet kamu.
            </p>
          </>
        )}
      </section>
    </main>
  )
}

export default Payment
