import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

import HamburgerMenu from "../HamburgerMenu"
import * as platformService from "../../services/platformService"

const mockPlatforms = [
  {
    id: 1,
    description: "PlayStation 4",
    url: "ps4"
  },
  {
    id: 2,
    description: "Xbox One",
    url: "xbox"
  }
]

const renderMenu = () =>
  render(
    <MemoryRouter>
      <HamburgerMenu />
    </MemoryRouter>
  )

const openMenu = () => fireEvent.click(screen.getByRole("button", { name: "Open menu" }))

describe("HamburgerMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.spyOn(platformService, "getPlatforms").mockResolvedValue(mockPlatforms)
  })

  it("renderiza el botón hamburguesa", () => {
    renderMenu()

    const button = screen.getByRole("button", { name: "Open menu" })
    expect(button).toBeInTheDocument()
  })

  it("abre el menú al hacer click", async () => {
    renderMenu()

    openMenu()

    expect(screen.getByText("Plataformas")).toBeInTheDocument()

    await screen.findByText("PlayStation 4")
  })

  it("carga plataformas desde el service", async () => {
    renderMenu()

    openMenu()

    await waitFor(() => {
      expect(screen.getByText("PlayStation 4")).toBeInTheDocument()
      expect(screen.getByText("Xbox One")).toBeInTheDocument()
    })

    expect(platformService.getPlatforms).toHaveBeenCalledWith(expect.any(AbortSignal))
  })

  it("expone el estado del menú con aria-expanded", () => {
    renderMenu()

    const button = screen.getByRole("button", { name: "Open menu" })

    expect(button).toHaveAttribute("aria-expanded", "false")

    fireEvent.click(button)

    expect(button).toHaveAttribute("aria-expanded", "true")
  })

  it("cierra el menú al hacer click en el overlay", async () => {
    renderMenu()

    const button = screen.getByRole("button", { name: "Open menu" })
    fireEvent.click(button)

    await screen.findByText("PlayStation 4")

    const overlay = document.querySelector(".overlay")
    expect(overlay).not.toBeNull()

    fireEvent.click(overlay!)

    await waitFor(() => {
      expect(document.querySelector(".overlay")).toBeNull()
    })

    expect(button).toHaveAttribute("aria-expanded", "false")
  })

  it("cierra el menú con la tecla Escape", async () => {
    renderMenu()

    const button = screen.getByRole("button", { name: "Open menu" })
    fireEvent.click(button)

    await screen.findByText("PlayStation 4")

    fireEvent.keyDown(window, { key: "Escape" })

    await waitFor(() => {
      expect(button).toHaveAttribute("aria-expanded", "false")
    })
  })

  it("mantiene el menú abierto al pulsar otras teclas", async () => {
    renderMenu()

    const button = screen.getByRole("button", { name: "Open menu" })
    fireEvent.click(button)

    await screen.findByText("PlayStation 4")

    fireEvent.keyDown(window, { key: "Enter" })

    expect(button).toHaveAttribute("aria-expanded", "true")
  })

  it("enlaza cada plataforma con su parámetro de búsqueda", async () => {
    renderMenu()

    openMenu()

    await screen.findByText("PlayStation 4")

    expect(screen.getByRole("link", { name: "PlayStation 4" })).toHaveAttribute(
      "href",
      "/catalog?platform=PlayStation%204"
    )
  })

  it("enlaza al inicio de la aplicación", async () => {
    renderMenu()

    openMenu()

    await screen.findByText("PlayStation 4")

    expect(screen.getByRole("link", { name: "Inicio" })).toHaveAttribute("href", "/")
  })

  it("avisa cuando la API no devuelve un array", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

    vi.spyOn(platformService, "getPlatforms").mockResolvedValue(
      {} as unknown as typeof mockPlatforms
    )

    renderMenu()

    expect(await screen.findByText("No platforms")).toBeInTheDocument()
    expect(consoleError).toHaveBeenCalled()

    consoleError.mockRestore()
  })

  it("muestra un mensaje si falla la carga de plataformas", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

    vi.spyOn(platformService, "getPlatforms").mockRejectedValue(new Error("boom"))

    renderMenu()

    openMenu()

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudieron cargar las plataformas."
    )

    consoleError.mockRestore()
  })

  it("no muestra error si la petición se cancela", async () => {
    const canceled = Object.assign(new Error("canceled"), { name: "CanceledError" })

    vi.spyOn(platformService, "getPlatforms").mockRejectedValue(canceled)

    renderMenu()

    await waitFor(() => {
      expect(platformService.getPlatforms).toHaveBeenCalled()
    })

    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("cierra el menú al pulsar un enlace de plataforma", async () => {
    renderMenu()

    openMenu()

    const link = await screen.findByRole("link", { name: "PlayStation 4" })

    fireEvent.click(link)

    await waitFor(() => {
      expect(document.querySelector(".overlay")).toBeNull()
    })
  })
})
