import type { AxiosResponse } from "axios"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  getGameById,
  getGames,
  getRandomGame,
  searchGames,
  type ApiResponse,
  type GameDetail,
  type RandomGame
} from "../../services/gameService"

import { http } from "../../services/http"

/* MOCK HTTP */
vi.mock("../../services/http", () => ({
  http: {
    get: vi.fn()
  }
}))

const emptyResponse: ApiResponse = {
  data: [],
  pagination: {
    currentPage: 1,
    perPage: 5,
    totalRecords: 0,
    totalPages: 0
  }
}

describe("gameService", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("getGames debe llamar a /games con params correctos", async () => {
    const mockResponse = {
      data: {
        data: [{ id: 1, title: "The Last of Us", platform: "PS4" }],
        pagination: {
          currentPage: 1,
          perPage: 5,
          totalRecords: 1,
          totalPages: 1
        }
      }
    }

    vi.mocked(http.get).mockResolvedValue(mockResponse as unknown as AxiosResponse<ApiResponse>)

    const result = await getGames("PS4", 1, 5)

    expect(http.get).toHaveBeenCalledWith("/games", {
      params: {
        platform: "PS4",
        page: 1,
        limit: 5
      },
      signal: undefined
    })

    expect(result).toEqual(mockResponse.data)
  })

  it("searchGames debe llamar a /games/search", async () => {
    const mockResponse = {
      data: {
        data: [{ id: 2, title: "Uncharted 4", platform: "PS4" }],
        pagination: {
          currentPage: 1,
          perPage: 5,
          totalRecords: 1,
          totalPages: 1
        }
      }
    }

    vi.mocked(http.get).mockResolvedValue(mockResponse as unknown as AxiosResponse<ApiResponse>)

    const result = await searchGames("Uncharted", 1, 5)

    expect(http.get).toHaveBeenCalledWith("/games/search", {
      params: {
        title: "Uncharted",
        page: 1,
        limit: 5
      },
      signal: undefined
    })

    expect(result).toEqual(mockResponse.data)
  })

  it("getGameById debe llamar a /games/:id", async () => {
    const mockResponse = {
      data: {
        id: 1,
        title: "The Last of Us",
        description: "Post apocalyptic game"
      }
    }

    vi.mocked(http.get).mockResolvedValue(mockResponse as unknown as AxiosResponse<GameDetail>)

    const result = await getGameById(1)

    expect(http.get).toHaveBeenCalledWith("/games/1", { signal: undefined })

    expect(result).toEqual(mockResponse.data)
  })

  it("getRandomGame debe llamar a /games/random", async () => {
    const randomGame: RandomGame = {
      id: 1,
      title: "Elden Ring",
      platform: "PlayStation 5",
      youtubeTrailer: "https://www.youtube.com/embed/elden-ring"
    }

    vi.mocked(http.get).mockResolvedValue({
      data: randomGame
    } as unknown as AxiosResponse<RandomGame>)

    const result = await getRandomGame()

    expect(http.get).toHaveBeenCalledWith("/games/random", {
      signal: undefined,
      timeout: 15000
    })

    expect(result).toEqual(randomGame)
  })

  it("reenvía el AbortSignal a la petición para poder cancelarla", async () => {
    vi.mocked(http.get).mockResolvedValue({
      data: emptyResponse
    } as unknown as AxiosResponse<ApiResponse>)

    const controller = new AbortController()

    await getGames("PS4", 1, 5, controller.signal)

    expect(http.get).toHaveBeenCalledWith("/games", {
      params: {
        platform: "PS4",
        page: 1,
        limit: 5
      },
      signal: controller.signal
    })
  })
})
