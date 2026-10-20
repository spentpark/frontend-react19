import { useEffect, useState } from "react"

const STORAGE_KEY = "spentpark-theme"

type Theme = "light" | "dark"

/* Lee el tema guardado por el usuario (el script de index.html ya lo aplica
   antes del primer render para evitar el parpadeo) */
const readStoredTheme = (): Theme | null => {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === "light" || value === "dark" ? value : null
  } catch {
    return null
  }
}

/* Botón de alternancia entre tema claro y oscuro */
function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = readStoredTheme()

    if (stored) return stored

    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light"
  })

  /* Mantiene el atributo del documento alineado con el estado del botón */
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme)
  }, [theme])

  const toggleTheme = () => {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark"

    setTheme(nextTheme)

    try {
      localStorage.setItem(STORAGE_KEY, nextTheme)
    } catch {
      /* sin almacenamiento: el tema solo dura la sesión */
    }
  }

  return (
    <button
      className="icon-btn"
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      title="Toggle light / dark theme"
    >
      <i className="fas fa-moon icon-moon" aria-hidden="true"></i>
      <i className="fas fa-sun icon-sun" aria-hidden="true"></i>
    </button>
  )
}

export default ThemeToggle
