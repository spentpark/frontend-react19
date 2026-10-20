import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { getRandomGame, type RandomGame } from "../services/gameService"
import { isCanceledError } from "../services/http"

/* La pantalla se refresca sola para ir descubriendo otros juegos */
const REFRESH_MS = 200000

const UNKNOWN_VALUE = "—"

const orDash = (value?: string | null) => value || UNKNOWN_VALUE

/* Convierte una URL de YouTube (embed, watch o youtu.be) en su versión
   embebible con autoplay */
const buildTrailerEmbedUrl = (url: string): string => {
  const withAutoplay = (base: string) => base + (base.includes("?") ? "&autoplay=1" : "?autoplay=1")

  try {
    const parsed = new URL(url)

    if (parsed.hostname === "youtu.be") {
      const videoId = parsed.pathname.slice(1)
      if (videoId) return withAutoplay(`https://www.youtube.com/embed/${videoId}`)
    }

    if (parsed.hostname.endsWith("youtube.com") && parsed.pathname === "/watch") {
      const videoId = parsed.searchParams.get("v")
      if (videoId) return withAutoplay(`https://www.youtube.com/embed/${videoId}`)
    }
  } catch {
    /* URL relativa o no parseable: se usa tal cual con autoplay */
  }

  return withAutoplay(url)
}

/* Pantalla de inicio: un juego al azar de la colección con su tráiler oficial */
function Home() {
  const [game, setGame] = useState<RandomGame | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [requestId, setRequestId] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    let refreshTimer: number | undefined

    const loadRandomGame = async () => {
      try {
        setLoading(true)
        setError(null)

        const data = await getRandomGame(controller.signal)

        setGame(data)
      } catch (err) {
        if (isCanceledError(err)) return

        console.error(err)
        setError("No se pudo cargar el juego al azar. Inténtalo de nuevo.")
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)

          /* Tras cada carga se programa la siguiente de forma automática */
          refreshTimer = window.setTimeout(() => setRequestId((current) => current + 1), REFRESH_MS)
        }
      }
    }

    loadRandomGame()

    return () => {
      controller.abort()
      if (refreshTimer !== undefined) window.clearTimeout(refreshTimer)
    }
  }, [requestId])

  const refresh = () => setRequestId((current) => current + 1)

  const isFirstLoad = loading && !game

  return (
    <div className="home">
      {/* ================= CABECERA DE PÁGINA ================= */}

      <div className="page-head">
        <nav className="breadcrumb" aria-label="Ruta de navegación">
          <Link to="/">Inicio</Link>
          <span aria-hidden="true">/</span>
          <strong>Juego al azar</strong>
        </nav>

        <h1>Descubre tu próximo juego</h1>
        <p>Un juego al azar de la colección, con su tráiler oficial</p>
      </div>

      {/* ================= JUEGO AL AZAR ================= */}

      <section className="card" aria-label="Juego al azar">
        {isFirstLoad && (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Cargando datos…</p>
          </div>
        )}

        {error && !loading && (
          <>
            <div className="error-message" role="alert">
              {error}
            </div>

            <div className="hero-retry">
              <button className="btn-primary" type="button" onClick={refresh}>
                <i className="fas fa-rotate-right" aria-hidden="true"></i> Reintentar
              </button>
            </div>
          </>
        )}

        {!isFirstLoad && !game && !error && (
          <p className="no-games-message">No hay juegos con tráiler disponible.</p>
        )}

        {game && !error && (
          <div className="hero">
            <div className="hero-media">
              {game.youtubeTrailer ? (
                <div className="hero-video">
                  <iframe
                    title={`Tráiler de ${game.title}`}
                    src={buildTrailerEmbedUrl(game.youtubeTrailer)}
                    allow="autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              ) : (
                <div className="media-fallback">
                  <i className="fas fa-film" aria-hidden="true"></i>
                  <span>Sin tráiler disponible</span>
                </div>
              )}

              {game.imageOriginal && (
                <img
                  className="hero-poster"
                  src={game.imageOriginal}
                  alt={`Portada de ${game.title}`}
                  loading="lazy"
                  decoding="async"
                />
              )}
            </div>

            <div className="hero-body">
              <h2 className="hero-title">{game.title}</h2>

              {loading && (
                <p className="hero-loading" role="status">
                  Cargando otro juego…
                </p>
              )}

              <dl className="hero-fields">
                <div className="hero-field">
                  <dt className="hero-label">Plataforma</dt>
                  <dd className="hero-value">{orDash(game.platform)}</dd>
                </div>

                <div className="hero-field">
                  <dt className="hero-label">Distribuidora</dt>
                  <dd className="hero-value">{orDash(game.publisher)}</dd>
                </div>

                <div className="hero-field">
                  <dt className="hero-label">Lanzamiento</dt>
                  <dd className="hero-value">{orDash(game.releasedate)}</dd>
                </div>

                <div className="hero-field">
                  <dt className="hero-label">Jugadores</dt>
                  <dd className="hero-value">{orDash(game.players)}</dd>
                </div>

                <div className="hero-field">
                  <dt className="hero-label">Género</dt>
                  <dd className="hero-value">{orDash(game.genre)}</dd>
                </div>
              </dl>

              <div className="hero-actions">
                <Link className="btn-primary btn-secondary" to={`/game/${game.id}`}>
                  <i className="fas fa-circle-play" aria-hidden="true"></i> Ver juego
                </Link>

                <button className="btn-primary" type="button" onClick={refresh} disabled={loading}>
                  <i className="fas fa-dice" aria-hidden="true"></i> Otro juego al azar
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

export default Home
