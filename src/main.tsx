import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import "./modules.css";
import { loadMockData } from "./data/repository";

const root = createRoot(document.getElementById("root")!);

root.render(
  <div className="app-loading" role="status" aria-live="polite">
    <span className="app-loading-mark">OSU</span>
    <strong>Loading GME Central</strong>
    <small>Preparing demonstration data…</small>
  </div>,
);

async function start() {
  try {
    await loadMockData();
    const { default: App } = await import("./App");
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
  } catch (error) {
    root.render(
      <div className="app-loading app-loading-error" role="alert">
        <strong>GME Central could not load its demonstration data.</strong>
        <small>{error instanceof Error ? error.message : "Please refresh and try again."}</small>
      </div>,
    );
  }
}

void start();
