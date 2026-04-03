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
}

function AlertOverlay() {
  useDocumentTitle('Alert Overlay')
  const { uuid } = useParams()
  const [visible, setVisible] = useState(false)
  const [currentAlert, setCurrentAlert] = useState<AlertData | null>(null)

  const isProcessingRef = useRef(false)
  const soundFxRef = useRef<HTMLAudioElement | null>(null)
  const socketRef = useRef<WebSocket | null>(null)
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)

  // Load Indonesian voice
  useEffect(() => {
    const loadVoice = () => {
      const voices = window.speechSynthesis.getVoices()
      const indonesian = voices.find(v => v.name.includes('Google') && v.lang.includes('id'))
        || voices.find(v => v.lang === 'id-ID')
        || voices.find(v => v.lang.startsWith('id'))
      if (indonesian) {
        voiceRef.current = indonesian
        console.log('[TTS] Voice:', indonesian.name)
      }
    }

    loadVoice()
    window.speechSynthesis.addEventListener('voiceschanged', loadVoice)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoice)
  }, [])

  // Load sound effect
  useEffect(() => {
    const audio = new Audio('/money-soundfx.mp3')
    audio.load()
    soundFxRef.current = audio
  }, [])

  const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

  const speak = (text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) return resolve()

      const processedText = text.replace(/rp\.?\s?/gi, ' rupiah ').trim()
      const utterance = new SpeechSynthesisUtterance(processedText)
      utterance.lang = 'id-ID'
      utterance.rate = 1.0

      if (voiceRef.current) {
        utterance.voice = voiceRef.current
      }

      utterance.onend = () => resolve()
      utterance.onerror = () => resolve()

      window.speechSynthesis.speak(utterance)
    })
  }

  // Send ACK to server
  const sendACK = useCallback((alertId: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'ack', alert_id: alertId }))
      console.log('[WS] ACK sent:', alertId)
    }
  }, [])

  // Process alert
  const processAlert = useCallback(async (data: AlertData) => {
    if (isProcessingRef.current) return
    isProcessingRef.current = true

    setCurrentAlert(data)
    setVisible(true)

    try {
      // 1. Play sound effect (3s)
      if (soundFxRef.current) {
        soundFxRef.current.currentTime = 0
        await soundFxRef.current.play().catch(() => {})
      }
      await delay(3000)

      // 2. Speak: "nominal dari donatur, pesan"
      const formatted = new Intl.NumberFormat('id-ID').format(data.amount)
      let text = `${formatted} rupiah dari ${data.sender || 'Seseorang'}`
      if (data.message) text += `, ${data.message}`

      await speak(text)
    } catch (err) {
      console.error('[Alert] Error:', err)
    }

    await delay(3000)
    setVisible(false)
    await delay(500)

    sendACK(data.alert_id)
    isProcessingRef.current = false
  }, [sendACK])

  // WebSocket connection
  const connectWS = useCallback(() => {
    if (!uuid) return
    const socket = new WebSocket(`${WS_URL}/ws/${uuid}`)
    socketRef.current = socket

    socket.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data) as AlertData
        if (payload.type === 'alert') {
          processAlert(payload)
        }
      } catch {}
    }

    socket.onclose = () => setTimeout(connectWS, 5000)
  }, [uuid, processAlert])

  useEffect(() => {
    connectWS()
    return () => socketRef.current?.close()
  }, [connectWS])

  if (!visible || !currentAlert) return <main className="overlay-container" />

  const formattedAmount = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(currentAlert.amount).replace(/\s/g, '')

  return (
    <main className="overlay-container">
      <div className="alert-wrapper animate-alert">
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
          border-radius: 28px; /* Border radius dikurangi agar tidak terlalu bulat */
          box-shadow: 0 15px 40px rgba(0, 82, 255, 0.35);
          color: #ffffff;
          display: flex; flex-direction: column; gap: 8px;
          max-width: 850px;
          border: 3px solid rgba(255, 255, 255, 0.1); /* Border tipis untuk kesan premium */
        }

        .alert-main-text {
          font-size: 3.2rem; /* Baris pertama lebih besar & menonjol */
          font-weight: 900;
          line-height: 1.1;
          letter-spacing: -0.03em;
          word-wrap: break-word;
        }

        .alert-message-text {
          font-size: 2.2rem; /* Ukuran pesan lebih kecil dari baris pertama */
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
