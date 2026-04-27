/* vite.config.ts */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/permit-fill-app/",
  plugins: [react()],
});