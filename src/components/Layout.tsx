import { Suspense } from "react"
import { Outlet } from "react-router-dom"

import ErrorBoundary from "./ErrorBoundary"
import HamburgerMenu from "./HamburgerMenu"
import ThemeToggle from "./ThemeToggle"

const CURRENT_YEAR = new Date().getFullYear()

/* Estructura común a todas las páginas: header, contenido y pie */
function Layout() {
  return (
    <>
      <header className="header">
        <div className="header-inner">
          <div className="brand">
            <span className="brand-mark">
              <i className="fas fa-gamepad" aria-hidden="true"></i>
            </span>
            <span className="brand-name">Spentpark Games</span>
          </div>

          <div className="header-actions">
            <ThemeToggle />
            <HamburgerMenu />
          </div>
        </div>
      </header>

      <div className="content-wrap">
        <main className="content">
          <ErrorBoundary>
            <Suspense
              fallback={
                <div className="loading-container">
                  <div className="spinner"></div>
                  <p>Loading...</p>
                </div>
              }
            >
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      <footer className="app-footer">
        &copy; {CURRENT_YEAR} Spentpark &middot; All rights reserved &middot; Version 1.0.0 &middot;
        React 19.3
      </footer>
    </>
  )
}

export default Layout
