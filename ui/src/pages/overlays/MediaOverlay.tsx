import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { API_URL, WS_URL } from '../../lib/api'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import '../../App.css'

interface MediaConfig {
  enabled?: boolean
}

function extractYouTubeId(url: string) {
  const match = url.match(/(?:v=|\/shorts\/|\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{6,})/)
  return match ? match[1] : null
}

function extractInstagramCode(url: string) {
  const match = url.match(/instagram\.com\/(?:p|reel|tv)\/([^/?#]+)/)
  return match ? match[1] : null
}

function extractTikTokId(url: string) {
  const match = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/)
  return match ? match[1] : null
}

function pickEmbedUrl(url: string) {
  const yt = extractYouTubeId(url)
  if (yt) return { url: `https://www.youtube.com/embed/${yt}`, platform: 'YouTube' }
  const tt = extractTikTokId(url)
  if (tt) return { url: `https://www.tiktok.com/embed/v2/${tt}`, platform: 'TikTok' }
  const ig = extractInstagramCode(url)
  if (ig) return { url: `https://www.instagram.com/p/${ig}/embed`, platform: 'Instagram' }
  return null
}

function MediaOverlay() {
  useDocumentTitle('Media Overlay')
  const { uuid } = useParams()
  const [enabled, setEnabled] = useState(true)
  const [embed, setEmbed] = useState<{ url: string; platform: string } | null>(null)

  const fetchMedia = useCallback(async () => {
    if (!uuid) return
    try {
      const res = await fetch(`${API_URL}/user/uuid/${uuid}`)
      if (res.ok) {
        const data = await res.json()
        const config: MediaConfig = data.media_config || {}
        setEnabled(config.enabled ?? true)
      }
    } catch {
      // ignore
    }
  }, [uuid])

  const connectWS = useCallback(() => {
    if (!uuid) return
    const socket = new WebSocket(`${WS_URL}/ws/${uuid}`)

    socket.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data)
        if (payload.type === 'alert' || payload.type === 'refresh') {
          fetchMedia()
          if (payload.media_url) {
            setEmbed(pickEmbedUrl(payload.media_url))
          }
        }
      } catch {
        // ignore
      }
    }

    socket.onclose = () => setTimeout(connectWS, 5000)
  }, [uuid, fetchMedia])

  useEffect(() => {
    fetchMedia()
  }, [fetchMedia])

  useEffect(() => {
    connectWS()
  }, [connectWS])

  if (!enabled) return <main className="overlay-container" />

  return (
    <main className="overlay-container">
      <div className="media-wrapper animate-alert">
        <div className="media-content">
          <div className="media-header">
            <span className="media-label">MEDIASHARE</span>
            <span className="media-platform">{embed?.platform || 'Media'}</span>
          </div>

          {embed ? (
            <div className="media-frame">
              <iframe
                src={embed.url}
                title="Media"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="media-empty">
              <p>Belum ada link media</p>
              <span>Tambahkan link YouTube / TikTok / Instagram di pengaturan.</span>
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

        .media-wrapper {
          display: flex; flex-direction: column; align-items: center;
          text-align: center; width: 100%; max-width: 1000px;
        }

        .media-content {
          background: var(--accent);
          padding: 24px 28px 32px;
          border-radius: 28px;
          color: #ffffff;
          display: flex; flex-direction: column; gap: 16px;
          width: 100%;
          border: 3px solid rgba(255, 255, 255, 0.12);
        }

        .media-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-weight: 900;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          font-size: 0.7rem;
        }

        .media-frame {
          width: 100%;
          background: rgba(0,0,0,0.15);
          border-radius: 18px;
          overflow: hidden;
          border: 2px solid rgba(255, 255, 255, 0.15);
        }

        .media-frame iframe {
          width: 100%;
          height: 520px;
          border: none;
          background: #000;
        }

        .media-empty {
          padding: 48px 24px;
          border-radius: 18px;
          background: rgba(255,255,255,0.1);
        }

        .media-empty p {
          font-size: 1.6rem;
          font-weight: 900;
          margin: 0 0 6px 0;
        }

        .media-empty span {
          font-size: 1rem;
          opacity: 0.8;
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

export default MediaOverlay
