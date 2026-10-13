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

describe("platformService", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("getPlatforms debe llamar a /platforms", async () => {
    const mockResponse = {
      data: [
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
    }

    vi.mocked(http.get).mockResolvedValue(mockResponse as unknown as AxiosResponse<Platform[]>)

    const result = await getPlatforms()

    expect(http.get).toHaveBeenCalledWith("/platforms", { signal: undefined })

    expect(result).toEqual(mockResponse.data)
  })

  it("reenvía el AbortSignal a la petición para poder cancelarla", async () => {
    vi.mocked(http.get).mockResolvedValue({ data: [] } as unknown as AxiosResponse<Platform[]>)

    const controller = new AbortController()

    await getPlatforms(controller.signal)

    expect(http.get).toHaveBeenCalledWith("/platforms", {
      signal: controller.signal
    })
  })
})
