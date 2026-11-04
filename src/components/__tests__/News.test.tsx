import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

/* Se conserva el módulo real (constantes y normalizadores) y se mockea la
   llamada HTTP para no salir a la red */
vi.mock("../../services/newsService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/newsService")>()
  return { ...actual, fetchNewsPage: vi.fn() }
})

import News from "../../pages/News"
import * as newsService from "../../services/newsService"
import {
  NEWS_PAGE_SIZE,
  formatNewsDate,
  type GameNews,
  type GameNewsPage
} from "../../services/newsService"

/** Documentos con la forma real del backend `rss-game-node`. */
const buildNews = (count: number, offset = 0): GameNews[] =>
  Array.from({ length: count }, (_, index) => {
    const id = offset + index + 1
    return {
      _id: `id-${id}`,
      source: "VidaExtra",
      title: `Noticia ${id}`,
      url: `https://example.com/news/${id}`,
      guid: `https://example.com/news/${id}`,
      description:
        `<p>Descripción de la noticia ${id}</p>` + `<img src="https://example.com/news/${id}.jpg">`,
      published_at: "2026-01-15T10:30:00.000Z",
      fetched_at: "2026-01-15T11:00:00.000Z"
    }
  })

const buildPage = (page = 1, totalRecords = 356): GameNewsPage => {
  const start = (page - 1) * NEWS_PAGE_SIZE
  const count = Math.min(NEWS_PAGE_SIZE, Math.max(totalRecords - start, 0))

  return {
    data: buildNews(count, start),
    pagination: {
      currentPage: page,
      perPage: NEWS_PAGE_SIZE,
      totalRecords,
      totalPages: Math.ceil(totalRecords / NEWS_PAGE_SIZE)
    }
  }
}

const renderNews = () =>
  render(
    <MemoryRouter>
      <News />
    </MemoryRouter>
  )

/** Botones numerados de la paginación (excluye anterior y siguiente). */
const numberedButtons = (): HTMLButtonElement[] =>
  Array.from(document.querySelectorAll<HTMLButtonElement>(".page-buttons .btn-pagination")).filter(
    (button) => /^\d+$/.test(button.textContent ?? "")
  )

