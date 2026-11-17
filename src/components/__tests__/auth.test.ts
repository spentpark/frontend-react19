import { beforeEach, describe, expect, it, vi } from "vitest"

/* Se mockean axios (cliente de login) y el entorno para que las pruebas no
   dependan de la red ni de las variables de `.env`. */
const { postMock } = vi.hoisted(() => ({ postMock: vi.fn() }))

vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => ({ post: postMock })),
    isAxiosError: vi.fn(() => false)
  }
}))

vi.mock("../../config/environment", () => ({
  environment: {
    apiUrl: "http://localhost:7000/api",
    apiUsername: "admin",
    apiPassword: "secret"
  }
}))

import {
  AUTH_TOKEN_STORAGE_KEY,
  DEFAULT_TOKEN_TTL_MS,
  LOGIN_PATH,
  ensureToken,
  refreshToken,
  resetAuthState
} from "../../services/auth"

const FUTURE_EXPIRY = new Date(Date.now() + 60 * 60 * 1000).toISOString()

function tokenResponse(token = "jwt-1", expiresAt: string | undefined = FUTURE_EXPIRY) {
  return { data: { token, tokenType: "Bearer", expiresAt } }
}

function storedToken(): { token?: string; expiresAt?: number } {
  const raw = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
  return raw ? (JSON.parse(raw) as { token?: string; expiresAt?: number }) : {}
}

describe("authService", () => {
  beforeEach(() => {
    localStorage.clear()
    resetAuthState()
    postMock.mockReset()
  })

  it("hace login con las credenciales configuradas y cachea el token", async () => {
    postMock.mockResolvedValue(tokenResponse("jwt-1"))

    await expect(ensureToken()).resolves.toBe("jwt-1")

    expect(postMock).toHaveBeenCalledWith(LOGIN_PATH, {
      username: "admin",
      password: "secret"
    })
    expect(storedToken().token).toBe("jwt-1")
    expect(storedToken().expiresAt).toBeGreaterThan(Date.now())
  })

  it("reutiliza el token hasta que caduca sin volver a hacer login", async () => {
    postMock.mockResolvedValue(tokenResponse("jwt-1"))

    await ensureToken()
    await ensureToken()

    expect(postMock).toHaveBeenCalledTimes(1)
  })

  it("restaura un token cacheado de localStorage", async () => {
    localStorage.setItem(
      AUTH_TOKEN_STORAGE_KEY,
      JSON.stringify({ token: "cached-token", expiresAt: Date.now() + 60 * 60 * 1000 })
    )

    await expect(ensureToken()).resolves.toBe("cached-token")
    expect(postMock).not.toHaveBeenCalled()
  })

  it("pide un token nuevo si el cacheado ya caducó", async () => {
    localStorage.setItem(
      AUTH_TOKEN_STORAGE_KEY,
      JSON.stringify({ token: "expired-token", expiresAt: Date.now() - 1000 })
    )
    postMock.mockResolvedValue(tokenResponse("jwt-2"))

    await expect(ensureToken()).resolves.toBe("jwt-2")
    expect(postMock).toHaveBeenCalledTimes(1)
  })

  it("pide un token nuevo si el cacheado está dentro del margen de caducidad", async () => {
    localStorage.setItem(
      AUTH_TOKEN_STORAGE_KEY,
      JSON.stringify({ token: "almost-expired", expiresAt: Date.now() + 30_000 })
    )
    postMock.mockResolvedValue(tokenResponse("jwt-2"))

    await expect(ensureToken()).resolves.toBe("jwt-2")
  })

  it("deduplica logins concurrentes en una sola petición", async () => {
    postMock.mockResolvedValue(tokenResponse("jwt-1"))

    const [first, second] = await Promise.all([ensureToken(), ensureToken()])

    expect(first).toBe("jwt-1")
    expect(second).toBe("jwt-1")
    expect(postMock).toHaveBeenCalledTimes(1)
  })

  it("rechaza si el login no devuelve token", async () => {
    postMock.mockResolvedValue({ data: { tokenType: "Bearer" } })

    await expect(ensureToken()).rejects.toThrow("no devolvió un token")
  })

  it("refreshToken descarta el token actual y pide uno nuevo", async () => {
    postMock.mockResolvedValueOnce(tokenResponse("jwt-1"))
    await ensureToken()

    postMock.mockResolvedValueOnce(tokenResponse("jwt-2"))
    await expect(refreshToken()).resolves.toBe("jwt-2")

    expect(postMock).toHaveBeenCalledTimes(2)
    expect(storedToken().token).toBe("jwt-2")
  })

  it("usa la vida por defecto si el login no devuelve expiresAt", async () => {
    postMock.mockResolvedValue({ data: { token: "jwt-1", expiresAt: "no-es-fecha" } })

    await ensureToken()

    expect(storedToken().expiresAt).toBeGreaterThan(Date.now() + DEFAULT_TOKEN_TTL_MS - 60_000)
  })

  it("ignora un token cacheado con forma inválida", async () => {
    localStorage.setItem(
      AUTH_TOKEN_STORAGE_KEY,
      JSON.stringify({ token: 42, expiresAt: "no-es-numero" })
    )
    postMock.mockResolvedValue(tokenResponse("jwt-1"))

    await expect(ensureToken()).resolves.toBe("jwt-1")
    expect(postMock).toHaveBeenCalledTimes(1)
  })
})
