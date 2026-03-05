import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { MemoryRouter } from "react-router-dom"

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

describe("HamburgerMenu", () => {

  beforeEach(() => {
    vi.spyOn(platformService, "getPlatforms").mockResolvedValue(mockPlatforms)
  })

  it("renderiza el botón hamburguesa", () => {

    render(
      <MemoryRouter>
        <HamburgerMenu />
      </MemoryRouter>
    )

    const button = screen.getByRole("button")
    expect(button).toBeInTheDocument()
  })

  it("abre el menú al hacer click", async () => {

    render(
      <MemoryRouter>
        <HamburgerMenu />
      </MemoryRouter>
    )

    const button = screen.getByRole("button")

    fireEvent.click(button)

    expect(screen.getByText("Plataformas")).toBeInTheDocument()
  })

  it("carga plataformas desde el service", async () => {

    render(
      <MemoryRouter>
        <HamburgerMenu />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole("button"))

    await waitFor(() => {
      expect(screen.getByText("PlayStation 4")).toBeInTheDocument()
      expect(screen.getByText("Xbox One")).toBeInTheDocument()
    })
  })

 it("cierra el menú al hacer click en overlay", async () => {
  render(
    <MemoryRouter>
      <HamburgerMenu />
    </MemoryRouter>
  )

  const button = screen.getByText("☰")
  fireEvent.click(button)

  await screen.findByText("PlayStation 4")

  const overlay = document.querySelector('div[style*="rgba(0, 0, 0, 0.4)"]')
  fireEvent.click(overlay!)

  const menu = screen.getByText("Plataformas").parentElement

  await waitFor(() => {
    expect(menu).toHaveStyle("left: -260px")
  })
})

})