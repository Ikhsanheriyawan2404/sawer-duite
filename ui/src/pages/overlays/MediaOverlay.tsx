import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { API_URL, WS_URL } from '../../lib/api'
import { useDocumentTitle } from '../../lib/useDocumentTitle'

function MediaOverlay() {
  useDocumentTitle('Media Overlay')
  const { uuid } = useParams()
  const [username, setUsername] = useState<string | null>(null)
  const socketRef = useRef<WebSocket | null>(null)

  const fetchMediaStatus = useCallback(async () => {
    // For now, this is a placeholder for future media queue logic
    console.log('🔄 Syncing media status...')
  }, [])

  const connectWS = useCallback(() => {
    if (!uuid || !username) return

    const wsUrl = `${WS_URL}/ws/${uuid}`
    const socket = new WebSocket(wsUrl)
    socketRef.current = socket

    socket.onopen = () => console.log('✅ Media Controller Active')
    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
        if (payload.type === 'alert' || payload.type === 'refresh') {
          fetchMediaStatus()
        }
      } catch (err) {
        console.error('❌ WS Media Error', err)
      }
    }

    socket.onclose = () => setTimeout(() => connectWS(), 5000)
  }, [uuid, username, fetchMediaStatus])

  useEffect(() => {
    if (!uuid) return
    async function init() {
      try {
        const res = await fetch(`${API_URL}/user/uuid/${uuid}`)
        if (res.ok) {
          const user = await res.json()
          setUsername(user.username)
          fetchMediaStatus()
        }
      } catch (err) {
        console.error('Init media failed', err)
      }
    }
    init()
  }, [uuid, fetchMediaStatus])

  useEffect(() => {
    if (username) {
      connectWS()
      return () => socketRef.current?.close()
    }
  }, [username, connectWS])

  return (
    <main className="media-overlay">
      <div className="media-dialog">
        <div className="media-header">
          <span className="pulse-icon"></span>
          <span className="label">MEDIASHARE</span>
        </div>
        
        <div className="media-content">
          <div className="coming-soon-wrapper">
            <div className="icon">🎬</div>
            <h3>Coming Soon</h3>
            <p>Fitur putar video dari donatur sedang dalam pengembangan.</p>
          </div>
        </div>

        <div className="media-footer">
          <div className="status-dot"></div>
          <span>System: {socketRef.current?.readyState === 1 ? 'Synced' : 'Connecting...'}</span>
        </div>
      </div>

      <style>{`
        .media-overlay {
          width: 100vw; height: 100vh; background: transparent;
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-main);
        }

        .media-dialog {
          width: 420px; background: rgba(10, 10, 10, 0.85);
          backdrop-filter: blur(25px); border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 32px; overflow: hidden;
          box-shadow: 0 40px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(134, 59, 255, 0.2);
          animation: dialogPop 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .media-header {
          padding: 16px 24px; background: rgba(255, 255, 255, 0.03);
          display: flex; align-items: center; gap: 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .pulse-icon {
          width: 8px; height: 8px; background: #863bff; border-radius: 50%;
          animation: pulse 2s infinite;
        }

        .label {
          font-size: 0.7rem; font-weight: 900; color: #fff; letter-spacing: 0.2em;
        }

        .media-content {
          padding: 40px 32px; text-align: center;
        }

        .coming-soon-wrapper .icon {
          font-size: 3rem; margin-bottom: 16px; filter: drop-shadow(0 0 20px rgba(134, 59, 255, 0.4));
        }

        .coming-soon-wrapper h3 {
          color: #fff; font-size: 1.5rem; font-weight: 800; margin: 0 0 8px 0;
        }

        .coming-soon-wrapper p {
          color: rgba(255, 255, 255, 0.5); font-size: 0.9rem; line-height: 1.6; margin: 0;
        }

        .media-footer {
          padding: 12px 24px; background: rgba(0, 0, 0, 0.2);
          display: flex; align-items: center; gap: 8px;
          font-size: 0.65rem; color: rgba(255, 255, 255, 0.3); font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.05em;
        }

        .status-dot {
          width: 4px; height: 4px; background: #22c55e; border-radius: 50%;
        }

        @keyframes dialogPop {
          0% { transform: scale(0.9) translateY(20px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }

        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(134, 59, 255, 0.7); }
          70% { transform: scale(1.2); box-shadow: 0 0 0 10px rgba(134, 59, 255, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(134, 59, 255, 0); }
        }
      `}</style>
    </main>
  )
}

export default MediaOverlay
