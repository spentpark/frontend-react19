import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import ErrorBoundary from "../ErrorBoundary"

const Bomb = () => {
  throw new Error("boom")
}

describe("ErrorBoundary", () => {
  it("renderiza los hijos cuando no hay errores", () => {
    render(
      <ErrorBoundary>
        <p>Contenido protegido</p>
      </ErrorBoundary>
    )

    expect(screen.getByText("Contenido protegido")).toBeInTheDocument()
  })

  it("muestra el fallback cuando un hijo lanza un error", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    )

    expect(screen.getByRole("alert")).toBeInTheDocument()
    expect(screen.getByText("Something went wrong")).toBeInTheDocument()
    expect(screen.getByText("boom")).toBeInTheDocument()

    consoleError.mockRestore()
  })

  it("vuelve a renderizar los hijos al pulsar Retry", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

    let shouldThrow = true

    const Flaky = () => {
      if (shouldThrow) {
        throw new Error("boom")
      }

      return <p>Recuperado</p>
    }

    render(
      <ErrorBoundary>
        <Flaky />
      </ErrorBoundary>
    )

    expect(screen.getByRole("alert")).toBeInTheDocument()

    shouldThrow = false

    fireEvent.click(screen.getByText("Retry"))

    expect(screen.getByText("Recuperado")).toBeInTheDocument()

    consoleError.mockRestore()
  })
})
