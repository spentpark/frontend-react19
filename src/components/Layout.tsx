import { Suspense } from "react"
import { Outlet } from "react-router-dom"

import ErrorBoundary from "./ErrorBoundary"
import HamburgerMenu from "./HamburgerMenu"

const CURRENT_YEAR = new Date().getFullYear()

/* Estructura común a todas las páginas: cabecera, contenido y pie */
function Layout() {
  return (
    <>
      <header className="header">
        <div className="header-content">
          <HamburgerMenu />
        </div>
      </header>

      <main className="app-main">
        <ErrorBoundary>
          <Suspense
            fallback={
              <output className="loading-container">
                <div className="spinner"></div>
                <p>Loading...</p>
              </output>
            }
          >
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>

      <footer className="app-footer">
        &copy; {CURRENT_YEAR} Spentpark - All rights reserved - Version 1.0.0 - React 19.3
      </footer>
    </>
  )
}

export default Layout
