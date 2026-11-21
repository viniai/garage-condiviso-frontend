import "leaflet/dist/leaflet.css";
import "@fontsource/oswald/latin-500.css";
import "@fontsource/oswald/latin-600.css";
import "@fontsource/work-sans/latin-400.css";
import "@fontsource/work-sans/latin-600.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
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
