import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { API_URL, WS_URL } from '../../lib/api'
import { useDocumentTitle } from '../../lib/useDocumentTitle'

interface Transaction {
  uuid: string
  sender: string
  base_amount: number
  created_at: string
}

interface ListConfig {
  title?: string
  starts_at?: string | null
  ends_at?: string | null
}

function ListOverlayHorizontal() {
  useDocumentTitle('List Overlay Horizontal')
  const { uuid } = useParams()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [username, setUsername] = useState<string | null>(null)
  const [config, setConfig] = useState<ListConfig>({ title: 'Daftar Donatur' })
  const socketRef = useRef<WebSocket | null>(null)

  const fetchTransactions = useCallback(async (targetUsername: string) => {
    try {
      const res = await fetch(`${API_URL}/user/${targetUsername}/queue?status=PAID&sort_by=created_at&order=desc`)
      if (res.ok) {
        const data = await res.json()
        setTransactions(data || [])
      }
    } catch {
      // ignore
    }
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
          fetchTransactions(username)
        }
      } catch {
        // ignore
      }
    }

    socket.onclose = () => setTimeout(() => connectWS(), 5000)
  }, [uuid, username, fetchTransactions])

  useEffect(() => {
    if (!uuid) return
    fetch(`${API_URL}/user/uuid/${uuid}`)
      .then(res => res.json())
      .then(user => {
        setUsername(user.username)
        setConfig(user.list_config || { title: 'Daftar Donatur' })
        fetchTransactions(user.username)
      })
      .catch(() => {})
  }, [uuid, fetchTransactions])

  useEffect(() => {
    if (username) {
      connectWS()
      return () => socketRef.current?.close()
    }
  }, [username, connectWS])

  const filteredTransactions = useMemo(() => {
    const start = config.starts_at ? new Date(config.starts_at) : null
    const end = config.ends_at ? new Date(config.ends_at) : null

    return transactions.filter(tx => {
      const created = new Date(tx.created_at)
      if (start && created < start) return false
      if (end && created > end) return false
      return true
    })
  }, [transactions, config.starts_at, config.ends_at])

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const marqueeItems = useMemo(() => {
    const items = filteredTransactions.map(tx => `${tx.sender} - ${formatAmount(tx.base_amount)}`)
    return items.length > 0 ? [...items, ...items] : []
  }, [filteredTransactions])

  return (
    <main className="list-overlay-horizontal">
      <div className="marquee">
        <div className="marquee-track">
          {[...(config.title ? [`${config.title} •`] : ['Daftar Donatur •']), ...marqueeItems].map((item, index) => (
            <span key={`${item}-${index}`} className="marquee-item">
              {item}
            </span>
          ))}
        </div>
      </div>

      <style>{`
        .list-overlay-horizontal {
          width: 100vw;
          height: 100vh;
          background: transparent;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 0;
          font-family: var(--font-main);
        }

        .marquee {
          width: 100%;
          background: #ffffff;
          border-bottom: 5px solid #0052ff;
          display: flex;
          align-items: center;
          gap: 24px;
          padding: 14px 24px;
          box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
          overflow: hidden;
        }

        .marquee-track {
          display: inline-flex;
          gap: 28px;
          white-space: nowrap;
          animation: marqueeMove 20s linear infinite;
        }

        .marquee-item {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
          white-space: nowrap;
        }

        @keyframes marqueeMove {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </main>
  )
}

export default ListOverlayHorizontal
