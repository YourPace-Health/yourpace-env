// Base URL of the backend API. Set VITE_API_URL (e.g. https://api.example.com/api) for deployed builds;
// without it, fall back to the local docker-compose backend on the same host.
export const API_BASE_URL =
  import.meta.env?.VITE_API_URL ||
  `http://${window.location.hostname}:${import.meta.env?.VITE_BACKEND_PORT || (window.location.port === "8080" ? "8080" : "8081")}/api`;
