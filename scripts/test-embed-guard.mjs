import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer, request } from "node:http";

const port = await new Promise((resolve, reject) => {
  const probe = createServer();
  probe.listen(0, "127.0.0.1", () => {
    const { port } = probe.address();
    probe.close((error) => (error ? reject(error) : resolve(port)));
  });
});

const server = spawn(process.execPath, ["server.mjs"], {
  env: { ...process.env, PORT: String(port) },
  stdio: ["ignore", "pipe", "pipe"]
});

async function get(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = request({ host: "127.0.0.1", port, path, headers }, (res) => {
      res.resume();
      res.on("end", () => resolve(res));
    });
    req.on("error", reject);
    req.end();
  });
}

try {
  await once(server.stdout, "data");

  const direct = await get("/");
  assert.equal(direct.statusCode, 301);
  assert.equal(direct.headers.location, "https://hklifesim.online/");
  assert.match(direct.headers.vary, /referer/i);

  const productionEmbed = await get("/", { Referer: "https://hklifesim.online/play" });
  assert.equal(productionEmbed.statusCode, 200);
  assert.match(productionEmbed.headers["content-security-policy"], /frame-ancestors/);

  const localEmbed = await get("/", { Referer: "http://localhost:3000/" });
  assert.equal(localEmbed.statusCode, 200);

  const unapprovedEmbed = await get("/", { Referer: "https://example.com/" });
  assert.equal(unapprovedEmbed.statusCode, 301);

  const asset = await get("/flutter.js");
  assert.equal(asset.statusCode, 200);

  console.log("Embed guard checks passed.");
} finally {
  server.kill();
}
