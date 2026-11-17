import { useEffect, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"

import { getGames, searchGames, type Game } from "../services/gameService"
import { isCanceledError } from "../services/http"

const DEFAULT_PLATFORM = "Sony Playstation 4"
const PAGE_SIZE = 5
const SEARCH_DEBOUNCE_MS = 350

/* Listado, búsqueda y paginación de juegos */
function Catalog() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const platform = searchParams.get("platform") ?? DEFAULT_PLATFORM

  const [inputValue, setInputValue] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [page, setPage] = useState(1)
  const [games, setGames] = useState<Game[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /* Ajuste de estado en render: al cambiar de plataforma volvemos a la página 1
     sin provocar una petición extra con la página anterior */
  const [previousPlatform, setPreviousPlatform] = useState(platform)

  if (previousPlatform !== platform) {
    setPreviousPlatform(platform)
    setPage(1)
  }

  /* Debounce: esperamos a que el usuario deje de escribir antes de buscar */
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(inputValue.trim())
      setPage(1)
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [inputValue])

  /* Carga de juegos; la petición en vuelo se cancela al cambiar los filtros */
  useEffect(() => {
    const controller = new AbortController()

    const fetchGames = async () => {
      try {
        setLoading(true)
        setError(null)

        const data =
          searchTerm !== ""
            ? await searchGames(searchTerm, page, PAGE_SIZE, controller.signal)
            : await getGames(platform, page, PAGE_SIZE, controller.signal)

        setGames(data.data ?? [])
        setTotalPages(data.pagination?.totalPages ?? 0)
      } catch (err) {
        if (isCanceledError(err)) return

        console.error(err)
        setError("No se pudieron cargar los juegos. Inténtalo de nuevo.")
        setGames([])
        setTotalPages(0)
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    fetchGames()

    return () => controller.abort()
  }, [page, platform, searchTerm])

  const handleSearch = () => {
    setSearchTerm(inputValue.trim())
    setPage(1)
  }

  const handleClear = () => {
    setInputValue("")
    setSearchTerm("")
    setPage(1)
  }

  const viewGame = (game: Game) => {
    navigate(`/game/${game.id}`)
  }

  const isInitialLoading = loading && games.length === 0

  return (
    <div className="catalog">
      {/* ================= CABECERA DE PÁGINA ================= */}

      <div className="page-head">
        <nav className="breadcrumb" aria-label="Ruta de navegación">
          <Link to="/">Inicio</Link>
          <span aria-hidden="true">/</span>
          <strong>{platform}</strong>
        </nav>

        <h1>{platform}</h1>
        <p>Games catalog</p>
      </div>

      {/* ================= LISTADO ================= */}

      <section className="card" aria-label="Games">
        <div className="toolbar">
          <form
            className="search-form"
            role="search"
            onSubmit={(event) => {
              event.preventDefault()
              handleSearch()
            }}
          >
            <div className="search-field">
              <i className="fas fa-magnifying-glass" aria-hidden="true"></i>

              <label className="sr-only" htmlFor="game-search">
                Search games
              </label>

              <input
                id="game-search"
                type="text"
                placeholder="Search games"
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
              />
            </div>

            <button className="btn-primary" type="submit">
              Search
            </button>

            {inputValue && (
              <button
                className="btn-clear"
                type="button"
                aria-label="Clear search"
                onClick={handleClear}
              >
                <i className="fas fa-xmark" aria-hidden="true"></i>
              </button>
            )}
          </form>

          <p className="result-count">
            <strong>{games.length}</strong> games on this page
          </p>
        </div>

        {/* ================= LOADING ================= */}

        {isInitialLoading && (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading games...</p>
          </div>
        )}

        {/* ================= ERROR ================= */}

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        {/* ================= TABLA ================= */}

        <div className="table-scroll">
          <table className="styled-table">
            <caption className="sr-only">Games for {platform}</caption>

            <thead>
              <tr>
                <th scope="col" className="col-id">
                  Id
                </th>
                <th scope="col">Name</th>
                <th scope="col" className="col-action">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {games.map((game) => (
                <tr key={game.id}>
                  <td className="col-id">{game.id}</td>
                  <td>{game.title}</td>
                  <td className="col-action">
                    <button className="btn-view" type="button" onClick={() => viewGame(game)}>
                      <i className="fas fa-eye" aria-hidden="true"></i> View
                    </button>
                  </td>
                </tr>
              ))}

              {!loading && !error && games.length === 0 && (
                <tr>
                  <td colSpan={3} className="empty">
                    No games found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ================= PAGINACIÓN ================= */}

        {totalPages > 1 && (
          <div className="pagination-container">
            <div className="pagination-wrapper">
              <div className="page-info">
                Page <strong>{page}</strong> of <strong>{totalPages}</strong>
              </div>

              <div className="page-buttons">
                <button
                  className="btn-pagination"
                  type="button"
                  aria-label="First page"
                  onClick={() => setPage(1)}
                  disabled={page <= 1}
                >
                  <i className="fas fa-angles-left" aria-hidden="true"></i>
                </button>

                <button
                  className="btn-pagination"
                  type="button"
                  aria-label="Previous page"
                  onClick={() => setPage((prev) => prev - 1)}
                  disabled={page <= 1}
                >
                  <i className="fas fa-angle-left" aria-hidden="true"></i>
                </button>

                <button
                  className="btn-pagination primary"
                  type="button"
                  aria-label="Next page"
                  onClick={() => setPage((prev) => prev + 1)}
                  disabled={page >= totalPages}
                >
                  Next <i className="fas fa-angle-right" aria-hidden="true"></i>
                </button>

                <button
                  className="btn-pagination"
                  type="button"
                  aria-label="Last page"
                  onClick={() => setPage(totalPages)}
                  disabled={page >= totalPages}
                >
                  <i className="fas fa-angles-right" aria-hidden="true"></i>
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

export default Catalog
