import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { Wallpaper } from "./Wallpaper";
import "./index.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <Wallpaper />
  </StrictMode>,
);
