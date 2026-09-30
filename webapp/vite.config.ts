import { defineConfig, type Plugin } from "vite";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

// The course (tutorials, prerequisites, lessons, shared CSS) lives one level up, in alonzo/.
// In dev we serve it at /course/ so tutorial "Try it in the Lab" links and the app share
// one origin. `npm run build` copies the same files into dist/course/ (scripts/copy-course.mjs).
const COURSE_ROOT = fileURLToPath(new URL("..", import.meta.url)).replace(/[\\/]$/, "");
const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".md": "text/plain; charset=utf-8", ".ts": "text/plain; charset=utf-8", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png",
};

function serveCourse(): Plugin {
  return {
    name: "alonzo-serve-course",
    configureServer(server) {
      server.middlewares.use("/course", (req, res, next) => {
        let rel = decodeURIComponent((req.url ?? "/").split("?")[0]);
        if (rel.endsWith("/")) rel += "index.html";
        const file = join(COURSE_ROOT, rel);
        if (!file.startsWith(COURSE_ROOT) || file.includes("node_modules") || !existsSync(file) || statSync(file).isDirectory()) return next();
        res.setHeader("Content-Type", TYPES[extname(file)] ?? "application/octet-stream");
        res.end(readFileSync(file));
      });
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [serveCourse()],
  server: { fs: { allow: [COURSE_ROOT] } },
  build: { outDir: "dist", emptyOutDir: true },
});
