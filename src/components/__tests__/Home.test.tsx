import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import Home from "../../pages/Home"
import type { RandomGame } from "../../services/gameService"
import * as gameService from "../../services/gameService"

vi.mock("../../services/gameService")

const mockGame: RandomGame = {
  id: 42,
  title: "Elden Ring",
  platform: "PlayStation 5",
  publisher: "FromSoftware",
  releasedate: "2022-02-25",
  players: "1",
  genre: "RPG",
  imageOriginal: "https://img.test/elden-ring.jpg",
  youtubeTrailer: "https://www.youtube.com/embed/elden-ring"
}

const renderHome = () =>
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  )

describe("Home (juego al azar)", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.spyOn(gameService, "getRandomGame").mockResolvedValue(mockGame)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("muestra el loading inicial y luego el juego al azar", async () => {
    renderHome()

    expect(screen.getByText("Cargando datos…")).toBeInTheDocument()

    expect(await screen.findByText("Elden Ring")).toBeInTheDocument()

    expect(gameService.getRandomGame).toHaveBeenCalledWith(expect.any(AbortSignal))
  })

  it("muestra los campos del juego y el tráiler con autoplay", async () => {
    renderHome()

    await screen.findByText("Elden Ring")

    expect(screen.getByText("PlayStation 5")).toBeInTheDocument()
    expect(screen.getByText("FromSoftware")).toBeInTheDocument()
    expect(screen.getByText("2022-02-25")).toBeInTheDocument()
    expect(screen.getByText("RPG")).toBeInTheDocument()

    const playersField = screen.getByText("Jugadores").closest(".hero-field")
    expect(playersField).not.toBeNull()
    expect(within(playersField as HTMLElement).getByText("1")).toBeInTheDocument()

    expect(screen.getByTitle("Tráiler de Elden Ring")).toHaveAttribute(
      "src",
      "https://www.youtube.com/embed/elden-ring?autoplay=1"
    )

    /* La pantalla solo muestra el vídeo del tráiler, sin portada debajo */
    expect(screen.queryByRole("img")).toBeNull()
  })

  it("convierte una URL de YouTube de tipo watch en URL embebible", async () => {
    vi.spyOn(gameService, "getRandomGame").mockResolvedValue({
      ...mockGame,
      youtubeTrailer: "https://www.youtube.com/watch?v=abc123"
    })

    renderHome()

    expect(await screen.findByTitle("Tráiler de Elden Ring")).toHaveAttribute(
      "src",
      "https://www.youtube.com/embed/abc123?autoplay=1"
    )
  })

  it("convierte una URL corta de youtu.be en URL embebible", async () => {
    vi.spyOn(gameService, "getRandomGame").mockResolvedValue({
      ...mockGame,
      youtubeTrailer: "https://youtu.be/xyz789"
    })

    renderHome()

    expect(await screen.findByTitle("Tráiler de Elden Ring")).toHaveAttribute(
      "src",
      "https://www.youtube.com/embed/xyz789?autoplay=1"
    )
  })

  it("muestra el aviso de sin tráiler cuando no hay URL", async () => {
    vi.spyOn(gameService, "getRandomGame").mockResolvedValue({
      ...mockGame,
      youtubeTrailer: "",
      imageOriginal: null
    })

    renderHome()

    expect(await screen.findByText("Sin tráiler disponible")).toBeInTheDocument()
    expect(screen.queryByTitle("Tráiler de Elden Ring")).toBeNull()
    expect(screen.queryByRole("img")).toBeNull()
  })

  it("usa un guion cuando faltan campos del juego", async () => {
    vi.spyOn(gameService, "getRandomGame").mockResolvedValue({
      id: 7,
      title: "Juego mínimo",
      youtubeTrailer: "https://www.youtube.com/embed/minimo"
    })

    renderHome()

    await screen.findByText("Juego mínimo")

    expect(screen.getAllByText("—")).toHaveLength(5)
  })

  it("ofrece un enlace al detalle del juego", async () => {
    renderHome()

    await screen.findByText("Elden Ring")

    expect(screen.getByRole("link", { name: "Ver juego" })).toHaveAttribute("href", "/game/42")
  })

  it("carga otro juego al pulsar el botón", async () => {
    renderHome()

    await screen.findByText("Elden Ring")

    fireEvent.click(screen.getByRole("button", { name: /Otro juego/ }))

    await waitFor(() => {
      expect(gameService.getRandomGame).toHaveBeenCalledTimes(2)
    })
  })

  it("se refresca solo pasado el intervalo configurado", async () => {
    vi.useFakeTimers()

    const { unmount } = renderHome()

    /* Flush de la petición inicial (promesa resuelta) y de sus efectos */
    await act(async () => {})
    await act(async () => {})

    expect(gameService.getRandomGame).toHaveBeenCalledTimes(1)

    await act(async () => {
      vi.advanceTimersByTime(200000)
    })
    await act(async () => {})

    expect(gameService.getRandomGame).toHaveBeenCalledTimes(2)

    unmount()
  })

  it("muestra un error y permite reintentar", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

    vi.spyOn(gameService, "getRandomGame").mockRejectedValueOnce(new Error("boom"))

    renderHome()

    expect(
      await screen.findByText("No se pudo cargar el juego al azar. Inténtalo de nuevo.")
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }))

    expect(await screen.findByText("Elden Ring")).toBeInTheDocument()

    consoleError.mockRestore()
  })

  it("no muestra error si la petición se cancela", async () => {
    const canceled = Object.assign(new Error("canceled"), { name: "CanceledError" })

    vi.spyOn(gameService, "getRandomGame").mockRejectedValue(canceled)

    renderHome()

    await waitFor(() => {
      expect(gameService.getRandomGame).toHaveBeenCalled()
    })

    expect(screen.queryByRole("alert")).toBeNull()
  })
})
