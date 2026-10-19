import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import App from "../../App"

import * as gameService from "../../services/gameService"
import * as platformService from "../../services/platformService"
import * as reviewService from "../../services/reviewService"

/* ================= MOCKS ================= */

vi.mock("../../services/gameService")
vi.mock("../../services/platformService")

/* El detalle se carga de forma perezosa: se mockea para no salir a la red */
vi.mock("../../services/reviewService", () => ({
  getReviewsByGame: vi.fn(),
  REVIEWS_PAGE_SIZE: 10
}))

const mockGamesResponse = {
  data: [
    { id: 1, title: "The Last of Us", platform: "PS4" },
    { id: 2, title: "Uncharted 4", platform: "PS4" }
  ],
  pagination: {
    totalPages: 2,
    currentPage: 1,
    perPage: 5,
    totalRecords: 2
  }
}

const mockPlatforms = [
  { id: 1, description: "PS4", url: "" },
  { id: 2, description: "Xbox", url: "" }
]

describe("App / Home", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/")

    vi.clearAllMocks()

    vi.spyOn(platformService, "getPlatforms").mockResolvedValue(mockPlatforms)

    vi.spyOn(gameService, "getGames").mockResolvedValue(mockGamesResponse)

    vi.spyOn(gameService, "searchGames").mockResolvedValue(mockGamesResponse)

    vi.mocked(reviewService.getReviewsByGame).mockResolvedValue({
      data: [],
      pagination: { currentPage: 1, perPage: 10, totalRecords: 0, totalPages: 0 }
    })
  })

  /* ================= HEADER + FOOTER ================= */

  it("renderiza el header y footer", async () => {
    render(<App />)

    expect(await screen.findByText(/Game List/)).toBeInTheDocument()

    expect(screen.getByText(/All rights reserved/)).toBeInTheDocument()
  })

  /* ================= LOAD GAMES ================= */

  it("carga juegos desde el backend", async () => {
    render(<App />)

    expect(await screen.findByText("The Last of Us")).toBeInTheDocument()

    expect(screen.getByText("Uncharted 4")).toBeInTheDocument()

    expect(gameService.getGames).toHaveBeenCalledWith(
      "Sony Playstation 4",
      1,
      5,
      expect.any(AbortSignal)
    )
  })

  /* ================= PLATFORM FROM URL ================= */

  it("usa la plataforma indicada en la URL", async () => {
    window.history.pushState({}, "", "/?platform=Xbox%20One")

    render(<App />)

    expect(await screen.findByText(/Game List \(Xbox One\)/)).toBeInTheDocument()

    expect(gameService.getGames).toHaveBeenCalledWith("Xbox One", 1, 5, expect.any(AbortSignal))
  })

  /* ================= LOADING ================= */

  it("muestra loading al cargar juegos", async () => {
    vi.spyOn(gameService, "getGames").mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockGamesResponse), 100))
    )

    render(<App />)

    expect(screen.getByText("Loading games...")).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText("The Last of Us")).toBeInTheDocument()
    })
  })

  /* ================= SEARCH ================= */

  it("permite buscar juegos", async () => {
    render(<App />)

    const input = await screen.findByPlaceholderText("Search game...")

    fireEvent.change(input, {
      target: { value: "last" }
    })

    const button = screen.getByText("🔎 Search")

    fireEvent.click(button)

    await waitFor(() => {
      expect(gameService.searchGames).toHaveBeenCalled()
    })
  })

  it("no lanza una petición por cada pulsación (debounce)", async () => {
    render(<App />)

    await screen.findByText("The Last of Us")

    const input = screen.getByPlaceholderText("Search game...")

    fireEvent.change(input, { target: { value: "l" } })
    fireEvent.change(input, { target: { value: "la" } })
    fireEvent.change(input, { target: { value: "las" } })
    fireEvent.change(input, { target: { value: "last" } })

    /* Mientras el usuario escribe no debe haber peticiones de búsqueda */
    expect(gameService.searchGames).not.toHaveBeenCalled()

    /* Tras el debounce se lanza una única búsqueda con el último valor */
    await waitFor(
      () => {
        expect(gameService.searchGames).toHaveBeenCalledTimes(1)
      },
      { timeout: 2000 }
    )

    expect(gameService.searchGames).toHaveBeenCalledWith("last", 1, 5, expect.any(AbortSignal))
  })

  /* ================= CLEAR SEARCH ================= */

  it("limpia búsqueda al presionar clear", async () => {
    render(<App />)

    const input = await screen.findByPlaceholderText("Search game...")

    fireEvent.change(input, {
      target: { value: "test" }
    })

    const clearBtn = await screen.findByText("✖ Clear")

    fireEvent.click(clearBtn)

    expect((input as HTMLInputElement).value).toBe("")
  })

  /* ================= PAGINATION ================= */

  it("muestra paginación cuando hay más de una página", async () => {
    render(<App />)

    await screen.findByText("The Last of Us")

    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument()

    expect(screen.getByText("Next ➡")).toBeInTheDocument()
  })

  /* ================= NEXT PAGE ================= */

  it("cambia de página al presionar Next", async () => {
    render(<App />)

    const nextButton = await screen.findByText("Next ➡")

    fireEvent.click(nextButton)

    await waitFor(() => {
      expect(gameService.getGames).toHaveBeenCalledTimes(2)
    })

    expect(gameService.getGames).toHaveBeenLastCalledWith(
      "Sony Playstation 4",
      2,
      5,
      expect.any(AbortSignal)
    )
  })

  /* ================= EMPTY RESULT ================= */

  it("muestra mensaje cuando no hay juegos", async () => {
    vi.spyOn(gameService, "getGames").mockResolvedValue({
      data: [],
      pagination: {
        totalPages: 0,
        currentPage: 0,
        perPage: 0,
        totalRecords: 0
      }
    })

    render(<App />)

    expect(await screen.findByText("No games found")).toBeInTheDocument()
  })

  /* ================= ERROR ================= */

  it("muestra un mensaje de error si falla la carga", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

    vi.spyOn(gameService, "getGames").mockRejectedValue(new Error("boom"))

    render(<App />)

    expect(
      await screen.findByText("No se pudieron cargar los juegos. Inténtalo de nuevo.")
    ).toBeInTheDocument()

    consoleError.mockRestore()
  })

  /* ================= NAVEGACIÓN AL DETALLE ================= */

  it("navega al detalle al pulsar View", async () => {
    render(<App />)

    const [viewButton] = await screen.findAllByText("View")

    fireEvent.click(viewButton)

    await waitFor(() => {
      expect(screen.getByText("Game not found")).toBeInTheDocument()
    })

    expect(gameService.getGameById).toHaveBeenCalledWith("1", expect.any(AbortSignal))
  })

  /* ================= PÁGINA ANTERIOR ================= */

  it("vuelve a la página anterior", async () => {
    render(<App />)

    await screen.findByText("The Last of Us")

    fireEvent.click(screen.getByText("Next ➡"))

    await waitFor(() => {
      expect(screen.getByText("Page 2 of 2")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText("⬅ Prev"))

    await waitFor(() => {
      expect(gameService.getGames).toHaveBeenLastCalledWith(
        "Sony Playstation 4",
        1,
        5,
        expect.any(AbortSignal)
      )
    })
  })

  /* ================= PLATAFORMA DESDE EL MENÚ ================= */

  it("cambia de plataforma desde el menú lateral", async () => {
    render(<App />)

    await screen.findByText("The Last of Us")

    fireEvent.click(screen.getByText("☰"))

    fireEvent.click(await screen.findByRole("link", { name: "Xbox" }))

    await waitFor(() => {
      expect(gameService.getGames).toHaveBeenLastCalledWith("Xbox", 1, 5, expect.any(AbortSignal))
    })

    expect(await screen.findByText(/Game List \(Xbox\)/)).toBeInTheDocument()
  })

  /* ================= CANCELACIÓN ================= */

  it("no muestra error si la carga se cancela", async () => {
    const canceled = Object.assign(new Error("canceled"), { name: "CanceledError" })

    vi.spyOn(gameService, "getGames").mockRejectedValue(canceled)

    render(<App />)

    await waitFor(() => {
      expect(gameService.getGames).toHaveBeenCalled()
    })

    expect(screen.queryByText(/No se pudieron cargar los juegos/)).toBeNull()
  })

  /* ================= RESPUESTA INCOMPLETA ================= */

  it("tolera una respuesta sin datos ni paginación", async () => {
    vi.spyOn(gameService, "getGames").mockResolvedValue({} as never)

    render(<App />)

    expect(await screen.findByText("No games found")).toBeInTheDocument()
  })
})
