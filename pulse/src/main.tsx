import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";
import { Wallpaper } from "./Wallpaper";

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <Wallpaper />
  </StrictMode>,
);
