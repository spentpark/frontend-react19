import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { getPlatforms } from "../services/platformService"
import type { Platform } from "../services/platformService"

const HamburgerMenu = () => {
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [open, setOpen] = useState<boolean>(false)

  useEffect(() => {
    const fetchPlatforms = async () => {
      try {
        const data = await getPlatforms()
        setPlatforms(data)
      } catch (error) {
        console.error("Error cargando plataformas", error)
      }
    }

    fetchPlatforms()
  }, [])

  return (
    <>
      {/* BOTÓN HAMBURGUESA */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          fontSize: "26px",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "white"
        }}
      >
        ☰
      </button>

      {/* OVERLAY */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.4)",
            zIndex: 998
          }}
        />
      )}

      {/* MENÚ LATERAL */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: open ? 0 : "-260px",
          width: "260px",
          height: "100%",
          backgroundColor: "#3498db",
          color: "white",
          padding: "25px",
          transition: "left 0.3s ease",
          zIndex: 999,
          boxShadow: "4px 0 10px rgba(0,0,0,0.2)"
        }}
      >
        <h2 style={{ marginBottom: "20px" }}>Plataformas</h2>

        <ul style={{ listStyle: "none", padding: 0 }}>
          {platforms.map((platform) => (
            <li key={platform.id} style={{ margin: "12px 0" }}>
              <Link
                to={`/?platform=${encodeURIComponent(platform.description)}`}
                onClick={() => setOpen(false)}
                style={{
                  color: "white",
                  textDecoration: "none",
                  fontWeight: 500
                }}
              >
                {platform.description}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}

export default HamburgerMenu