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

describe("HamburgerMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.spyOn(platformService, "getPlatforms").mockResolvedValue(mockPlatforms)
  })

  it("renderiza el botón hamburguesa", () => {
    renderMenu()

    const button = screen.getByRole("button")
    expect(button).toBeInTheDocument()
  })

  it("abre el menú al hacer click", async () => {
    renderMenu()

    const button = screen.getByRole("button")

    fireEvent.click(button)

    expect(screen.getByText("Plataformas")).toBeInTheDocument()
  })

  it("carga plataformas desde el service", async () => {
    renderMenu()

    fireEvent.click(screen.getByRole("button"))

    await waitFor(() => {
      expect(screen.getByText("PlayStation 4")).toBeInTheDocument()
      expect(screen.getByText("Xbox One")).toBeInTheDocument()
    })

    expect(platformService.getPlatforms).toHaveBeenCalledWith(expect.any(AbortSignal))
  })

  it("expone el estado del menú con aria-expanded", () => {
    renderMenu()

    const button = screen.getByRole("button")

    expect(button).toHaveAttribute("aria-expanded", "false")

    fireEvent.click(button)

    expect(button).toHaveAttribute("aria-expanded", "true")
  })

  it("cierra el menú al hacer click en el overlay", async () => {
    renderMenu()

    const button = screen.getByText("☰")
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

    const button = screen.getByText("☰")
    fireEvent.click(button)

    await screen.findByText("PlayStation 4")

    fireEvent.keyDown(window, { key: "Escape" })

    await waitFor(() => {
      expect(button).toHaveAttribute("aria-expanded", "false")
    })
  })

  it("enlaza cada plataforma con su parámetro de búsqueda", async () => {
    renderMenu()

    fireEvent.click(screen.getByText("☰"))

    await screen.findByText("PlayStation 4")

    expect(screen.getByRole("link", { name: "PlayStation 4" })).toHaveAttribute(
      "href",
      "/?platform=PlayStation%204"
    )
  })
})
