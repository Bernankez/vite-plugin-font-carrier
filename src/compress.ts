import { readFileSync } from "node:fs";
import type { Font as FC } from "font-carrier";
import fontCarrier from "font-carrier";
import { assert } from "./utils";

export interface CompressOptions {
  type: FC.FontType;
  input: string;
}

export function compress(buffer: Buffer | string, options: CompressOptions) {
  const { type, input } = options;

  try {
    const _buffer = typeof buffer === "string" ? readFileSync(buffer) : buffer;
    const fc = fontCarrier.transfer(_buffer);
    fc.min(input);
    const outputs = fc.output({
      types: [type],
    }) as unknown as { [K in FC.FontType]: Buffer };
    return outputs[type];
  } catch (e) {
    assert(false, "Font file not found");
  }
}
