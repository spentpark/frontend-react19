import type { AxiosResponse } from "axios"
import { beforeEach, describe, expect, it, vi } from "vitest"

/* Se fija el entorno para que la URL del servicio no dependa de `.env` */
vi.mock("../../config/environment", () => ({
  environment: {
    apiUrl: "http://localhost:7000/api",
    newsApiUrl: "http://localhost:3001/api",
    apiUsername: "admin",
    apiPassword: "secret"
  }
}))

vi.mock("../../services/http", () => ({
  http: {
    get: vi.fn()
  }
}))

import { http } from "../../services/http"
import {
  EMPTY_NEWS_PAGE,
  NEWS_BASE_URL,
  NEWS_PAGE_SIZE,
  extractFirstImage,
  fetchNewsPage,
  formatNewsDate,
  resolveNewsBaseUrl,
  stripHtml,
  toNewsItem,
  unwrapNewsPage,
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

const mockPage: GameNewsPage = {
  data: buildNews(NEWS_PAGE_SIZE),
  pagination: {
    currentPage: 1,
    perPage: NEWS_PAGE_SIZE,
    totalRecords: 356,
    totalPages: 36
  }
}

const axiosResponse = (data: unknown): AxiosResponse => ({ data }) as unknown as AxiosResponse

describe("newsService", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("apunta al servicio game-news del backend de noticias", () => {
    expect(NEWS_BASE_URL).toBe("http://localhost:3001/api/game-news")
  })

  it("resuelve una ruta relativa del proxy contra el origen de la página", () => {
    expect(resolveNewsBaseUrl("/news-api/")).toBe(`${window.location.origin}/news-api`)
    expect(resolveNewsBaseUrl("http://localhost:3001/api/")).toBe("http://localhost:3001/api")
    expect(resolveNewsBaseUrl("https://api.example.com")).toBe("https://api.example.com")
  })

  it("pide la página indicada con el límite y la señal de cancelación", async () => {
    vi.mocked(http.get).mockResolvedValue(axiosResponse(mockPage))

    const controller = new AbortController()
    const result = await fetchNewsPage(2, NEWS_PAGE_SIZE, controller.signal)

    expect(http.get).toHaveBeenCalledWith(NEWS_BASE_URL, {
      params: { page: 2, limit: NEWS_PAGE_SIZE },
      signal: controller.signal
    })
    expect(result).toEqual(mockPage)
  })

  it("usa el tamaño de página por defecto cuando no se indica límite", async () => {
    vi.mocked(http.get).mockResolvedValue(axiosResponse(mockPage))

    await fetchNewsPage(1)

    expect(http.get).toHaveBeenCalledWith(NEWS_BASE_URL, {
      params: { page: 1, limit: NEWS_PAGE_SIZE },
      signal: undefined
    })
  })

  it("pagina en cliente una respuesta con la lista plana", async () => {
    vi.mocked(http.get).mockResolvedValue(axiosResponse(buildNews(25)))

    const page = await fetchNewsPage(3)

    expect(page.data).toHaveLength(5)
    expect(page.data[0].title).toBe("Noticia 21")
    expect(page.pagination).toEqual({
      currentPage: 3,
      perPage: NEWS_PAGE_SIZE,
      totalRecords: 25,
      totalPages: 3
    })
  })

  it("propaga los errores HTTP para que la vista pinte el estado de error", async () => {
    vi.mocked(http.get).mockRejectedValue({ response: { status: 500 } })

    await expect(fetchNewsPage(1)).rejects.toMatchObject({ response: { status: 500 } })
  })
})

