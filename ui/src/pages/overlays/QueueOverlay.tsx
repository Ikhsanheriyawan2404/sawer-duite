import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { API_URL, WS_URL } from '../../lib/api'
import { useDocumentTitle } from '../../lib/useDocumentTitle'

interface Transaction {
  uuid: string
  sender: string
  base_amount: number
  note: string
  custom_input_json: Record<string, string>
}

function QueueOverlay() {
  useDocumentTitle('Queue Overlay')
  const { uuid } = useParams()
  const [donors, setDonors] = useState<Transaction[]>([])
  const [username, setUsername] = useState<string | null>(null)
  const [queueTitle, setQueueTitle] = useState<string>('Antrean Donasi')
  const socketRef = useRef<WebSocket | null>(null)

  const fetchQueue = useCallback(async (targetUsername: string) => {
    try {
      const res = await fetch(
        `${API_URL}/user/${targetUsername}/queue?status=PAID&is_queue=true&order=desc`
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

    socket.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data)
        if (payload.type === 'ALERT' || payload.type === 'REFRESH') {
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
        setQueueTitle(user.queue_title || 'Antrean Donasi')
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

  const aggregatedDonors = (() => {
    const groups: Record<string, { sender: string, custom_input_display: string, total_amount: number, key: string }> = {}

    donors.forEach(donor => {
      const customValues = donor.custom_input_json ? Object.values(donor.custom_input_json).filter(Boolean).join(', ') : ''
      const key = customValues ? `custom_${customValues.toLowerCase()}` : `single_${donor.uuid}`

      if (!groups[key]) {
        groups[key] = {
          sender: donor.sender,
          custom_input_display: customValues,
          total_amount: 0,
          key: key
        }
      }
      groups[key].total_amount += donor.base_amount
    })

    return Object.values(groups).sort((a, b) => b.total_amount - a.total_amount)
  })()

  const getRankDisplay = (index: number) => {
    if (index === 0) return '👑'
    if (index === 1) return '🥈'
    if (index === 2) return '🥉'
    return index + 1
  }

  return (
    <main className="queue-overlay">
      <div className="queue-dialog">
        <h2 className="queue-title">{queueTitle}</h2>
        <div className="queue-list">
          {aggregatedDonors.length === 0 ? (
            <div className="queue-empty">Belum ada antrean</div>
          ) : (
            aggregatedDonors.slice(0, 15).map((donor, index) => (
              <div key={donor.key} className={`queue-item rank-${index + 1}`}>
                <span className="queue-rank">
                  {getRankDisplay(index)}
                </span>
                <div className="queue-info">
                  <span className="queue-name">
                    {donor.sender}
                    {donor.custom_input_display && (
                      <span className="queue-custom"> ({donor.custom_input_display})</span>
                    )}
                  </span>
                </div>
                <span className="queue-amount">{formatAmount(donor.total_amount)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <style>{`
        .queue-overlay {
          width: 100vw;
          height: 100vh;
          background: transparent;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 20px;
          font-family: var(--font-main);
        }

        .queue-dialog {
          background: #ffffff;
          border-radius: 28px;
          padding: 24px 32px;
          width: min(1200px, 98%);
          margin-top: 10px;
          animation: dialogFadeIn 0.5s ease-out both;
          border: 6px solid #0052ff;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        }

        .queue-title {
          font-size: 32px;
          font-weight: 900;
          color: #0052ff;
          text-align: center;
          margin: 0 0 20px 0;
          letter-spacing: -0.04em;
          text-transform: uppercase;
          border-bottom: 3px solid #f1f5f9;
          padding-bottom: 12px;
        }

        .queue-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .queue-empty {
          text-align: center;
          color: #94a3b8;
          font-size: 20px;
          padding: 30px 0;
          font-weight: 700;
        }

        .queue-item {
          display: grid;
          grid-template-columns: 50px 1fr auto;
          align-items: center;
          gap: 16px;
          padding: 12px 24px;
          background: #f8fafc;
          border-radius: 16px;
          animation: rowSlideIn 0.4s ease-out both;
          border: 2px solid transparent;
        }

        .queue-rank {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0052ff;
          color: #ffffff;
          border-radius: 10px;
          font-weight: 900;
          font-size: 18px;
          flex-shrink: 0;
        }

        /* Rank Special Styling */
        .rank-1 {
          background: #fffcf0;
          border-color: #ffd700;
        }
        .rank-1 .queue-rank {
          background: linear-gradient(135deg, #ffd700, #ffac00);
          font-size: 24px;
          box-shadow: 0 4px 12px rgba(255, 215, 0, 0.3);
        }

        .rank-2 {
          background: #f8fafc;
          border-color: #cbd5e1;
        }
        .rank-2 .queue-rank {
          background: linear-gradient(135deg, #cbd5e1, #94a3b8);
          font-size: 24px;
        }

        .rank-3 {
          background: #fff7ed;
          border-color: #fb923c;
        }
        .rank-3 .queue-rank {
          background: linear-gradient(135deg, #fb923c, #ea580c);
          font-size: 24px;
        }

        .queue-name {
          font-size: 24px;
          font-weight: 800;
          color: #0f172a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .queue-info {
          min-width: 0;
        }

        .queue-custom {
          font-size: 18px;
          color: #64748b;
          font-weight: 600;
        }

        .queue-amount {
          font-size: 24px;
          font-weight: 900;
          color: #0052ff;
          white-space: nowrap;
        }

        @keyframes dialogFadeIn {
          from {
            transform: scale(0.95) translateY(20px);
            opacity: 0;
          }
          to {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }

        @keyframes rowSlideIn {
          from {
            transform: translateX(-10px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </main>
  )
}

export default QueueOverlay
