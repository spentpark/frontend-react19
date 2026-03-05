import { describe, it, expect, vi, beforeEach } from "vitest"

import { getPlatforms } from "../../services/platformService"
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

    ;(http.get as any).mockResolvedValue(mockResponse)

    const result = await getPlatforms()

    expect(http.get).toHaveBeenCalledWith("/platforms")

    expect(result).toEqual(mockResponse.data)

  })

})