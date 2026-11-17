import type { AxiosResponse } from "axios"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  getReviewsByGame,
  REVIEWS_PAGE_SIZE,
  type ReviewsResponse
} from "../../services/reviewService"
import { http } from "../../services/http"

/* Se conserva el módulo real para usar isNotFoundError y solo se mockea http */
vi.mock("../../services/http", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/http")>()

  return { ...actual, http: { get: vi.fn() } }
})

const paginated: ReviewsResponse = {
  data: [
    {
      id: 1,
      name: "Ana",
      date: "2024-01-01",
      review: "Muy bueno",
      score: "9",
      source: "Metacritic",
      id_game: 2
    }
  ],
  pagination: { currentPage: 1, perPage: 10, totalRecords: 1, totalPages: 1 }
}

describe("reviewService", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("getReviewsByGame llama a /reviews/:id con página y límite", async () => {
    vi.mocked(http.get).mockResolvedValue({
      data: paginated
    } as unknown as AxiosResponse<ReviewsResponse>)

    const result = await getReviewsByGame(2, 1, REVIEWS_PAGE_SIZE)

    expect(http.get).toHaveBeenCalledWith("/reviews/2", {
      params: { page: 1, limit: 10 },
      signal: undefined
    })

    expect(result).toEqual(paginated)
  })

  it("reenvía el AbortSignal a la petición para poder cancelarla", async () => {
    vi.mocked(http.get).mockResolvedValue({
      data: paginated
    } as unknown as AxiosResponse<ReviewsResponse>)

    const controller = new AbortController()

    await getReviewsByGame(2, 2, 10, controller.signal)

    expect(http.get).toHaveBeenCalledWith("/reviews/2", {
      params: { page: 2, limit: 10 },
      signal: controller.signal
    })
  })

  it("traduce un 404 a una página vacía", async () => {
    vi.mocked(http.get).mockRejectedValue({ isAxiosError: true, response: { status: 404 } })

    const result = await getReviewsByGame(1, 1, 10)

    expect(result.data).toEqual([])
    expect(result.pagination).toEqual({
      currentPage: 1,
      perPage: 10,
      totalRecords: 0,
      totalPages: 0
    })
  })

  it("propaga los errores que no son 404", async () => {
    vi.mocked(http.get).mockRejectedValue(new Error("boom"))

    await expect(getReviewsByGame(1, 1, 10)).rejects.toThrow("boom")
  })
})
