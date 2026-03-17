import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { API_URL, WS_URL } from '../../lib/api'
import { useDocumentTitle } from '../../lib/useDocumentTitle'

interface Transaction {
  uuid: string
  sender: string
  base_amount: number
  note: string
}

function QueueOverlay() {
  useDocumentTitle('Queue Overlay')
  const { uuid } = useParams()
  const [donors, setDonors] = useState<Transaction[]>([])
  const [username, setUsername] = useState<string | null>(null)
  const socketRef = useRef<WebSocket | null>(null)

  const fetchQueue = useCallback(async (targetUsername: string) => {
    try {
      const res = await fetch(
        `${API_URL}/user/${targetUsername}/queue?status=paid&is_queue=true&sort_by=base_amount&order=desc`
      )
      if (res.ok) {
        const data = await res.json()
        setDonors(data || [])
      }
    } catch (err) {}
  }, [])

  const connectWS = useCallback(() => {
    if (!uuid || !username) return
    // PUBLIC ACCESS: No token required
    const wsUrl = `${WS_URL}/ws/${uuid}`
    const socket = new WebSocket(wsUrl)
    socketRef.current = socket

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
        // Refresh on ANY relevant change (new donation or manual dashboard update)
        if (payload.type === 'alert' || payload.type === 'refresh') {
          fetchQueue(username)
        }
      } catch (err) {}
    }
    socket.onclose = () => setTimeout(() => connectWS(), 5000)
  }, [uuid, username, fetchQueue])

  useEffect(() => {
    if (!uuid) return
    fetch(`${API_URL}/user/uuid/${uuid}`)
      .then(res => res.json())
      .then(user => {
        setUsername(user.username)
        fetchQueue(user.username)
      }).catch(() => {})
  }, [uuid, fetchQueue])

  useEffect(() => {
    if (username) {
      connectWS()
      return () => socketRef.current?.close()
    }
  }, [username, connectWS])

  if (donors.length === 0) return <main className="queue-overlay" />

  return (
    <main className="queue-overlay">
      <div className="queue-pill animate-pill">
        <div className="queue-label">TOP DONORS</div>
        <div className="queue-list">
          {donors.slice(0, 4).map((donor, index) => (
            <div key={donor.uuid} className="donor-item">
              <span className="name">{donor.sender}</span>
              <span className="amount">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(donor.base_amount)}
              </span>
              {index < donors.slice(0, 4).length - 1 && <span className="sep">•</span>}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800&display=swap');
        .queue-overlay {
          width: 100vw; height: 100vh; background: transparent;
          display: flex; align-items: flex-start; justify-content: center;
          padding-top: 20px; overflow: hidden; font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .queue-pill {
          background: rgba(10, 10, 10, 0.7); backdrop-filter: blur(15px);
          padding: 8px 24px; border-radius: 100px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: flex; align-items: center; gap: 16px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }
        .queue-label {
          font-size: 0.6rem; font-weight: 900; color: #863bff;
          letter-spacing: 0.2em; border-right: 1px solid rgba(255,255,255,0.1);
          padding-right: 16px;
        }
        .queue-list { display: flex; align-items: center; gap: 12px; }
        .donor-item { display: flex; align-items: center; gap: 8px; }
        .name { font-size: 0.85rem; color: rgba(255,255,255,0.6); font-weight: 600; }
        .amount { font-size: 0.85rem; color: #fff; font-weight: 800; }
        .sep { color: rgba(255,255,255,0.1); font-weight: 400; margin-left: 4px; }
        .animate-pill { animation: pillSlideDown 0.8s cubic-bezier(0.16, 1, 0.3, 1) both; }
        @keyframes pillSlideDown {
          from { transform: translateY(-40px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </main>
  )
}

export default QueueOverlay
