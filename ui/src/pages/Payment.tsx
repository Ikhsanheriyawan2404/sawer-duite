import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { API_URL } from '../lib/api'
import QRCode from 'qrcode'

function Payment() {
  const { uuid } = useParams()
  const [tx, setTx] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [timeLeft, setTimeLeft] = useState<string>('')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    fetch(`${API_URL}/transactions/${uuid}`)
      .then(res => res.json())
      .then(data => {
        setTx(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [uuid])

  useEffect(() => {
    if (tx?.qris_payload && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, tx.qris_payload, {
        width: 280,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
    }
  }, [tx])

  useEffect(() => {
    if (!tx?.expired_at) return

    const timer = setInterval(() => {
      const now = new Date().getTime()
      const expiry = new Date(tx.expired_at).getTime()
      const diff = expiry - now

      if (diff <= 0) {
        setTimeLeft('EXPIRED')
        clearInterval(timer)
      } else {
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((diff % (1000 * 60)) / 1000)
        setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [tx])

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val)
  }

  if (loading) return <main className="page page-center"><p>Memuat data pembayaran...</p></main>
  if (!tx) return <main className="page page-center"><h2>Pembayaran tidak ditemukan</h2></main>

  return (
    <main className="page page-center overlay-page">
      <section className="login-card" style={{ width: 'min(500px, 100%)', textAlign: 'center' }}>
        <div className="section-label" style={{ background: '#e6f0ff', color: '#0052ff' }}>
          <span className="pulse-dot" />
          <span className="label-text">QRIS DYNAMIC</span>
        </div>

        <div style={{ marginTop: '16px' }}>
          <p className="muted" style={{ fontSize: '14px' }}>Total Pembayaran</p>
          <h1 style={{ color: 'var(--accent)', fontSize: '2.5rem' }}>{formatCurrency(tx.amount)}</h1>
          {timeLeft && (
            <div style={{
              display: 'inline-block',
              marginTop: '8px',
              padding: '4px 12px',
              background: timeLeft === 'EXPIRED' ? '#fee2e2' : '#fef3c7',
              color: timeLeft === 'EXPIRED' ? '#dc2626' : '#d97706',
              borderRadius: '99px',
              fontSize: '12px',
              fontWeight: '600'
            }}>
              {timeLeft === 'EXPIRED' ? 'Sesi Berakhir' : `Berakhir dalam ${timeLeft}`}
            </div>
          )}
        </div>

        <div style={{
          background: '#fff',
          padding: '24px',
          borderRadius: '24px',
          border: '2px solid var(--border)',
          margin: '20px 0',
          display: 'grid',
          placeItems: 'center'
        }}>
          <img src="/qris.svg" alt="QRIS" style={{ height: '24px', marginBottom: '16px' }} />
          <canvas ref={canvasRef} style={{ maxWidth: '100%', height: 'auto' }} />
          <p style={{ marginTop: '16px', fontWeight: '700', letterSpacing: '4px', fontSize: '14px', color: '#333' }}>QRIS GPN</p>
        </div>

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
      </section>
    </main>
  )
}

export default Payment
