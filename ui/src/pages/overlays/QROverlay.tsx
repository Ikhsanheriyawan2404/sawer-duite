import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { API_URL } from '../../lib/api'
import { useDocumentTitle } from '../../lib/useDocumentTitle'

function QROverlay() {
  useDocumentTitle('QR Overlay')
  const { uuid } = useParams()
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [config, setConfig] = useState({ top_text: 'Scan untuk melihat profil', bottom_text: '' })

  useEffect(() => {
    if (!uuid) return
    fetch(`${API_URL}/user/uuid/${uuid}`)
      .then(res => res.json())
      .then(user => {
        const url = `${window.location.origin}/${user.username}`
        if (user.qr_config) {
          setConfig({
            top_text: user.qr_config.top_text || 'Scan untuk melihat profil',
            bottom_text: user.qr_config.bottom_text || url
          })
        } else {
          setConfig(prev => ({ ...prev, bottom_text: url }))
        }
        return QRCode.toDataURL(url, { margin: 0, width: 240 })
      })
      .then(dataUrl => setQrDataUrl(dataUrl))
      .catch(() => {})
  }, [uuid])

  return (
    <main className="qr-overlay">
      <div className="qr-card">
        <p className="qr-label">{config.top_text}</p>
        <div className="qr-box">
          {qrDataUrl ? <img src={qrDataUrl} alt="QR" /> : <div className="qr-placeholder" />}
        </div>
        <p className="qr-link">{config.bottom_text || 'Memuat...'}</p>
      </div>

      <style>{`
        .qr-overlay {
          width: 100vw;
          height: 100vh;
          background: transparent;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 20px;
          font-family: var(--font-main);
        }

        .qr-card {
          width: min(420px, 92vw);
          background: #ffffff;
          border-radius: 28px;
          padding: 20px 24px 18px;
          border: 5px solid #0052ff;
          text-align: center;
          box-shadow: 0 10px 28px rgba(15, 23, 42, 0.1);
          animation: qrFadeIn 0.5s ease-out both;
        }

        .qr-label {
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 0.18em;
          color: #0052ff;
          text-transform: uppercase;
          margin: 0 0 12px 0;
        }

        .qr-box {
          width: 240px;
          height: 240px;
          margin: 0 auto 14px;
          background: #f8fafc;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px;
        }

        .qr-box img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .qr-placeholder {
          width: 100%;
          height: 100%;
          border-radius: 12px;
          background: linear-gradient(135deg, #e2e8f0, #f8fafc);
        }

        .qr-link {
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
          word-break: break-all;
          margin: 0;
        }

        @keyframes qrFadeIn {
          from {
            transform: translateY(16px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </main>
  )
}

export default QROverlay