describe("unwrapNewsPage", () => {
  it("acepta el contrato del backend `{ data, pagination }`", () => {
    expect(unwrapNewsPage(mockPage)).toEqual(mockPage)
  })

  it("acepta los alias `news`, `articles` e `items`", () => {
    expect(unwrapNewsPage({ news: mockPage.data, totalPages: 1 }).data).toEqual(mockPage.data)
    expect(unwrapNewsPage({ articles: mockPage.data, totalPages: 1 }).data).toEqual(mockPage.data)
    expect(unwrapNewsPage({ items: mockPage.data, totalPages: 1 }).data).toEqual(mockPage.data)
  })

  it("deriva la paginación cuando la respuesta solo expone totales", () => {
    const page = unwrapNewsPage({ data: mockPage.data, page: 2, limit: 10, total: 356 })

    expect(page.pagination).toEqual({
      currentPage: 2,
      perPage: 10,
      totalRecords: 356,
      totalPages: 36
    })
  })

  it("pagina un array plano en bloques de 10", () => {
    const allNews = buildNews(25)

    const firstPage = unwrapNewsPage(allNews, 1, NEWS_PAGE_SIZE)
    const thirdPage = unwrapNewsPage(allNews, 3, NEWS_PAGE_SIZE)

    expect(firstPage.data).toHaveLength(10)
    expect(firstPage.data[0].title).toBe("Noticia 1")
    expect(firstPage.pagination).toEqual({
      currentPage: 1,
      perPage: 10,
      totalRecords: 25,
      totalPages: 3
    })
    expect(thirdPage.data).toHaveLength(5)
    expect(thirdPage.data[0].title).toBe("Noticia 21")
  })

  it("sujeta la página pedida al rango disponible", () => {
    const page = unwrapNewsPage(buildNews(25), 99, NEWS_PAGE_SIZE)

    expect(page.pagination.currentPage).toBe(3)
  })

  it("devuelve una página vacía si la respuesta no trae listas", () => {
    expect(unwrapNewsPage(undefined)).toEqual(EMPTY_NEWS_PAGE)
    expect(unwrapNewsPage({})).toEqual(EMPTY_NEWS_PAGE)
  })
})

describe("news helpers", () => {
  it("limpia el HTML del feed y extrae su primera imagen", () => {
    expect(stripHtml("<p>Hola <strong>mundo</strong>&nbsp;&amp; más</p>")).toBe("Hola mundo & más")
    expect(extractFirstImage('<p>Texto</p><img src="https://img.example/1.jpg" alt="x">')).toBe(
      "https://img.example/1.jpg"
    )
    expect(extractFirstImage("<p>Sin imagen</p>")).toBeNull()
  })

  it("normaliza la fecha y conserva el valor original si no es válida", () => {
    expect(formatNewsDate("2026-01-15T10:30:00.000Z")).toContain("2026")
    expect(formatNewsDate("")).toBe("")
    expect(formatNewsDate("no-es-una-fecha")).toBe("no-es-una-fecha")
  })

  it("normaliza una noticia con la forma real del backend", () => {
    const item = toNewsItem(buildNews(1)[0], 0)

    expect(item).toEqual({
      id: "id-1",
      title: "Noticia 1",
      summary: "Descripción de la noticia 1",
      imageUrl: "https://example.com/news/1.jpg",
      url: "https://example.com/news/1",
      source: "VidaExtra",
      publishedAt: formatNewsDate("2026-01-15T10:30:00.000Z")
    })
  })

  it("normaliza una noticia con nombres alternativos de campo", () => {
    const item = toNewsItem(
      {
        id: "abc",
        title: "Noticia con alias",
        summary: "Resumen alternativo",
        urlToImage: "https://example.com/alias.jpg",
        link: "https://example.com/alias",
        publishedAt: "2026-02-01T00:00:00.000Z",
        source: { name: "Fuente Alias" }
      },
      0
    )

    expect(item.source).toBe("Fuente Alias")
    expect(item.summary).toBe("Resumen alternativo")
    expect(item.imageUrl).toBe("https://example.com/alias.jpg")
    expect(item.url).toBe("https://example.com/alias")
    expect(item.publishedAt).toBe(formatNewsDate("2026-02-01T00:00:00.000Z"))
  })

  it("normaliza una noticia sin datos con valores por defecto", () => {
    const item = toNewsItem({ id: 5 }, 0)

    expect(item).toEqual({
      id: 5,
      title: "Noticia sin título",
      summary: "",
      imageUrl: null,
      url: null,
      source: "",
      publishedAt: ""
    })
  })
})
