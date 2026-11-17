import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"

import { getGameById, type GameDetail as GameDetailModel } from "../services/gameService"
import { getReviewsByGame, REVIEWS_PAGE_SIZE, type Review } from "../services/reviewService"
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
    <div className="error-message" role="alert">
      {message}
    </div>

    <button className="back-btn" type="button" onClick={onBack}>
      <i className="fas fa-arrow-left" aria-hidden="true"></i> Back
    </button>
  </div>
)

function GameDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [game, setGame] = useState<GameDetailModel | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  /* Reseñas del juego, paginadas de REVIEWS_PAGE_SIZE en REVIEWS_PAGE_SIZE */
  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewsPage, setReviewsPage] = useState(1)
  const [reviewsTotalPages, setReviewsTotalPages] = useState(0)
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [reviewsError, setReviewsError] = useState<string | null>(null)

  /* Ajuste de estado en render: al cambiar de juego volvemos a la página 1 de
     reseñas sin pedir la página anterior */
  const [previousId, setPreviousId] = useState(id)

  if (previousId !== id) {
    setPreviousId(id)
    setReviewsPage(1)
  }

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

  /* Carga de reseñas; se cancela la petición en vuelo al cambiar de página o
     de juego, o al desmontar el componente */
  useEffect(() => {
    if (!id) return

    const controller = new AbortController()

    const fetchReviews = async () => {
      try {
        setReviewsLoading(true)
        setReviewsError(null)

        const data = await getReviewsByGame(id, reviewsPage, REVIEWS_PAGE_SIZE, controller.signal)

        setReviews(data.data ?? [])
        setReviewsTotalPages(data.pagination?.totalPages ?? 0)
      } catch (err) {
        if (isCanceledError(err)) return

        console.error(err)
        setReviewsError("No se pudieron cargar las reseñas.")
        setReviews([])
        setReviewsTotalPages(0)
      } finally {
        if (!controller.signal.aborted) {
          setReviewsLoading(false)
        }
      }
    }

    fetchReviews()

    return () => controller.abort()
  }, [id, reviewsPage])

  const goBack = () => navigate(-1)

  /* Sin id en la ruta no hay nada que cargar */
  if (!id) return <DetailMessage message="Juego no encontrado." onBack={goBack} />

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading game...</p>
      </div>
    )
  }

  if (error) return <DetailMessage message={error} onBack={goBack} />

  if (!game) return <p className="empty-state">Game not found</p>

  return (
    <div className="game-detail-container">
      {/* ================= CABECERA DE PÁGINA ================= */}

      <div className="page-head">
        <nav className="breadcrumb" aria-label="Ruta de navegación">
          <Link to="/">Inicio</Link>
          <span aria-hidden="true">/</span>
          <Link to="/catalog">Games</Link>
          <span aria-hidden="true">/</span>
          <strong>Detalle</strong>
        </nav>

        <h1>{game.title}</h1>
        <p>{game.description}</p>
      </div>

      {/* ================= PORTADA + META ================= */}

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
      </div>

      {/* ================= VÍDEOS + SPOTIFY ================= */}

      <section className="card detail-card" aria-label="Videos">
        {VIDEOS.map((video) => (
          <VideoEmbed
            key={video.label}
            label={video.label}
            gameTitle={game.title}
            url={game[video.field]}
          />
        ))}

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
      </section>

      {/* ================= RESEÑAS ================= */}

      <section className="card detail-card" aria-label="Reviews">
        <h2 className="section-title">Reviews</h2>

        {reviewsLoading && (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading reviews...</p>
          </div>
        )}

        {reviewsError && (
          <div className="error-message" role="alert">
            {reviewsError}
          </div>
        )}

        {!reviewsLoading && !reviewsError && reviews.length === 0 && (
          <p className="no-reviews-message">No reviews yet</p>
        )}

        {reviews.length > 0 && (
          <>
            <ul className="review-list">
              {reviews.map((review) => (
                <li key={review.id} className="review-card">
                  <div className="review-header">
                    <span className="review-source">{review.source}</span>

                    {review.score && <span className="review-score">{review.score}</span>}
                  </div>

                  {review.name && <p className="review-author">{review.name}</p>}

                  {review.date && <p className="review-date">{review.date}</p>}

                  <p className="review-text">{review.review}</p>
                </li>
              ))}
            </ul>

            {reviewsTotalPages > 1 && (
              <div className="pagination-container">
                <div className="pagination-wrapper">
                  <div className="page-info">
                    Page <strong>{reviewsPage}</strong> of <strong>{reviewsTotalPages}</strong>
                  </div>

                  <div className="page-buttons">
                    <button
                      className="btn-pagination"
                      type="button"
                      aria-label="Previous reviews page"
                      onClick={() => setReviewsPage((prev) => prev - 1)}
                      disabled={reviewsPage <= 1}
                    >
                      <i className="fas fa-angle-left" aria-hidden="true"></i> Prev
                    </button>

                    <button
                      className="btn-pagination primary"
                      type="button"
                      aria-label="Next reviews page"
                      onClick={() => setReviewsPage((prev) => prev + 1)}
                      disabled={reviewsPage >= reviewsTotalPages}
                    >
                      Next <i className="fas fa-angle-right" aria-hidden="true"></i>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* ================= VOLVER ================= */}

      <button className="back-btn" type="button" onClick={goBack}>
        <i className="fas fa-arrow-left" aria-hidden="true"></i> Back
      </button>
    </div>
  )
}

export default GameDetail
