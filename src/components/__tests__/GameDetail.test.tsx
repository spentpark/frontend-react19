import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

import GameDetail from "../GameDetail"

import * as gameService from "../../services/gameService"
import type { GameDetail as GameDetailModel } from "../../services/gameService"

vi.mock("../../services/gameService")

const mockGame: GameDetailModel = {
  id: 1,
  title: "The Last of Us",
  description: "Post-apocalyptic action game",
  image_Large: "image.jpg",
  Platform: "PlayStation 4",
  Publisher: "Naughty Dog",
  genre: "Action",
  players: "1",
  releasedate: "2013",
  youtube_Trailer: "https://youtube.com/embed/test",
  youtube_Walk: "https://youtube.com/embed/walk",
  spotify_ost: "https://open.spotify.com/album/test"
}

const renderComponent = () =>
  render(
    <MemoryRouter initialEntries={["/game/1"]}>
      <Routes>
        <Route path="/game/:id" element={<GameDetail />} />
      </Routes>
    </MemoryRouter>
  )

describe("GameDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("muestra loading inicialmente", () => {
    vi.spyOn(gameService, "getGameById").mockResolvedValue(mockGame)

    renderComponent()

    expect(screen.getByText("Loading game...")).toBeInTheDocument()
  })

  it("carga y muestra datos del juego", async () => {
    vi.spyOn(gameService, "getGameById").mockResolvedValue(mockGame)

    renderComponent()

    expect(await screen.findByText("The Last of Us")).toBeInTheDocument()
    expect(screen.getByText("Post-apocalyptic action game")).toBeInTheDocument()
    expect(screen.getByText("PlayStation 4")).toBeInTheDocument()
    expect(screen.getByText("Naughty Dog")).toBeInTheDocument()
  })

  it("pide el juego con su id y un AbortSignal", async () => {
    vi.spyOn(gameService, "getGameById").mockResolvedValue(mockGame)

    renderComponent()

    await screen.findByText("The Last of Us")

    expect(gameService.getGameById).toHaveBeenCalledWith("1", expect.any(AbortSignal))
  })

  it("renderiza la imagen del juego", async () => {
    vi.spyOn(gameService, "getGameById").mockResolvedValue(mockGame)

    renderComponent()

    const image = await screen.findByRole("img")

    expect(image).toHaveAttribute("src", "image.jpg")
  })

  it("monta los vídeos solo cuando el usuario los solicita", async () => {
    vi.spyOn(gameService, "getGameById").mockResolvedValue(mockGame)

    renderComponent()

    expect(await screen.findByText("Trailer")).toBeInTheDocument()
    expect(screen.getByText("Walkthrough")).toBeInTheDocument()

    /* Los reproductores de terceros no se descargan hasta que se piden */
    expect(document.querySelectorAll(".video-container iframe")).toHaveLength(0)

    fireEvent.click(screen.getByRole("button", { name: /Play Trailer/ }))

    expect(document.querySelectorAll(".video-container iframe")).toHaveLength(1)
    expect(screen.getByTitle("The Last of Us - Trailer")).toBeInTheDocument()
  })

  it("renderiza spotify embed correctamente", async () => {
    vi.spyOn(gameService, "getGameById").mockResolvedValue(mockGame)

    renderComponent()

    await screen.findByText("Original Soundtrack")

    const iframe = document.querySelector(".spotify-container iframe")

    expect(iframe).toHaveAttribute("src", "https://open.spotify.com/embed/album/test")
  })

  it("muestra mensaje si el juego no existe", async () => {
    vi.spyOn(gameService, "getGameById").mockResolvedValue(null as unknown as GameDetailModel)

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText("Game not found")).toBeInTheDocument()
    })
  })

  it("muestra un error si falla la petición", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

    vi.spyOn(gameService, "getGameById").mockRejectedValue(new Error("boom"))

    renderComponent()

    expect(
      await screen.findByText("No se pudo cargar el juego. Inténtalo de nuevo.")
    ).toBeInTheDocument()

    consoleError.mockRestore()
  })

  it("muestra botón back", async () => {
    vi.spyOn(gameService, "getGameById").mockResolvedValue(mockGame)

    renderComponent()

    const button = await screen.findByText("⬅ Back")

    expect(button).toBeInTheDocument()
  })
})
