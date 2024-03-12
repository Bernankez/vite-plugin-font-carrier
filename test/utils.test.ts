import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getFileHash } from "../src/utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, "..");

describe("getFileHash", () => {
  it("get hash from path", () => {
    const path = resolve(__dirname, "../fixtures/templates/biantaoti.woff");
    const hash = getFileHash(path);
    expect(hash).toBe("9ebb4143da7ca10dd4731372c2448a4ab3bd0c3aafa848246c43b5dd00d5e6b5");
  });

  it("get hash from file", () => {
    const path = resolve(__dirname, "../fixtures/templates/biantaoti.woff");
    const buffer = readFileSync(path);
    const hash = getFileHash(buffer);
    expect(hash).toBe("9ebb4143da7ca10dd4731372c2448a4ab3bd0c3aafa848246c43b5dd00d5e6b5");
  });
});
