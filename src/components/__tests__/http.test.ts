import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { environment } from "../../config/environment"

/* El cliente http importa el módulo de autenticación: se mockea para no hacer
   logins reales ni depender de `localStorage` en estas pruebas. */
const authMocks = vi.hoisted(() => ({
  ensureToken: vi.fn(),
  refreshToken: vi.fn()
}))

vi.mock("../../services/auth", () => ({
  ensureToken: authMocks.ensureToken,
  refreshToken: authMocks.refreshToken,
  LOGIN_PATH: "/auth/login"
}))

import { http } from "../../services/http"

const originalAdapter = http.defaults.adapter

function okResponse(config: InternalAxiosRequestConfig, data: unknown = { ok: true }) {
  return {
    data,
    status: 200,
    statusText: "OK",
    headers: {},
    config
  } as AxiosResponse
}

function unauthorizedError(config: InternalAxiosRequestConfig): AxiosError {
  return new AxiosError("Unauthorized", "ERR_BAD_REQUEST", config, undefined, {
    data: { error: "No autorizado" },
    status: 401,
    statusText: "Unauthorized",
    headers: {},
    config
  } as AxiosResponse)
}

describe("http client", () => {
  let captured: InternalAxiosRequestConfig[] = []

  beforeEach(() => {
    vi.clearAllMocks()
    captured = []
    authMocks.ensureToken.mockResolvedValue("jwt-1")
    authMocks.refreshToken.mockResolvedValue("jwt-2")
  })

  afterEach(() => {
    http.defaults.adapter = originalAdapter
  })

  it("debe crear una instancia de axios", () => {
    expect(http).toBeDefined()
  })

  it("debe tener el baseURL configurado desde environment", () => {
    expect(http.defaults.baseURL).toBe(environment.apiUrl)
  })

  it("debe tener header Content-Type application/json", () => {
    expect(http.defaults.headers["Content-Type"]).toBe("application/json")
  })

  it("añade el Bearer del catálogo a las peticiones de negocio", async () => {
    http.defaults.adapter = async (config) => {
      captured.push(config)
      return okResponse(config)
    }

    await http.get("/games")

    expect(authMocks.ensureToken).toHaveBeenCalledTimes(1)
    expect(captured[0].headers.get("Authorization")).toBe("Bearer jwt-1")
  })

  it("no añade el Bearer a la petición de login", async () => {
    http.defaults.adapter = async (config) => {
      captured.push(config)
      return okResponse(config, { token: "jwt-login" })
    }

    await http.post("/auth/login", { username: "admin", password: "secret" })

    expect(authMocks.ensureToken).not.toHaveBeenCalled()
    expect(captured[0].headers.has("Authorization")).toBe(false)
  })

  it("renueva el token una vez y reintenta la petición tras un 401", async () => {
    let attempts = 0

    http.defaults.adapter = async (config) => {
      captured.push(config)
      attempts += 1

      if (attempts === 1) {
        throw unauthorizedError(config)
      }

      return okResponse(config)
    }

    const response = await http.get("/games")

    expect(response.status).toBe(200)
    expect(authMocks.refreshToken).toHaveBeenCalledTimes(1)
    expect(captured).toHaveLength(2)
    expect(captured[1].headers.get("Authorization")).toBe("Bearer jwt-2")
  })

  it("no reintenta ni refresca el token con errores distintos de 401", async () => {
    http.defaults.adapter = async (config) => {
      throw new AxiosError("Server error", "ERR_BAD_RESPONSE", config, undefined, {
        data: { error: "Error interno del servidor" },
        status: 500,
        statusText: "Internal Server Error",
        headers: {},
        config
      } as AxiosResponse)
    }

    await expect(http.get("/games")).rejects.toBeInstanceOf(AxiosError)
    expect(authMocks.refreshToken).not.toHaveBeenCalled()
  })
})
