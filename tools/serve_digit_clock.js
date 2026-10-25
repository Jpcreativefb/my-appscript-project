// Local preview with the same ESPN route used by Cloudflare Pages.
// Usage: node tools/serve_digit_clock.js
const http = require("http");
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "../frontend");
(async () => {
  const code = fs.readFileSync(path.resolve(__dirname, "../functions/api/digit-clock.js"), "utf8");
  const { onRequestGet } = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://127.0.0.1:8788");
      if (req.method !== "GET") { res.writeHead(405); res.end("GET only"); return; }
      if (url.pathname === "/api/digit-clock") {
        const upstream = await onRequestGet({ request: new Request(url) });
        res.writeHead(upstream.status, Object.fromEntries(upstream.headers));
        res.end(Buffer.from(await upstream.arrayBuffer())); return;
      }
      const file = path.resolve(root, "." + decodeURIComponent(url.pathname === "/" ? "/digit-clock.html" : url.pathname));
      if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end("Not found"); return; }
      const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".json": "application/json" };
      res.writeHead(200, { "content-type": mime[path.extname(file)] || "application/octet-stream", "cache-control": "no-store" });
      fs.createReadStream(file).pipe(res);
    } catch (_) { res.writeHead(500); res.end("Preview request failed."); }
  });
  server.listen(8788, "127.0.0.1", () => console.log("Digit Clock preview: http://127.0.0.1:8788/digit-clock.html"));
})().catch(error => { console.error(error); process.exitCode = 1; });
