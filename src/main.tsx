import "leaflet/dist/leaflet.css";
import "./styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";

registerSW({ immediate: true });

const root = document.getElementById("root");
if (!root) throw new Error("#root mancante");
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
