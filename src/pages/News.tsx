import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import type { Pagination } from "../services/gameService"
import { isCanceledError } from "../services/http"
import {
  EMPTY_NEWS_PAGE,
  NEWS_PAGE_SIZE,
  fetchNewsPage,
  toNewsItem,
  type GameNewsItem
} from "../services/newsService"

/* Ventana de números de página visibles alrededor de la página actual */
const PAGE_WINDOW_SIZE = 5

/* Mensaje de error mostrado cuando el servicio de noticias no responde */
const LOAD_ERROR = "No se pudieron cargar las noticias. El servicio no está disponible."

/* Números de página a pintar: ventana de 5 alrededor de la actual */
const buildPageNumbers = (currentPage: number, totalPages: number): number[] => {
  if (totalPages <= 1) {
    return []
  }

  let start = Math.max(1, currentPage - Math.floor(PAGE_WINDOW_SIZE / 2))
  const end = Math.min(totalPages, start + PAGE_WINDOW_SIZE - 1)
  start = Math.max(1, end - PAGE_WINDOW_SIZE + 1)

  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

/* Noticias de videojuegos: listado paginado de 10 en 10 desde `rss-game-node` */
function News() {
  const [page, setPage] = useState(1)
  const [news, setNews] = useState<GameNewsItem[]>([])
  const [pagination, setPagination] = useState<Pagination>(EMPTY_NEWS_PAGE.pagination)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [requestId, setRequestId] = useState(0)

  /* Carga de la página actual; se cancela la petición en vuelo al cambiar de
     página, al reintentar o al desmontar el componente */
  useEffect(() => {
    const controller = new AbortController()

    const loadNews = async () => {
      try {
        setLoading(true)
        setError(null)

        const data = await fetchNewsPage(page, NEWS_PAGE_SIZE, controller.signal)

        setNews(data.data.map(toNewsItem))
        setPagination(data.pagination)
      } catch (err) {
        if (isCanceledError(err)) return

        console.error(err)
        setNews([])
        setPagination(EMPTY_NEWS_PAGE.pagination)
        setError(LOAD_ERROR)
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadNews()

    return () => controller.abort()
  }, [page, requestId])

  const totalPages = pagination.totalPages
  const pageNumbers = buildPageNumbers(page, totalPages)

  /* Primer y último registro de la página actual, para el resumen */
  const rangeStart = news.length === 0 ? 0 : (page - 1) * NEWS_PAGE_SIZE + 1
  const rangeEnd = news.length === 0 ? 0 : Math.min(page * NEWS_PAGE_SIZE, pagination.totalRecords)

  const goToPage = (target: number) => {
    if (target >= 1 && target <= totalPages && target !== page) {
      setPage(target)
    }
  }

  const reload = () => setRequestId((current) => current + 1)

  return (
    <div className="news">
      {/* ================= CABECERA DE PÁGINA ================= */}

      <div className="page-head">
        <nav className="breadcrumb" aria-label="Ruta de navegación">
          <Link to="/">Inicio</Link>
          <span aria-hidden="true">/</span>
          <strong>Noticias</strong>
        </nav>

        <h1>Noticias de videojuegos</h1>
        <p>Las últimas noticias del mundo gamer, actualizadas desde el servicio de noticias.</p>
      </div>

      {/* ================= LOADING ================= */}

      {loading && (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Cargando noticias…</p>
        </div>
      )}

      {/* ================= ERROR ================= */}

      {!loading && error && (
        <section className="card news-status" role="alert" aria-label="Error al cargar noticias">
          <span className="status-icon" aria-hidden="true">
            📰
          </span>
          <p>{error}</p>
          <button className="btn-primary btn-secondary" type="button" onClick={reload}>
            Reintentar
          </button>
        </section>
      )}

      {/* ================= LISTADO ================= */}

      {!loading && !error && (
        <>
          <section className="news-list" aria-label="Noticias">
            {news.map((item) => (
              <article key={item.id} className="card news-item">
                {item.imageUrl && (
                  <div className="news-media">
                    {item.url ? (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" tabIndex={-1}>
                        <img src={item.imageUrl} alt={item.title} loading="lazy" />
                      </a>
                    ) : (
                      <img src={item.imageUrl} alt={item.title} loading="lazy" />
                    )}
                  </div>
                )}

                <div className="news-body">
                  <div className="news-meta">
                    {item.source && <span className="news-source">{item.source}</span>}

                    {item.publishedAt && (
                      <span className="news-date">
                        <i className="far fa-calendar" aria-hidden="true"></i>
                        {item.publishedAt}
                      </span>
                    )}
                  </div>

                  <h2 className="news-title">
                    {item.url ? (
                      <a href={item.url} target="_blank" rel="noopener noreferrer">
                        {item.title}
                      </a>
                    ) : (
                      item.title
                    )}
                  </h2>

                  {item.summary && <p className="news-summary">{item.summary}</p>}

                  {item.url && (
                    <a
                      className="news-link"
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Leer noticia completa
                      <i className="fas fa-arrow-up-right-from-square" aria-hidden="true"></i>
                    </a>
                  )}
                </div>
              </article>
            ))}

            {news.length === 0 && (
              <section className="card news-status" aria-label="Sin noticias">
                <span className="status-icon" aria-hidden="true">
                  📰
                </span>
                <p>No hay noticias disponibles por el momento.</p>
              </section>
            )}
          </section>

          {/* ================= PAGINACIÓN ================= */}

          {totalPages > 1 && (
            <nav className="pagination-container card" aria-label="Paginación de noticias">
              <div className="pagination-wrapper">
                <div className="page-info">
                  Mostrando <strong>{rangeStart}</strong>–<strong>{rangeEnd}</strong> de{" "}
                  <strong>{pagination.totalRecords}</strong> noticias
                </div>

                <div className="page-buttons">
                  <button
                    className="btn-pagination"
                    type="button"
                    aria-label="Página anterior"
                    onClick={() => goToPage(page - 1)}
                    disabled={page <= 1}
                  >
                    <i className="fas fa-angle-left" aria-hidden="true"></i>
                  </button>

                  {pageNumbers.map((pageNumber) => (
                    <button
                      key={pageNumber}
                      className={pageNumber === page ? "btn-pagination active" : "btn-pagination"}
                      type="button"
                      aria-current={pageNumber === page ? "page" : undefined}
                      onClick={() => goToPage(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  ))}

                  <button
                    className="btn-pagination"
                    type="button"
                    aria-label="Página siguiente"
                    onClick={() => goToPage(page + 1)}
                    disabled={page >= totalPages}
                  >
                    <i className="fas fa-angle-right" aria-hidden="true"></i>
                  </button>
                </div>
              </div>
            </nav>
          )}
        </>
      )}
    </div>
  )
}

export default News
