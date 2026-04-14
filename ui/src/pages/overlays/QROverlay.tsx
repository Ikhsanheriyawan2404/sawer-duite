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
        return QRCode.toDataURL(url, { margin: 0, width: 240, errorCorrectionLevel: 'H' })
      })
      .then(dataUrl => setQrDataUrl(dataUrl))
      .catch(() => {})
  }, [uuid])

  return (
    <main className="qr-overlay">
      <div className="qr-card">
        <p className="qr-label">{config.top_text}</p>
        <div className="qr-box">
          {qrDataUrl ? (
            <>
              <img src={qrDataUrl} alt="QR" className="qr-code-img" />
              <img src="/logo.svg" alt="Logo" className="qr-logo" />
            </>
          ) : (
            <div className="qr-placeholder" />
          )}
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
          padding: 10px;
          font-family: var(--font-main);
        }

        .qr-card {
          width: fit-content;
          max-width: 320px; /* Lebih ringkas */
          background: #ffffff;
          border-radius: 24px;
          padding: 16px 20px;
          border: 6px solid #0052ff;
          text-align: center;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
          animation: qrFadeIn 0.5s ease-out both;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .qr-label {
          font-size: 20px; /* Ukuran teks lebih besar */
          font-weight: 900;
          letter-spacing: 0.02em;
          color: #0052ff;
          text-transform: uppercase;
          margin: 0 0 10px 0;
          line-height: 1.1;
        }

        .qr-box {
          position: relative;
          width: 220px; /* Disesuaikan agar pas dengan card */
          height: 220px;
          margin: 0 auto 10px;
          background: #ffffff;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
        }

        .qr-box .qr-code-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .qr-logo {
          position: absolute;
          width: 54px;
          height: 54px;
          background: #fff;
          padding: 6px;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          z-index: 2;
        }

        .qr-placeholder {
          width: 100%;
          height: 100%;
          border-radius: 10px;
          background: #f1f5f9;
        }

        .qr-link {
          font-size: 16px; /* Ukuran teks link lebih besar */
          font-weight: 800;
          color: #0f172a;
          word-break: break-all;
          margin: 0;
          line-height: 1.2;
          background: #f1f5f9;
          padding: 6px 12px;
          border-radius: 10px;
          width: 100%;
        }

        @keyframes qrFadeIn {
          from {
            transform: scale(0.9) translateY(10px);
            opacity: 0;
          }
          to {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </main>
  )
}

export default QROverlay
