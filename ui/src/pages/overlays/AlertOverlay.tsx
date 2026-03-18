import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { WS_URL } from '../../lib/api'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import '../../App.css'

function AlertOverlay() {
  useDocumentTitle('Alert Overlay')
  const { uuid } = useParams()
  const [visible, setVisible] = useState(false)
  const [currentAlert, setCurrentAlert] = useState<any>(null)

  const queueRef = useRef<any[]>([])
  const isProcessingRef = useRef(false)
  const soundFxRef = useRef<HTMLAudioElement | null>(null)
  const socketRef = useRef<WebSocket | null>(null)
  const audioUnlockedRef = useRef(false)

  const warmUp = useCallback(() => {
    if (audioUnlockedRef.current) return
    if (soundFxRef.current) {
      soundFxRef.current.volume = 0.001
      soundFxRef.current.play().then(() => {
        soundFxRef.current?.pause()
        soundFxRef.current!.volume = 1.0
        audioUnlockedRef.current = true
      }).catch(() => {})
    }
    const dummy = new SpeechSynthesisUtterance('')
    dummy.volume = 0
    window.speechSynthesis.speak(dummy)
  }, [])

  useEffect(() => {
    const audio = new Audio('/money-soundfx.mp3')
    audio.load()
    soundFxRef.current = audio
    window.addEventListener('mousedown', warmUp, { once: true })
    return () => window.removeEventListener('mousedown', warmUp)
  }, [warmUp])

  const speak = (text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) return resolve()
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text.replace(/rp\.?\s?/gi, ' rupiah '))
      utterance.lang = 'id-ID'
      utterance.rate = 1.0
      const voices = window.speechSynthesis.getVoices()
      const bestVoice = voices.find(v => v.lang.includes('id') && (v.name.includes('Google') || v.name.includes('Natural'))) || voices.find(v => v.lang.includes('id'))
      if (bestVoice) utterance.voice = bestVoice
      utterance.onend = () => resolve()
      utterance.onerror = () => resolve()
      window.speechSynthesis.speak(utterance)
    })
  }

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  const processQueue = async () => {
    if (isProcessingRef.current || queueRef.current.length === 0) return
    isProcessingRef.current = true
    const data = queueRef.current.shift()
    setCurrentAlert(data)
    setVisible(true)

    try {
      if (soundFxRef.current) {
        soundFxRef.current.currentTime = 0
        await soundFxRef.current.play().catch(() => {})
      }
      await delay(1200)
      const formatted = new Intl.NumberFormat('id-ID').format(data.amount)
      await speak(`${formatted} rupiah dari ${data.sender || 'Seseorang'}`)
      if (data.message) {
        await delay(400)
        await speak(data.message)
      }
    } catch (err) {}

    await delay(3500)
    setVisible(false)
    await delay(500)
    isProcessingRef.current = false
    processQueue()
  }

  const connectWS = useCallback(() => {
    if (!uuid) return
    const wsUrl = `${WS_URL}/ws/${uuid}`
    const socket = new WebSocket(wsUrl)
    socketRef.current = socket

    socket.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data)
        if (payload.type === 'alert') {
          queueRef.current.push(payload)
          processQueue()
        }
      } catch (err) {}
    }
    socket.onclose = () => setTimeout(() => connectWS(), 5000)
  }, [uuid])

  useEffect(() => {
    connectWS()
    return () => socketRef.current?.close()
  }, [connectWS])

  if (!visible || !currentAlert) return <main className="overlay-container" onClick={warmUp} />

  const formattedAmount = new Intl.NumberFormat('id-ID', { 
    style: 'currency', 
    currency: 'IDR', 
    minimumFractionDigits: 0 
  }).format(currentAlert.amount).replace(/\s/g, '')

  return (
    <main className="overlay-container" onClick={warmUp}>
      <div className="alert-wrapper animate-alert">
        <img src="/alert.gif" alt="thanks" className="alert-gif" />
        
        <div className="alert-line-primary">
          <span className="amount-highlight">{formattedAmount}</span>
          <span className="text-base"> dari </span>
          <span className="sender-name">{currentAlert.sender || 'Seseorang'}</span>
        </div>

        {currentAlert.message && (
          <div className="alert-line-secondary">
            {currentAlert.message}
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Calistoga&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap');
        
        .overlay-container {
          width: 100vw; height: 100vh; background: transparent;
          display: flex; align-items: center; justify-content: center;
          overflow: hidden; font-family: 'Plus Jakarta Sans', sans-serif;
        }

        .alert-wrapper {
          display: flex; flex-direction: column; align-items: center;
          text-align: center; width: 100%; max-width: 900px;
        }

        .alert-gif { 
          width: 220px; height: auto; margin-bottom: 24px;
        }

        .alert-line-primary {
          font-size: 3.5rem; font-weight: 800; line-height: 1.1; color: #ffffff;
          letter-spacing: -0.02em;
          /* Strong clean outline for readability */
          text-shadow: 
            2px 2px 0 #000,
            -2px -2px 0 #000,  
             2px -2px 0 #000,
            -2px  2px 0 #000,
             0px  2px 0 #000,
             0px -2px 0 #000,
             2px  0px 0 #000,
            -2px  0px 0 #000;
        }

        .amount-highlight {
          color: #0052ff; /* Theme Accent Blue */
          font-family: 'Calistoga', serif;
        }

        .sender-name {
          color: #ffffff;
        }

        .text-base {
          font-weight: 600; color: #ffffff; font-size: 2rem;
        }

        .alert-line-secondary {
          font-size: 2.2rem; color: #ffffff; font-weight: 700;
          margin-top: 12px; max-width: 800px; word-wrap: break-word;
          font-family: 'Plus Jakarta Sans', sans-serif;
          /* Strong clean outline */
          text-shadow: 
            1.5px 1.5px 0 #000,
            -1.5px -1.5px 0 #000,  
             1.5px -1.5px 0 #000,
            -1.5px  1.5px 0 #000,
             0px  1.5px 0 #000,
             0px -1.5px 0 #000,
             1.5px  0px 0 #000,
            -1.5px  0px 0 #000;
        }

        /* Clean animations */
        .animate-alert { 
          animation: alertEnter 0.6s cubic-bezier(0.23, 1, 0.32, 1) both; 
        }

        @keyframes alertEnter {
          0% { transform: scale(0.9) translateY(30px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
      `}</style>
    </main>
  )

}

export default AlertOverlay
