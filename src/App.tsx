import { useEffect, useState } from "react"
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  Outlet
} from "react-router-dom"

import GameDetail from "./components/GameDetail"
import HamburgerMenu from "./components/HamburgerMenu"

import "./App.css"

import { getGames, searchGames } from "./services/gameService"
import { getPlatforms } from "./services/platformService"

interface Game {
  id: number
  title: string
  platform: string
}

interface Platform {
  id: number
  description: string
  url: string
}

/* ================= LAYOUT GLOBAL ================= */

function Layout() {
  return (
    <>
      <header className="header">
        <div className="header-content">
          <HamburgerMenu />
        </div>
      </header>

      <Outlet />

      <footer className="app-footer">
        &copy; {new Date().getFullYear()} Spentpark - All rights reserved - Version 1.0.0 - React 19.2
      </footer>
    </>
  )
}

/* ================= HOME ================= */

function Home() {
  const [games, setGames] = useState<Game[]>([])
  const [, setPlatforms] = useState<Platform[]>([])
  const [platform] = useState<string>("Sony Playstation 4")

  const [searchTitle, setSearchTitle] = useState<string>("")

  const [page, setPage] = useState<number>(1)
  const [totalPages, setTotalPages] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(false)

  const navigate = useNavigate()

  const limit = 5

  /* ================= PLATFORMS ================= */

  useEffect(() => {
    const fetchPlatforms = async () => {
      try {
        const data = await getPlatforms()
        setPlatforms(data)
      } catch (err) {
        console.error(err)
      }
    }

    fetchPlatforms()
  }, [])

  /* ================= GAMES ================= */

  useEffect(() => {
    const fetchGames = async () => {
      try {
        setLoading(true)

        let data

        if (searchTitle.trim() !== "") {
          data = await searchGames(searchTitle, page, limit)
        } else {
          data = await getGames(platform, page, limit)
        }

        setGames(data?.data ?? [])
        setTotalPages(
          data?.pagination?.totalPages ?? 1
        )

      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchGames()

  }, [page, platform, searchTitle])

  /* ================= NAVIGATION ================= */

  const viewGame = (game: Game) => {
    navigate(`/game/${game.id}`)
  }

  /* ================= UI ================= */

  return (
    <div className="game-list">

      <h2 className="title">
        🎮 Game List ({platform})
      </h2>

      {/* ================= BUSCADOR ================= */}

      <div className="search-container">

        <input
          className="search-input"
          type="text"
          placeholder="Search game..."
          value={searchTitle}
          onChange={(e) => {
            setPage(1)
            setSearchTitle(e.target.value)
          }}
        />

        <button
          className="search-btn"
          onClick={() => setPage(1)}
        >
          🔎 Search
        </button>

        {searchTitle && (
          <button
            className="clear-btn"
            onClick={() => {
              setSearchTitle("")
              setPage(1)
            }}
          >
            ✖ Clear
          </button>
        )}

      </div>

      {/* ================= LOADING ================= */}

      {loading && (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading games...</p>
        </div>
      )}

      {/* ================= TABLE ================= */}

      {!loading && games.length > 0 && (
        <>
          <table className="styled-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {games.map((game) => (
                <tr key={game.id}>
                  <td>{game.id}</td>
                  <td>{game.title}</td>
                  <td>
                    <button
                      className="btn-view"
                      onClick={() => viewGame(game)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ================= PAGINATION ================= */}

          {totalPages > 1 && (
            <div className="pagination">

              <button
                className="btn-nav"
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
                onClick={() => setPage((prev) => prev + 1)}
                disabled={page >= totalPages}
              >
                Next ➡
              </button>

            </div>
          )}
        </>
      )}

      {/* ================= EMPTY ================= */}

      {!loading && games.length === 0 && (
        <div className="no-games-message">
          No games found
        </div>
      )}

    </div>
  )
}

/* ================= APP ROUTER ================= */

function App() {
  return (
    <BrowserRouter>

      <Routes>

        <Route element={<Layout />}>

          <Route path="/" element={<Home />} />

          <Route
            path="/game/:id"
            element={<GameDetail />}
          />

        </Route>

      </Routes>

    </BrowserRouter>
  )
}

export default App