
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Use relative base to avoid %BASE_URL% issues on GitHub Pages.
export default defineConfig({
  base: "./",
  plugins: [react()],
});
