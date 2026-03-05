import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"

import { getGameById } from "../services/gameService"

interface GameDetail {
  id: number
  title: string
  description: string
  image_Large?: string
  Platform?: string
  Publisher?: string
  genre?: string
  players?: string
  releasedate?: string
  youtube_Trailer?: string
  youtube_Walk?: string
  youtube_ending?: string
  youtube_secrets?: string
  youtube_speedrun?: string
  youtube_review?: string
  spotify_ost?: string
}

function GameDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [game, setGame] = useState<GameDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {

  const fetchGame = async () => {
    try {
      const data = await getGameById(id!)
      setGame(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  fetchGame()

}, [id])

  /* 🔥 Función para convertir Spotify a embed */
  const getSpotifyEmbedUrl = (url: string) => {
    if (!url.includes("spotify.com")) return url
    return url.replace("open.spotify.com/", "open.spotify.com/embed/")
  }

  /* 🔥 Render dinámico para cualquier video */
  const renderVideo = (title: string, url?: string) => {
    if (!url) return null

    return (
      <>
        <h3>{title}</h3>
        <div className="video-container">
          <iframe
            src={url}
            allowFullScreen
          ></iframe>
        </div>
      </>
    )
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading game...</p>
      </div>
    )
  }

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
          />
        )}
        <div className="game-info">
          <h2>{game.title}</h2>
          <p className="description">{game.description}</p>
        </div>
      </div>

      {/* ================= META ================= */}
      <div className="game-meta">
        <div className="meta-card">
          <h4>Platform</h4>
          <p>{game.Platform}</p>
        </div>

        <div className="meta-card">
          <h4>Publisher</h4>
          <p>{game.Publisher}</p>
        </div>

        <div className="meta-card">
          <h4>Genre</h4>
          <p>{game.genre}</p>
        </div>

        <div className="meta-card">
          <h4>Players</h4>
          <p>{game.players}</p>
        </div>

        <div className="meta-card">
          <h4>Release</h4>
          <p>{game.releasedate}</p>
        </div>
      </div>

      {/* ================= VIDEOS ================= */}

      {renderVideo("Trailer", game.youtube_Trailer)}
      {renderVideo("Walkthrough", game.youtube_Walk)}
      {renderVideo("Ending", game.youtube_ending)}
      {renderVideo("Secrets", game.youtube_secrets)}
      {renderVideo("Speed Run", game.youtube_speedrun)}
      {renderVideo("Review", game.youtube_review)}

      {/* ================= SPOTIFY ================= */}

      {game.spotify_ost && (
        <>
          <h3>Original Soundtrack</h3>
          <div className="spotify-container">
            <iframe
              src={getSpotifyEmbedUrl(game.spotify_ost)}
              height="152"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            ></iframe>
          </div>
        </>
      )}

      {/* ================= BACK ================= */}
      <button
        onClick={() => navigate(-1)}
        className="back-btn"
      >
        ⬅ Back
      </button>

    </div>
  )
}

export default GameDetail