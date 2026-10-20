import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"

import { getPlatforms, type Platform } from "../services/platformService"
import { isCanceledError } from "../services/http"

const HamburgerMenu = () => {
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const [searchParams] = useSearchParams()
  const activePlatform = searchParams.get("platform")

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

  const closeMenu = () => setOpen(false)

  return (
    <>
      {/* BOTÓN HAMBURGUESA */}
      <button
        className="icon-btn"
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="platform-menu"
        onClick={() => setOpen((prev) => !prev)}
      >
        <i className="fas fa-bars" aria-hidden="true"></i>
      </button>

      {/* OVERLAY */}
      {open && (
        <button className="overlay" type="button" aria-label="Close menu" onClick={closeMenu} />
      )}

      {/* SIDEBAR */}
      <aside
        id="platform-menu"
        className={open ? "sidebar open" : "sidebar"}
        aria-label="Platforms menu"
        aria-hidden={!open}
        inert={!open}
      >
        <div className="sidebar-head">
          <span>Plataformas</span>

          <button className="icon-btn" type="button" aria-label="Close menu" onClick={closeMenu}>
            <i className="fas fa-xmark" aria-hidden="true"></i>
          </button>
        </div>

        <nav>
          <Link to="/" onClick={closeMenu}>
            <i className="fas fa-house" aria-hidden="true"></i>
            <span>Inicio</span>
          </Link>

          {platforms.length === 0 && <span className="sidebar-empty">No platforms</span>}

          {platforms.map((platform) => (
            <Link
              key={platform.id}
              to={`/catalog?platform=${encodeURIComponent(platform.description)}`}
              className={activePlatform === platform.description ? "active" : undefined}
              onClick={closeMenu}
            >
              <i className="fas fa-gamepad" aria-hidden="true"></i>
              <span>{platform.description}</span>
            </Link>
          ))}
        </nav>

        {error && (
          <p className="sidebar-error" role="alert">
            {error}
          </p>
        )}
      </aside>
    </>
  )
}

export default HamburgerMenu
