import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import ThemeToggle from "../ThemeToggle"

const clearTheme = () => {
  localStorage.clear()
  document.documentElement.removeAttribute("data-theme")
}

describe("ThemeToggle", () => {
  beforeEach(() => {
    clearTheme()
  })

  afterEach(() => {
    clearTheme()
  })

  it("empieza en tema claro y alterna a oscuro", () => {
    render(<ThemeToggle />)

    const button = screen.getByRole("button", { name: "Switch to dark theme" })

    expect(document.documentElement).toHaveAttribute("data-theme", "light")

    fireEvent.click(button)

    expect(document.documentElement).toHaveAttribute("data-theme", "dark")
    expect(localStorage.getItem("spentpark-theme")).toBe("dark")
    expect(screen.getByRole("button", { name: "Switch to light theme" })).toBeInTheDocument()
  })

  it("recupera el tema oscuro guardado", () => {
    localStorage.setItem("spentpark-theme", "dark")

    render(<ThemeToggle />)

    expect(screen.getByRole("button", { name: "Switch to light theme" })).toBeInTheDocument()
    expect(document.documentElement).toHaveAttribute("data-theme", "dark")
  })

  it("vuelve al tema claro al pulsar de nuevo", () => {
    render(<ThemeToggle />)

    fireEvent.click(screen.getByRole("button", { name: "Switch to dark theme" }))
    fireEvent.click(screen.getByRole("button", { name: "Switch to light theme" }))

    expect(document.documentElement).toHaveAttribute("data-theme", "light")
    expect(localStorage.getItem("spentpark-theme")).toBe("light")
  })

  it("ignora un valor de almacenamiento no válido", () => {
    localStorage.setItem("spentpark-theme", "blue")

    render(<ThemeToggle />)

    expect(screen.getByRole("button", { name: "Switch to dark theme" })).toBeInTheDocument()
  })
})
