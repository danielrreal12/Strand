import path from "node:path";

/** Records, session secret, and uploaded maps. On Render this is the persistent disk. */
export function dataDir() {
  return process.env.DATA_DIR || path.join(process.cwd(), ".data");
}

export function mapsDir() {
  return process.env.MAPS_DIR || path.join(process.cwd(), "private", "maps");
}

export function storeFile() {
  return path.join(dataDir(), "production-store.json");
}

export function sessionSecretFile() {
  return path.join(dataDir(), "session-secret");
}
