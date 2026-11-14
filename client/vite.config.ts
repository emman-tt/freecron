import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

//Dev server proxies /api to the Express backend, so session cookies stay
//same-origin exactly like production (Express serves the built client there)
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5002",
        changeOrigin: true,
        //better-auth validates the Origin header (trustedOrigins) and 5173
        //isn't one of them — so the proxy presents the backend's own origin,
        //keeping cookies and CSRF validation identical to production
        configure(proxy) {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.setHeader("origin", "http://localhost:5002");
          });
        },
      },
    },
  },
});
