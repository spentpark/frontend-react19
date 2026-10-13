import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

import { getGameById, type GameDetail as GameDetailModel } from "../services/gameService"
import { isCanceledError } from "../services/http"
import VideoEmbed from "./VideoEmbed"

/* Convierte una URL de Spotify en su versión embebible */
const getSpotifyEmbedUrl = (url: string) =>
  url.includes("spotify.com") ? url.replace("open.spotify.com/", "open.spotify.com/embed/") : url

const VIDEOS = [
  { label: "Trailer", field: "youtube_Trailer" },
  { label: "Walkthrough", field: "youtube_Walk" },
  { label: "Ending", field: "youtube_ending" },
  { label: "Secrets", field: "youtube_secrets" },
  { label: "Speed Run", field: "youtube_speedrun" },
  { label: "Review", field: "youtube_review" }
] as const

interface DetailMessageProps {
  message: string
  onBack: () => void
}

/* Mensaje con acción de volver, usado cuando no hay juego que mostrar */
const DetailMessage = ({ message, onBack }: DetailMessageProps) => (
  <div className="game-detail-container">
    <p className="error-message" role="alert">
      {message}
    </p>

    <button className="back-btn" type="button" onClick={onBack}>
      ⬅ Back
    </button>
  </div>
)

function GameDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [game, setGame] = useState<GameDetailModel | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return

    const controller = new AbortController()

    const fetchGame = async () => {
      try {
        setLoading(true)
        setError(null)

        const data = await getGameById(id, controller.signal)

        setGame(data)
      } catch (err) {
        if (isCanceledError(err)) return

        console.error(err)
        setError("No se pudo cargar el juego. Inténtalo de nuevo.")
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    fetchGame()

    return () => controller.abort()
  }, [id])

  const goBack = () => navigate(-1)

  /* Sin id en la ruta no hay nada que cargar */
  if (!id) return <DetailMessage message="Juego no encontrado." onBack={goBack} />

  if (loading) {
    return (
      <div className="loading-container" role="status">
        <div className="spinner"></div>
        <p>Loading game...</p>
      </div>
    )
  }

  if (error) return <DetailMessage message={error} onBack={goBack} />

  if (!game) return <p>Game not found</p>

  return (
    <div className="game-detail-container">
      {/* ================= HEADER ================= */}
      <div className="game-header">
        {game.image_Large && (
          <img
            src={game.image_Large}
            alt={game.title}
            className="game-cover"
            loading="lazy"
            decoding="async"
          />
        )}

        <div className="game-info">
          <h1>{game.title}</h1>
          <p className="description">{game.description}</p>
        </div>
      </div>

      {/* ================= META ================= */}
      <div className="game-meta">
        <div className="meta-card">
          <h2 className="meta-label">Platform</h2>
          <p>{game.Platform}</p>
        </div>

        <div className="meta-card">
          <h2 className="meta-label">Publisher</h2>
          <p>{game.Publisher}</p>
        </div>

        <div className="meta-card">
          <h2 className="meta-label">Genre</h2>
          <p>{game.genre}</p>
        </div>

        <div className="meta-card">
          <h2 className="meta-label">Players</h2>
          <p>{game.players}</p>
        </div>

        <div className="meta-card">
          <h2 className="meta-label">Release</h2>
          <p>{game.releasedate}</p>
        </div>
      </div>

      {/* ================= VIDEOS ================= */}

      {VIDEOS.map((video) => (
        <VideoEmbed
          key={video.label}
          label={video.label}
          gameTitle={game.title}
          url={game[video.field]}
        />
      ))}

      {/* ================= SPOTIFY ================= */}

      {game.spotify_ost && (
        <>
          <h2 className="section-title">Original Soundtrack</h2>

          <div className="spotify-container">
            <iframe
              title={`${game.title} - Original Soundtrack`}
              src={getSpotifyEmbedUrl(game.spotify_ost)}
              height="152"
              loading="lazy"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            ></iframe>
          </div>
        </>
      )}

      {/* ================= BACK ================= */}

      <button className="back-btn" type="button" onClick={goBack}>
        ⬅ Back
      </button>
    </div>
  )
}

export default GameDetail
