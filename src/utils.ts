import { type BinaryLike, createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import type { ResolveFn } from "vite";
import { lightRed } from "kolorist";
import { LOG_PREFIX } from "./const";

export function assert(condition: unknown, msg?: string): asserts condition {
  if (!condition) {
    console.error(`${lightRed(LOG_PREFIX)} ${msg || "Unhandled error"}`);
    throw new Error(msg);
  }
}

export function getFileHash(path: string | BinaryLike) {
  if (typeof path === "string") {
    try {
      const buffer = readFileSync(path);
      const hash = createHash("sha256").update(buffer).digest("hex");
      return hash;
    } catch (e) {
      return undefined;
    }
  } else {
    const hash = createHash("sha256").update(path).digest("hex");
    return hash;
  }
}

export interface ResolvePathOptions {
  id: string;
  importer: string;
  publicDir: string;
  root: string;
  resolver: ResolveFn;
  ssr?: boolean;
}

export async function resolvePath(options: ResolvePathOptions) {
  const { id, importer, publicDir, root, resolver, ssr } = options;
  let underPublicDir = false;
  let path = await resolver(id, importer, false, ssr);
  if (path) {
    if (!isAbsolute(path)) {
      // Path alias
      path = resolve(root, path);
    }
  } else {
    underPublicDir = true;
    path = resolve(root, publicDir, id.slice(1)); // remove first '/'
  }
  return { underPublicDir, path };
}
