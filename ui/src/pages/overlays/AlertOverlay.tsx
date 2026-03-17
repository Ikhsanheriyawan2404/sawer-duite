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
    // PUBLIC ACCESS: No token required for overlay handshake
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

  return (
    <main className="overlay-container" onClick={warmUp}>
      <div className="alert-card animate-alert">
        <div className="alert-accent"></div>
        <img src="/thanks.gif" alt="thanks" className="alert-gif" />
        <div className="alert-content">
          <div className="alert-user">{currentAlert.sender || 'Someone'}</div>
          <div className="alert-amount">
            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(currentAlert.amount)}
          </div>
          {currentAlert.message && <div className="alert-msg">"{currentAlert.message}"</div>}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap');
        .overlay-container {
          width: 100vw; height: 100vh; background: transparent;
          display: flex; align-items: flex-start; justify-content: center;
          padding-top: 80px; overflow: hidden; font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .alert-card {
          background: rgba(15, 15, 15, 0.9); backdrop-filter: blur(20px);
          border-radius: 24px; padding: 20px 40px; min-width: 350px;
          display: flex; flex-direction: column; align-items: center;
          border: 1px solid rgba(255,255,255,0.1); position: relative;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
        }
        .alert-accent {
          position: absolute; top: 0; left: 50%; transform: translateX(-50%);
          width: 100px; height: 4px; background: #863bff; border-radius: 0 0 10px 10px;
          box-shadow: 0 0 20px #863bff;
        }
        .alert-gif { width: 100px; height: auto; margin-bottom: 12px; }
        .alert-user { font-size: 1rem; color: rgba(255,255,255,0.6); font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
        .alert-amount { font-size: 2.2rem; font-weight: 800; color: #fff; margin: 4px 0; }
        .alert-msg { font-size: 1.1rem; color: #863bff; font-weight: 500; font-style: italic; margin-top: 8px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 8px; }
        .animate-alert { animation: alertSlideIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
        @keyframes alertSlideIn {
          0% { transform: translateY(-50px); opacity: 0; filter: blur(10px); }
          100% { transform: translateY(0); opacity: 1; filter: blur(0); }
        }
      `}</style>
    </main>
  )
}

export default AlertOverlay
