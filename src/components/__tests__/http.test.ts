import { describe, it, expect } from "vitest"
import { http } from "../../services/http"
import { environment } from "../../config/environment"

describe("http client", () => {

  it("debe crear una instancia de axios", () => {
    expect(http).toBeDefined()
  })

  it("debe tener el baseURL configurado desde environment", () => {
    expect(http.defaults.baseURL).toBe(environment.apiUrl)
  })

  it("debe tener header Content-Type application/json", () => {
    expect(http.defaults.headers["Content-Type"]).toBe("application/json")
  })

})