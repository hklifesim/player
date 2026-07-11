import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(process.cwd());
const port = Number(process.env.PORT || 4173);
const redirectUrl = "https://hklifesim.online/";
const allowedEmbedderHosts = new Set(["hklifesim.online", "localhost"]);

const mimeTypes = {
  ".bin": "application/octet-stream",
  ".css": "text/css; charset=utf-8",
  ".frag": "text/plain; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".otf": "font/otf",
  ".png": "image/png",
  ".ttf": "font/ttf",
  ".wasm": "application/wasm"
};

function resolveRequestPath(url) {
  const pathname = decodeURIComponent(new URL(url, `http://localhost:${port}`).pathname);
  const normalized = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const requested = resolve(join(root, normalized));

  if (!requested.startsWith(root)) {
    return null;
  }

  if (existsSync(requested) && statSync(requested).isDirectory()) {
    return join(requested, "index.html");
  }

  if (existsSync(requested)) {
    return requested;
  }

  return extname(requested) ? null : join(root, "index.html");
}

function isAllowedEmbedder(referer) {
  if (!referer) {
    return false;
  }

  try {
    const url = new URL(referer);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      allowedEmbedderHosts.has(url.hostname)
    );
  } catch {
    return false;
  }
}

function isHtmlDocument(filePath) {
  return filePath.endsWith(".html");
}

const server = createServer((req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405);
    res.end("Method Not Allowed");
    return;
  }

  const filePath = resolveRequestPath(req.url || "/");

  if (!filePath || !existsSync(filePath)) {
    res.writeHead(404);
    res.end("Not Found");
    return;
  }

  // The initial iframe navigation carries its parent page in Referer.  Only
  // serve HTML to the official site or a local development host; assets must
  // remain accessible because their Referer is the player itself.
  if (isHtmlDocument(filePath) && !isAllowedEmbedder(req.headers.referer)) {
    res.writeHead(301, {
      Location: redirectUrl,
      "Cache-Control": "no-store",
      Vary: "Referer"
    });
    res.end();
    return;
  }

  const headers = {
    "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream",
    "Cache-Control": filePath.endsWith("index.html") ? "no-cache" : "public, max-age=31536000",
    "Content-Security-Policy": isHtmlDocument(filePath)
      ? "frame-ancestors https://hklifesim.online http://localhost:* https://localhost:*"
      : undefined
  };

  if (!headers["Content-Security-Policy"]) {
    delete headers["Content-Security-Policy"];
  }

  res.writeHead(200, headers);

  if (req.method === "HEAD") {
    res.end();
    return;
  }

  createReadStream(filePath).pipe(res);
});

server.listen(port, () => {
  console.log(`HK Life Sim is running at http://localhost:${port}`);
});
