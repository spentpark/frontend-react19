import { describe, it, expect, vi, beforeEach } from "vitest"

import {
  getGames,
  searchGames,
  getGameById
} from "../../services/gameService"

import { http } from "../../services/http"

/* MOCK HTTP */
vi.mock("../../services/http", () => ({
  http: {
    get: vi.fn()
  }
}))

describe("gameService", () => {

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("getGames debe llamar a /games con params correctos", async () => {

    const mockResponse = {
      data: {
        data: [
          { id: 1, title: "The Last of Us", platform: "PS4" }
        ],
        pagination: {
          currentPage: 1,
          perPage: 5,
          totalRecords: 1,
          totalPages: 1
        }
      }
    }

    vi.mocked(http.get).mockResolvedValue(mockResponse as any)

    const result = await getGames("PS4", 1, 5)

    expect(http.get).toHaveBeenCalledWith("/games", {
      params: {
        platform: "PS4",
        page: 1,
        limit: 5
      }
    })

    expect(result).toEqual(mockResponse.data)

  })

  it("searchGames debe llamar a /games/search", async () => {

    const mockResponse = {
      data: {
        data: [
          { id: 2, title: "Uncharted 4", platform: "PS4" }
        ],
        pagination: {
          currentPage: 1,
          perPage: 5,
          totalRecords: 1,
          totalPages: 1
        }
      }
    }

    vi.mocked(http.get).mockResolvedValue(mockResponse as any)

    const result = await searchGames("Uncharted", 1, 5)

    expect(http.get).toHaveBeenCalledWith("/games/search", {
      params: {
        title: "Uncharted",
        page: 1,
        limit: 5
      }
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

    vi.mocked(http.get).mockResolvedValue(mockResponse as any)

    const result = await getGameById(1)

    expect(http.get).toHaveBeenCalledWith("/games/1")

    expect(result).toEqual(mockResponse.data)

  })

})