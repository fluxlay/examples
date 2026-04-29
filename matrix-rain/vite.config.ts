import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import { fluxlay } from "@fluxlay/vite";

export default defineConfig({
  plugins: [react(), fluxlay()],
});
