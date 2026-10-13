import { useState } from "react"

interface VideoEmbedProps {
  label: string
  gameTitle: string
  url?: string
}

/* Los iframes de YouTube se montan solo cuando el usuario los solicita: evita
   descargar el reproductor de terceros (varios cientos de KB) al abrir el detalle */
function VideoEmbed({ label, gameTitle, url }: VideoEmbedProps) {
  const [active, setActive] = useState(false)

  if (!url) return null

  return (
    <>
      <h2 className="section-title">{label}</h2>

      <div className="video-container">
        {active ? (
          <iframe
            title={`${gameTitle} - ${label}`}
            src={url}
            loading="lazy"
            allowFullScreen
          ></iframe>
        ) : (
          <button className="video-placeholder" type="button" onClick={() => setActive(true)}>
            ▶ Play {label}
          </button>
        )}
      </div>
    </>
  )
}

export default VideoEmbed
