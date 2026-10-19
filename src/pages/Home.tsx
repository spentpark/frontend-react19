import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"

import { getGames, searchGames, type Game } from "../services/gameService"
import { isCanceledError } from "../services/http"

const DEFAULT_PLATFORM = "Sony Playstation 4"
const PAGE_SIZE = 5
const SEARCH_DEBOUNCE_MS = 350

/* Listado, búsqueda y paginación de juegos */
function Home() {
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
    <div className="game-list">
      <h1 className="title">🎮 Game List ({platform})</h1>

      {/* ================= BUSCADOR ================= */}

      <form
        className="search-container"
        role="search"
        onSubmit={(event) => {
          event.preventDefault()
          handleSearch()
        }}
      >
        <label className="sr-only" htmlFor="game-search">
          Search game
        </label>

        <input
          id="game-search"
          className="search-input"
          type="text"
          placeholder="Search game..."
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
        />

        <button className="search-btn" type="submit">
          🔎 Search
        </button>

        {inputValue && (
          <button className="clear-btn" type="button" onClick={handleClear}>
            ✖ Clear
          </button>
        )}
      </form>

      {/* ================= LOADING ================= */}

      {isInitialLoading && (
        <output className="loading-container">
          <div className="spinner"></div>
          <p>Loading games...</p>
        </output>
      )}

      {/* ================= ERROR ================= */}

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      {/* ================= TABLA ================= */}

      {games.length > 0 && (
        <>
          <table className="styled-table">
            <caption className="sr-only">Games for {platform}</caption>

            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Title</th>
                <th scope="col">Action</th>
              </tr>
            </thead>

            <tbody>
              {games.map((game) => (
                <tr key={game.id}>
                  <td>{game.id}</td>
                  <td>{game.title}</td>
                  <td>
                    <button className="btn-view" type="button" onClick={() => viewGame(game)}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ================= PAGINACIÓN ================= */}

          {totalPages > 1 && (
            <nav className="pagination" aria-label="Pagination">
              <button
                className="btn-nav"
                type="button"
                onClick={() => setPage((prev) => prev - 1)}
                disabled={page <= 1}
              >
                ⬅ Prev
              </button>

              <span className="page-info">
                Page {page} of {totalPages}
              </span>

              <button
                className="btn-nav"
                type="button"
                onClick={() => setPage((prev) => prev + 1)}
                disabled={page >= totalPages}
              >
                Next ➡
              </button>
            </nav>
          )}
        </>
      )}

      {/* ================= VACÍO ================= */}

      {!loading && !error && games.length === 0 && (
        <div className="no-games-message">No games found</div>
      )}
    </div>
  )
}

export default Home
