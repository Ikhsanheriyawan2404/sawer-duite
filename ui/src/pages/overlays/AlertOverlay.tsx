import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { WS_URL } from '../../lib/api'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import '../../App.css'

interface AlertData {
  type: string
  alert_id: string
  amount: number
  sender: string
  message?: string
  audio_url?: string
}

function AlertOverlay() {
  useDocumentTitle('Alert Overlay')
  const { uuid } = useParams()
  const [currentAlert, setCurrentAlert] = useState<AlertData | null>(null)

  const soundFxRef = useRef<HTMLAudioElement | null>(null)
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null)
  const timeoutRef = useRef<number | null>(null)
  const socketRef = useRef<WebSocket | null>(null)

  const sendFinished = useCallback((alertId: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'FINISHED', alert_id: alertId }))
      console.log('[WS] FINISHED sent:', alertId)
    }
  }, [])

  const sendReady = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'LISTENER_READY' }))
    }
  }, [])

  // Heartbeat to keep backend queue active
  useEffect(() => {
    const interval = window.setInterval(sendReady, 15000)
    return () => window.clearInterval(interval)
  }, [sendReady])

  // Process alert lifecycle driven by React effect
  useEffect(() => {
    if (!currentAlert) return

    let isCancelled = false

    const runAlert = async () => {
      try {
        const sfx = new Audio('/money-soundfx.mp3')
        soundFxRef.current = sfx
        await sfx.play().catch(() => {})

        await new Promise(r => {
          timeoutRef.current = window.setTimeout(r, 2500)
        })

        if (isCancelled) return

        if (currentAlert.audio_url) {
          const tts = new Audio(currentAlert.audio_url)
          ttsAudioRef.current = tts
          await tts.play().catch(() => {})
          
          await new Promise(r => {
            tts.onended = () => r(null)
            timeoutRef.current = window.setTimeout(r, 10000) // Fallback max 10s
          })
        }
      } catch (err) {
        console.error('[Alert] Error playing media:', err)
      }

      if (isCancelled) return

      await new Promise(r => {
        timeoutRef.current = window.setTimeout(r, 3000)
      })

      if (isCancelled) return

      setCurrentAlert(null)
      sendFinished(currentAlert.alert_id)
    }

    runAlert()

    return () => {
      isCancelled = true
      if (soundFxRef.current) soundFxRef.current.pause()
      if (ttsAudioRef.current) ttsAudioRef.current.pause()
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [currentAlert, sendFinished])

  // WebSocket connection
  const connectWS = useCallback(() => {
    if (!uuid) return
    const socket = new WebSocket(`${WS_URL}/ws/${uuid}`)
    socketRef.current = socket

    socket.onopen = () => {
      console.log('[WS] Connected to Alert Channel')
      sendReady()
    }

    socket.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data)
        const alertData = payload.alert_id ? { ...payload, ...payload.AlertMessage } : payload
        
        if (alertData.type?.toUpperCase() === 'ALERT') {
          // If a new alert comes, it will overwrite the current one and restart the effect
          setCurrentAlert(alertData)
        } else if (alertData.type?.toUpperCase() === 'STOP_CURRENT') {
          setCurrentAlert(null)
        }
      } catch (err) {
        console.error('[WS] Message Error:', err)
      }
    }

    socket.onclose = () => setTimeout(connectWS, 5000)
  }, [uuid])

  useEffect(() => {
    connectWS()
    return () => socketRef.current?.close()
  }, [connectWS])

  if (!currentAlert) return <main className="overlay-container" />

  const formattedAmount = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(currentAlert.amount).replace(/\s/g, '')

  return (
    <main className="overlay-container">
      {/* Key ensures the DOM node is recreated, re-triggering the CSS animation on overwrite */}
      <div key={currentAlert.alert_id} className="alert-wrapper animate-alert">
        <img src="/alert.gif" alt="thanks" className="alert-gif" />

        <div className="alert-content">
          <div className="alert-main-text">
            {formattedAmount} dari {currentAlert.sender || 'Seseorang'}
          </div>

          {currentAlert.message && (
            <div className="alert-message-text">
              {currentAlert.message}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .overlay-container {
          width: 100vw; height: 100vh; background: transparent;
          display: flex; align-items: center; justify-content: center;
          overflow: hidden; font-family: var(--font-main);
        }

        .alert-wrapper {
          display: flex; flex-direction: column; align-items: center;
          text-align: center; width: 100%; max-width: 1000px;
        }

        .alert-gif {
          width: 250px; height: auto; margin-bottom: 24px;
          filter: drop-shadow(0 10px 20px rgba(0,0,0,0.2));
        }

        .alert-content {
          background: var(--accent);
          padding: 28px 44px;
          border-radius: 28px;
          color: #ffffff;
          display: flex; flex-direction: column; gap: 8px;
          max-width: 850px;
          border: 3px solid rgba(255, 255, 255, 0.1);
        }

        .alert-main-text {
          font-size: 3.2rem;
          font-weight: 900;
          line-height: 1.1;
          letter-spacing: -0.03em;
          word-wrap: break-word;
        }

        .alert-message-text {
          font-size: 2.2rem;
          font-weight: 700;
          line-height: 1.3;
          opacity: 0.9;
          word-wrap: break-word;
          margin-top: 4px;
        }

        .animate-alert {
          animation: alertEnter 0.6s cubic-bezier(0.23, 1, 0.32, 1) both;
        }

        @keyframes alertEnter {
          0% { transform: scale(0.8) translateY(50px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
      `}</style>
    </main>
  )
}

export default AlertOverlay
