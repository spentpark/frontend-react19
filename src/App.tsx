import { lazy } from "react"
import { BrowserRouter, Route, Routes } from "react-router-dom"

import Layout from "./components/Layout"
import Catalog from "./pages/Catalog"
import Home from "./pages/Home"

import "./App.css"

/* El detalle y las noticias se cargan bajo demanda para reducir el bundle
   inicial */
const GameDetail = lazy(() => import("./components/GameDetail"))
const News = lazy(() => import("./pages/News"))

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/game/:id" element={<GameDetail />} />
          <Route path="/news" element={<News />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
