import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { MimoProvider } from "@fluxlay/react/mimo";

import { App } from "./App";
import "./index.css";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("#root not found");

// MimoProvider synthesizes pointer/keyboard events from Fluxlay's OS input
// streams so React can dispatch click/focus/etc. on the wallpaper window
// (which is non-key on macOS and never receives native DOM events).
createRoot(rootEl).render(
  <StrictMode>
    <MimoProvider>
      <App />
    </MimoProvider>
  </StrictMode>
);
