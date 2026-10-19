import type { AxiosResponse } from "axios"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { getPlatforms, type Platform } from "../../services/platformService"
import { http } from "../../services/http"

/* MOCK HTTP */
vi.mock("../../services/http", () => ({
  http: {
    get: vi.fn()
  }
}))

const platforms: Platform[] = [
  {
    id: 1,
    description: "PlayStation 4",
    url: "ps4"
  },
  {
    id: 2,
    description: "Xbox One",
    url: "xbox-one"
  }
]

describe("platformService", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("getPlatforms debe llamar a /platforms y desempaquetar la paginación", async () => {
    const mockResponse = {
      data: {
        data: platforms,
        pagination: {
          currentPage: 1,
          perPage: 200,
          totalRecords: 2,
          totalPages: 1
        }
      }
    }

    vi.mocked(http.get).mockResolvedValue(mockResponse as unknown as AxiosResponse<Platform[]>)

    const result = await getPlatforms()

    expect(http.get).toHaveBeenCalledWith("/platforms", {
      params: { limit: 200 },
      signal: undefined
    })

    expect(result).toEqual(platforms)
  })

  it("getPlatforms acepta también una respuesta en forma de array plano", async () => {
    vi.mocked(http.get).mockResolvedValue({ data: platforms } as unknown as AxiosResponse<
      Platform[]
    >)

    const result = await getPlatforms()

    expect(result).toEqual(platforms)
  })

  it("reenvía el AbortSignal a la petición para poder cancelarla", async () => {
    vi.mocked(http.get).mockResolvedValue({ data: { data: [] } } as unknown as AxiosResponse<
      Platform[]
    >)

    const controller = new AbortController()

    await getPlatforms(controller.signal)

    expect(http.get).toHaveBeenCalledWith("/platforms", {
      params: { limit: 200 },
      signal: controller.signal
    })
  })

  it("devuelve una lista vacía si la respuesta no trae datos", async () => {
    vi.mocked(http.get).mockResolvedValue({ data: {} } as unknown as AxiosResponse<Platform[]>)

    const result = await getPlatforms()

    expect(result).toEqual([])
  })
})
