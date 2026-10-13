import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { getPlatforms, type Platform } from "../services/platformService"
import { isCanceledError } from "../services/http"

const HamburgerMenu = () => {
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    const fetchPlatforms = async () => {
      try {
        setError(null)

        const data = await getPlatforms(controller.signal)

        if (Array.isArray(data)) {
          setPlatforms(data)
        } else {
          console.error("La API no devolvió un array", data)
          setPlatforms([])
        }
      } catch (err) {
        if (isCanceledError(err)) return

        console.error("Error cargando plataformas", err)
        setError("No se pudieron cargar las plataformas.")
      }
    }

    fetchPlatforms()

    return () => controller.abort()
  }, [])

  /* Cierre del menú con la tecla Escape */
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open])

  return (
    <>
      {/* BOTÓN HAMBURGUESA */}
      <button
        className="menu-btn"
        type="button"
        aria-label="Open platforms menu"
        aria-expanded={open}
        aria-controls="platform-menu"
        onClick={() => setOpen((prev) => !prev)}
      >
        ☰
      </button>

      {/* OVERLAY */}
      {open && (
        <button
          className="overlay"
          type="button"
          aria-label="Close platforms menu"
          onClick={() => setOpen(false)}
        />
      )}

      {/* MENÚ */}
      <nav
        id="platform-menu"
        className={open ? "side-menu open" : "side-menu"}
        aria-label="Platforms"
        inert={!open}
      >
        <h2 className="side-menu-title">Plataformas</h2>

        <ul>
          {platforms.length === 0 && <li>No platforms</li>}

          {platforms.map((platform) => (
            <li key={platform.id}>
              <Link
                to={`/?platform=${encodeURIComponent(platform.description)}`}
                onClick={() => setOpen(false)}
              >
                {platform.description}
              </Link>
            </li>
          ))}
        </ul>

        {error && (
          <p className="side-menu-error" role="alert">
            {error}
          </p>
        )}
      </nav>
    </>
  )
}

export default HamburgerMenu
