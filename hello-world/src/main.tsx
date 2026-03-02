import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";

function HelloWorld() {
  return (
    <main className="flex justify-center items-center h-full w-full bg-[#f0f0f0]">
      Hello World!!
    </main>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <HelloWorld/>
  </StrictMode>,
);
