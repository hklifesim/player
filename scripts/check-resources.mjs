import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

const serviceWorker = readFileSync("flutter_service_worker.js", "utf8");
const match = serviceWorker.match(/const RESOURCES = (\{[\s\S]*?\});/);

if (!match) {
  throw new Error("Could not find RESOURCES in flutter_service_worker.js");
}

const resources = JSON.parse(match[1]);
const problems = [];

for (const [resourcePath, expectedHash] of Object.entries(resources)) {
  if (resourcePath === "/") continue;

  if (!existsSync(resourcePath)) {
    problems.push(`missing ${resourcePath}`);
    continue;
  }

  const actualHash = createHash("md5").update(readFileSync(resourcePath)).digest("hex");
  if (actualHash !== expectedHash) {
    problems.push(`hash mismatch ${resourcePath}: expected ${expectedHash}, got ${actualHash}`);
  }
}

if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exit(1);
}

console.log(`All ${Object.keys(resources).length - 1} deploy resources are present and match.`);
