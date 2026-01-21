import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/book/",
  build: {
    outDir: "../public/book",
    emptyOutDir: true,
  },
});