describe("News (noticias de videojuegos)", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    /* Por defecto el servicio devuelve la primera página; cada test decide su caso */
    vi.mocked(newsService.fetchNewsPage).mockResolvedValue(buildPage(1))
  })

  /* ================= CARGA ================= */

  it("muestra el loading y pide la primera página de 10 noticias", async () => {
    renderNews()

    expect(screen.getByText("Cargando noticias…")).toBeInTheDocument()
    expect(newsService.fetchNewsPage).toHaveBeenCalledWith(
      1,
      NEWS_PAGE_SIZE,
      expect.any(AbortSignal)
    )

    expect(await screen.findByText("Noticia 1")).toBeInTheDocument()
    expect(screen.queryByText("Cargando noticias…")).toBeNull()
  })

  it("pinta la cabecera de la página y el breadcrumb", async () => {
    renderNews()

    expect(
      screen.getByRole("heading", { level: 1, name: "Noticias de videojuegos" })
    ).toBeInTheDocument()
    expect(screen.getByText("Inicio")).toHaveAttribute("href", "/")
  })

  /* ================= LISTADO ================= */

  it("renderiza las 10 tarjetas con título, resumen, fuente, fecha e imagen", async () => {
    renderNews()

    await screen.findByText("Noticia 1")

    expect(document.querySelectorAll(".news-item")).toHaveLength(10)

    const title = document.querySelector(".news-title")
    expect(title?.textContent).toContain("Noticia 1")
    expect(title?.querySelector("a")?.getAttribute("href")).toBe("https://example.com/news/1")

    /* El HTML del feed se muestra como texto plano, nunca como etiquetas */
    const summary = document.querySelector(".news-summary")
    expect(summary?.textContent).toBe("Descripción de la noticia 1")
    expect(summary?.querySelector("p")).toBeNull()
    expect(screen.queryByText(/<p>/)).toBeNull()

    expect(document.querySelector(".news-source")?.textContent).toBe("VidaExtra")
    expect(document.querySelector(".news-date")?.textContent).toContain(
      formatNewsDate("2026-01-15T10:30:00.000Z")
    )
    expect(document.querySelector(".news-media img")?.getAttribute("src")).toBe(
      "https://example.com/news/1.jpg"
    )
    expect(document.querySelector(".news-link")?.getAttribute("href")).toBe(
      "https://example.com/news/1"
    )
  })

  it("renderiza noticias que usan nombres alternativos de campo", async () => {
    vi.mocked(newsService.fetchNewsPage).mockResolvedValue({
      data: [
        {
          id: "abc",
          title: "Noticia con alias",
          summary: "Resumen alternativo",
          urlToImage: "https://example.com/alias.jpg",
          link: "https://example.com/alias",
          publishedAt: "2026-02-01T00:00:00.000Z",
          source: { name: "Fuente Alias" }
        }
      ],
      pagination: { currentPage: 1, perPage: 10, totalRecords: 1, totalPages: 1 }
    })

    renderNews()

    expect(await screen.findByText("Noticia con alias")).toBeInTheDocument()
    expect(screen.getByText("Resumen alternativo")).toBeInTheDocument()
    expect(screen.getByText("Fuente Alias")).toBeInTheDocument()
    expect(document.querySelector(".news-media img")?.getAttribute("src")).toBe(
      "https://example.com/alias.jpg"
    )
    expect(document.querySelector(".news-title a")?.getAttribute("href")).toBe(
      "https://example.com/alias"
    )
    expect(document.querySelector(".news-date")?.textContent).toContain(
      formatNewsDate("2026-02-01T00:00:00.000Z")
    )
  })

  /* ================= ESTADOS ================= */

  it("muestra el estado vacío y oculta la paginación cuando no hay noticias", async () => {
    vi.mocked(newsService.fetchNewsPage).mockResolvedValue(buildPage(1, 0))

    renderNews()

    expect(
      await screen.findByText("No hay noticias disponibles por el momento.")
    ).toBeInTheDocument()
    expect(document.querySelectorAll(".news-item")).toHaveLength(0)
    expect(screen.queryByRole("navigation", { name: "Paginación de noticias" })).toBeNull()
  })

  it("muestra el error y permite reintentar la carga", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

    vi.mocked(newsService.fetchNewsPage).mockRejectedValueOnce(new Error("boom"))

    renderNews()

    expect(
      await screen.findByText("No se pudieron cargar las noticias. El servicio no está disponible.")
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }))

    expect(await screen.findByText("Noticia 1")).toBeInTheDocument()
    expect(newsService.fetchNewsPage).toHaveBeenCalledTimes(2)

    consoleError.mockRestore()
  })

  it("no muestra error si la petición se cancela", async () => {
    const canceled = Object.assign(new Error("canceled"), { name: "CanceledError" })

    vi.mocked(newsService.fetchNewsPage).mockRejectedValue(canceled)

    renderNews()

    await waitFor(() => {
      expect(newsService.fetchNewsPage).toHaveBeenCalled()
    })

    expect(screen.queryByRole("alert")).toBeNull()
    expect(screen.queryByText(/No se pudieron cargar las noticias/)).toBeNull()
  })

  /* ================= PAGINACIÓN ================= */

  it("muestra el resumen de registros y los números de página", async () => {
    renderNews()

    await screen.findByText("Noticia 1")

    expect(document.querySelector(".page-info")).toHaveTextContent("Mostrando 1–10 de 356 noticias")
    expect(numberedButtons().map((button) => button.textContent)).toEqual(["1", "2", "3", "4", "5"])
    expect(screen.getByRole("button", { name: "1" })).toHaveClass("active")
    expect(screen.getByRole("button", { name: "1" })).toHaveAttribute("aria-current", "page")
  })

  it("navega a la página siguiente y vuelve a la anterior", async () => {
    vi.mocked(newsService.fetchNewsPage).mockImplementation(async (page: number) => buildPage(page))

    renderNews()

    await screen.findByText("Noticia 1")

    expect(screen.getByRole("button", { name: "Página anterior" })).toBeDisabled()

    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }))

    expect(await screen.findByText("Noticia 11")).toBeInTheDocument()
    expect(newsService.fetchNewsPage).toHaveBeenLastCalledWith(
      2,
      NEWS_PAGE_SIZE,
      expect.any(AbortSignal)
    )
    expect(document.querySelector(".page-info")).toHaveTextContent(
      "Mostrando 11–20 de 356 noticias"
    )
    expect(screen.getByRole("button", { name: "2" })).toHaveClass("active")

    fireEvent.click(screen.getByRole("button", { name: "Página anterior" }))

    expect(await screen.findByText("Noticia 1")).toBeInTheDocument()
    expect(document.querySelector(".page-info")).toHaveTextContent("Mostrando 1–10 de 356 noticias")
  })

  it("salta a una página con los botones numerados", async () => {
    vi.mocked(newsService.fetchNewsPage).mockImplementation(async (page: number) => buildPage(page))

    renderNews()

    await screen.findByText("Noticia 1")

    fireEvent.click(screen.getByRole("button", { name: "3" }))

    expect(await screen.findByText("Noticia 21")).toBeInTheDocument()
    expect(document.querySelector(".page-info")).toHaveTextContent(
      "Mostrando 21–30 de 356 noticias"
    )
  })

  it("deshabilita la navegación en los extremos", async () => {
    vi.mocked(newsService.fetchNewsPage).mockImplementation(async (page: number) =>
      buildPage(page, 15)
    )

    renderNews()

    await screen.findByText("Noticia 1")

    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }))

    await screen.findByText("Noticia 11")

    expect(screen.getByRole("button", { name: "Página siguiente" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Página anterior" })).toBeEnabled()
  })

  it("ventanea los números de página alrededor de la actual", async () => {
    vi.mocked(newsService.fetchNewsPage).mockImplementation(async (page: number) =>
      buildPage(page, 120)
    )

    renderNews()

    await screen.findByText("Noticia 1")

    expect(numberedButtons().map((button) => button.textContent)).toEqual(["1", "2", "3", "4", "5"])

    fireEvent.click(screen.getByRole("button", { name: "5" }))
    await screen.findByText("Noticia 41")

    expect(numberedButtons().map((button) => button.textContent)).toEqual(["3", "4", "5", "6", "7"])

    fireEvent.click(screen.getByRole("button", { name: "6" }))
    await screen.findByText("Noticia 51")

    expect(numberedButtons().map((button) => button.textContent)).toEqual(["4", "5", "6", "7", "8"])
  })
})
