import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import App from "../../App"

import * as gameService from "../../services/gameService"
import * as platformService from "../../services/platformService"

/* ================= MOCKS ================= */

vi.mock("../../services/gameService")
vi.mock("../../services/platformService")

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
    vi.clearAllMocks()

    vi.spyOn(platformService, "getPlatforms").mockResolvedValue(mockPlatforms)

    vi.spyOn(gameService, "getGames").mockResolvedValue(mockGamesResponse)

    vi.spyOn(gameService, "searchGames").mockResolvedValue(mockGamesResponse)
  })

  /* ================= HEADER + FOOTER ================= */

  it("renderiza el header y footer", async () => {

    render(<App />)

    expect(await screen.findByText(/Game List/)).toBeInTheDocument()

    expect(
      screen.getByText(/All rights reserved/)
    ).toBeInTheDocument()

  })

  /* ================= LOAD GAMES ================= */

  it("carga juegos desde el backend", async () => {

    render(<App />)

    expect(await screen.findByText("The Last of Us")).toBeInTheDocument()

    expect(screen.getByText("Uncharted 4")).toBeInTheDocument()

  })

  /* ================= LOADING ================= */

  it("muestra loading al cargar juegos", async () => {

    vi.spyOn(gameService, "getGames").mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve(mockGamesResponse), 100)
        )
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
      expect(gameService.getGames).toHaveBeenCalled()
    })

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

})