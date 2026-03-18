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
    const wsUrl = `${WS_URL}/ws/${uuid}`
    const socket = new WebSocket(wsUrl)
    socketRef.current = socket

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
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

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  return (
    <main className="queue-overlay">
      <div className="queue-dialog">
        <h2 className="queue-title">Antrian Donasi</h2>
        <div className="queue-list">
          {donors.length === 0 ? (
            <div className="queue-empty">Belum ada antrian</div>
          ) : (
            donors.slice(0, 10).map((donor, index) => (
              <div key={donor.uuid} className="queue-item">
                <span className="queue-rank">{index + 1}</span>
                <span className="queue-name">{donor.sender}</span>
                <span className="queue-amount">{formatAmount(donor.base_amount)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Calistoga&family=Inter:wght@400;500;600;700&display=swap');

        .queue-overlay {
          width: 100vw;
          height: 100vh;
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Inter', system-ui, sans-serif;
        }

        .queue-dialog {
          background: #ffffff;
          border-radius: 24px;
          padding: 32px;
          min-width: 480px;
          max-width: 600px;
          box-shadow: 0 10px 40px rgba(0, 82, 255, 0.15);
          animation: dialogFadeIn 0.5s ease-out both;
        }

        .queue-title {
          font-family: 'Calistoga', Georgia, serif;
          font-size: 28px;
          font-weight: 400;
          color: #0052ff;
          text-align: center;
          margin: 0 0 24px 0;
          letter-spacing: -0.02em;
        }

        .queue-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .queue-empty {
          text-align: center;
          color: #0052ff;
          font-size: 16px;
          padding: 40px 0;
          opacity: 0.6;
        }

        .queue-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 20px;
          background: #f1f5f9;
          border-radius: 16px;
        }

        .queue-rank {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0052ff;
          color: #ffffff;
          border-radius: 50%;
          font-weight: 700;
          font-size: 14px;
          flex-shrink: 0;
        }

        .queue-name {
          flex: 1;
          font-size: 16px;
          font-weight: 600;
          color: #0052ff;
        }

        .queue-amount {
          font-size: 16px;
          font-weight: 700;
          color: #0052ff;
        }

        @keyframes dialogFadeIn {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </main>
  )
}

export default QueueOverlay
