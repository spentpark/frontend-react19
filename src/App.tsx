import { lazy } from "react"
import { BrowserRouter, Route, Routes } from "react-router-dom"

import Layout from "./components/Layout"
import Home from "./pages/Home"

import "./App.css"

/* La vista de detalle se carga bajo demanda para reducir el bundle inicial */
const GameDetail = lazy(() => import("./components/GameDetail"))

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/game/:id" element={<GameDetail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
