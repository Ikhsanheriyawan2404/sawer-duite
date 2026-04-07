import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { API_URL, WS_URL } from '../../lib/api'
import { useDocumentTitle } from '../../lib/useDocumentTitle'

interface Transaction {
  uuid: string
  sender: string
  base_amount: number
  note: string
  custom_input: string
}

function QueueOverlay() {
  useDocumentTitle('Queue Overlay')
  const { uuid } = useParams()
  const [donors, setDonors] = useState<Transaction[]>([])
  const [username, setUsername] = useState<string | null>(null)
  const [queueTitle, setQueueTitle] = useState<string>('Antrian Donasi')
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
        setQueueTitle(user.queue_title || 'Antrian Donasi')
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
    const groups: Record<string, { sender: string, custom_input: string, total_amount: number, key: string }> = {}
    
    donors.forEach(donor => {
      const key = donor.custom_input ? `roblox_${donor.custom_input.toLowerCase()}` : `single_${donor.uuid}`
      if (!groups[key]) {
        groups[key] = {
          sender: donor.sender,
          custom_input: donor.custom_input,
          total_amount: 0,
          key: key
        }
      }
      groups[key].total_amount += donor.base_amount
    })

    return Object.values(groups).sort((a, b) => b.total_amount - a.total_amount)
  })()

  return (
    <main className="queue-overlay">
      <div className="queue-dialog">
        <h2 className="queue-title">{queueTitle}</h2>
        <div className="queue-list">
          {aggregatedDonors.length === 0 ? (
            <div className="queue-empty">Belum ada antrian</div>
          ) : (
            aggregatedDonors.slice(0, 15).map((donor, index) => (
              <div key={donor.key} className="queue-item">
                <span className="queue-rank">{index + 1}</span>
                <div className="queue-info">
                  <span className="queue-name">
                    {donor.sender}
                    {donor.custom_input && (
                      <span className="queue-custom"> ({donor.custom_input})</span>
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
          padding: 20px; /* Dikurangi agar area kerja lebih luas */
          font-family: var(--font-main);
        }

        .queue-dialog {
          background: #ffffff;
          border-radius: 28px;
          padding: 24px 32px; /* Rapatkan padding atas-bawah */
          width: min(1200px, 98%);
          margin-top: 10px;
          animation: dialogFadeIn 0.5s ease-out both;
          border: 5px solid #0052ff;
        }

        .queue-title {
          font-size: 36px; /* Sedikit dikecilkan agar hemat ruang */
          font-weight: 900;
          color: #0052ff;
          text-align: left;
          margin: 0 0 20px 0;
          letter-spacing: -0.05em;
          text-transform: uppercase;
        }

        .queue-list {
          display: flex;
          flex-direction: column;
          gap: 6px; /* Gap sangat rapat agar muat banyak */
        }

        .queue-empty {
          text-align: center;
          color: #0052ff;
          font-size: 24px;
          padding: 30px 0;
          font-weight: 600;
          opacity: 0.7;
        }

        .queue-item {
          display: grid;
          grid-template-columns: 50px 1fr auto;
          align-items: center;
          gap: 16px;
          padding: 8px 24px; /* Padding vertical sangat tipis untuk menampung baris lebih banyak */
          background: #f1f5f9;
          border-radius: 14px;
        }

        .queue-rank {
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0052ff;
          color: #ffffff;
          border-radius: 50%;
          font-weight: 900;
          font-size: 20px;
          flex-shrink: 0;
        }

        .queue-name {
          font-size: 28px; /* Tetap besar, cuma turun sedikit agar proporsional */
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
          font-size: 20px;
          color: #64748b;
          font-weight: 600;
        }

        .queue-amount {
          font-size: 32px; /* Tetap besar agar nominal jelas */
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
      `}</style>
    </main>
  )
}

export default QueueOverlay
