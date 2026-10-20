import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { Link, MemoryRouter, Route, Routes } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

import GameDetail from "../GameDetail"

import * as gameService from "../../services/gameService"
import type { GameDetail as GameDetailModel } from "../../services/gameService"
import * as reviewService from "../../services/reviewService"
import type { ReviewsResponse } from "../../services/reviewService"

vi.mock("../../services/gameService")

/* Se declara el mock con factory para conservar REVIEWS_PAGE_SIZE real */
vi.mock("../../services/reviewService", () => ({
  getReviewsByGame: vi.fn(),
  REVIEWS_PAGE_SIZE: 10
}))

const emptyReviews: ReviewsResponse = {
  data: [],
  pagination: { currentPage: 1, perPage: 10, totalRecords: 0, totalPages: 0 }
}

const sampleReviews: ReviewsResponse = {
  data: [
    {
      id: 1,
      name: "Ana",
      date: "2024-01-01",
      review: "Una obra maestra",
      score: "10",
      source: "IGN",
      id_game: 1
    },
    {
      id: 2,
      name: "Luis",
      date: "2024-02-02",
      review: "Muy entretenido",
      score: "8",
      source: "Metacritic",
      id_game: 1
    }
  ],
  pagination: { currentPage: 1, perPage: 10, totalRecords: 2, totalPages: 1 }
}

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
    /* Por defecto el juego no tiene reseñas; cada test decide su caso */
    vi.mocked(reviewService.getReviewsByGame).mockResolvedValue(emptyReviews)
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

    const button = await screen.findByRole("button", { name: /Back/ })

    expect(button).toBeInTheDocument()
  })

  it("muestra las reseñas del juego", async () => {
    vi.spyOn(gameService, "getGameById").mockResolvedValue(mockGame)
    vi.mocked(reviewService.getReviewsByGame).mockResolvedValue(sampleReviews)

    renderComponent()

    expect(await screen.findByText("Una obra maestra")).toBeInTheDocument()
    expect(screen.getByText("Muy entretenido")).toBeInTheDocument()
    expect(screen.getByText("IGN")).toBeInTheDocument()
    expect(screen.getByText("Metacritic")).toBeInTheDocument()
    expect(screen.getByText("Ana")).toBeInTheDocument()
  })

  it("pide las reseñas paginadas de 10 en 10", async () => {
    vi.spyOn(gameService, "getGameById").mockResolvedValue(mockGame)
    vi.mocked(reviewService.getReviewsByGame).mockResolvedValue(sampleReviews)

    renderComponent()

    await screen.findByText("Una obra maestra")

    expect(reviewService.getReviewsByGame).toHaveBeenCalledWith("1", 1, 10, expect.any(AbortSignal))
  })

  it("muestra un mensaje cuando el juego no tiene reseñas", async () => {
    vi.spyOn(gameService, "getGameById").mockResolvedValue(mockGame)

    renderComponent()

    expect(await screen.findByText("No reviews yet")).toBeInTheDocument()
  })

  it("permite avanzar a la página siguiente de reseñas", async () => {
    vi.spyOn(gameService, "getGameById").mockResolvedValue(mockGame)
    vi.mocked(reviewService.getReviewsByGame).mockResolvedValue({
      data: sampleReviews.data,
      pagination: { currentPage: 1, perPage: 10, totalRecords: 25, totalPages: 3 }
    })

    renderComponent()

    await screen.findByText("Una obra maestra")

    expect(document.querySelector(".page-info")).toHaveTextContent("Page 1 of 3")

    fireEvent.click(screen.getByRole("button", { name: /Next/ }))

    await waitFor(() => {
      expect(reviewService.getReviewsByGame).toHaveBeenCalledWith(
        "1",
        2,
        10,
        expect.any(AbortSignal)
      )
    })
  })

  it("muestra un error si fallan las reseñas", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

    vi.spyOn(gameService, "getGameById").mockResolvedValue(mockGame)
    vi.mocked(reviewService.getReviewsByGame).mockRejectedValue(new Error("boom"))

    renderComponent()

    expect(await screen.findByText("No se pudieron cargar las reseñas.")).toBeInTheDocument()

    consoleError.mockRestore()
  })

  it("vuelve a la página anterior de reseñas", async () => {
    vi.spyOn(gameService, "getGameById").mockResolvedValue(mockGame)
    vi.mocked(reviewService.getReviewsByGame).mockResolvedValue({
      data: sampleReviews.data,
      pagination: { currentPage: 1, perPage: 10, totalRecords: 25, totalPages: 3 }
    })

    renderComponent()

    await screen.findByText("Una obra maestra")

    fireEvent.click(screen.getByRole("button", { name: /Next/ }))

    await waitFor(() => {
      expect(reviewService.getReviewsByGame).toHaveBeenCalledWith(
        "1",
        2,
        10,
        expect.any(AbortSignal)
      )
    })

    fireEvent.click(screen.getByRole("button", { name: /Prev/ }))

    await waitFor(() => {
      expect(reviewService.getReviewsByGame).toHaveBeenLastCalledWith(
        "1",
        1,
        10,
        expect.any(AbortSignal)
      )
    })
  })

  it("reinicia la página de reseñas al cambiar de juego", async () => {
    vi.spyOn(gameService, "getGameById").mockResolvedValue(mockGame)
    vi.mocked(reviewService.getReviewsByGame).mockResolvedValue({
      data: sampleReviews.data,
      pagination: { currentPage: 1, perPage: 10, totalRecords: 25, totalPages: 3 }
    })

    render(
      <MemoryRouter initialEntries={["/game/1"]}>
        <Routes>
          <Route
            path="/game/:id"
            element={
              <>
                <GameDetail />
                <Link to="/game/2">Otro juego</Link>
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    )

    await screen.findByText("Una obra maestra")

    fireEvent.click(screen.getByText("Otro juego"))

    await waitFor(() => {
      expect(gameService.getGameById).toHaveBeenLastCalledWith("2", expect.any(AbortSignal))
    })
  })

  it("no muestra portada ni banda sonora si el juego no las trae", async () => {
    vi.spyOn(gameService, "getGameById").mockResolvedValue({
      id: 1,
      title: "Juego mínimo",
      description: "Sin portada ni ost"
    })

    renderComponent()

    await screen.findByText("Juego mínimo")

    expect(screen.queryByRole("img")).toBeNull()
    expect(document.querySelector(".spotify-container")).toBeNull()
  })

  it("tolera reseñas sin autor, fecha ni nota", async () => {
    vi.spyOn(gameService, "getGameById").mockResolvedValue(mockGame)
    vi.mocked(reviewService.getReviewsByGame).mockResolvedValue({
      data: [{ id: 9, review: "Solo texto", source: "Anónimo", id_game: 1 }],
      pagination: { currentPage: 1, perPage: 10, totalRecords: 1, totalPages: 1 }
    })

    renderComponent()

    expect(await screen.findByText("Solo texto")).toBeInTheDocument()
    expect(document.querySelector(".review-author")).toBeNull()
    expect(document.querySelector(".review-date")).toBeNull()
    expect(document.querySelector(".review-score")).toBeNull()
  })

  it("no muestra error si la carga del juego se cancela", async () => {
    const canceled = Object.assign(new Error("canceled"), { name: "CanceledError" })

    vi.spyOn(gameService, "getGameById").mockRejectedValue(canceled)

    renderComponent()

    await waitFor(() => {
      expect(gameService.getGameById).toHaveBeenCalled()
    })

    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("no muestra error si la carga de reseñas se cancela", async () => {
    const canceled = Object.assign(new Error("canceled"), { name: "CanceledError" })

    vi.spyOn(gameService, "getGameById").mockResolvedValue(mockGame)
    vi.mocked(reviewService.getReviewsByGame).mockRejectedValue(canceled)

    renderComponent()

    await screen.findByText("The Last of Us")

    await waitFor(() => {
      expect(reviewService.getReviewsByGame).toHaveBeenCalled()
    })

    expect(screen.queryByText("No se pudieron cargar las reseñas.")).toBeNull()
  })

  it("muestra un aviso si la ruta no trae id", () => {
    render(
      <MemoryRouter>
        <GameDetail />
      </MemoryRouter>
    )

    expect(screen.getByText("Juego no encontrado.")).toBeInTheDocument()
  })

  it("deja tal cual la URL de banda sonora que no es de Spotify", async () => {
    vi.spyOn(gameService, "getGameById").mockResolvedValue({
      ...mockGame,
      spotify_ost: "https://example.com/ost"
    })

    renderComponent()

    await screen.findByText("Original Soundtrack")

    expect(document.querySelector(".spotify-container iframe")).toHaveAttribute(
      "src",
      "https://example.com/ost"
    )
  })

  it("tolera una respuesta de reseñas sin datos ni paginación", async () => {
    vi.spyOn(gameService, "getGameById").mockResolvedValue(mockGame)
    vi.mocked(reviewService.getReviewsByGame).mockResolvedValue({} as never)

    renderComponent()

    expect(await screen.findByText("No reviews yet")).toBeInTheDocument()
  })
})
