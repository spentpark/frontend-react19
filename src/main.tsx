import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import App from "./App.tsx"

import "./index.css"

createRoot(document.getElementById("root")!, {
  onUncaughtError: (error, errorInfo) => {
    console.error("Error no controlado:", error, errorInfo.componentStack)
  }
}).render(
  <StrictMode>
    <App />
  </StrictMode>
)
