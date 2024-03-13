import { basename, isAbsolute, resolve } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import { type Logger, type Plugin, type ResolvedConfig, createLogger } from "vite";
import type { Font as FCFont } from "font-carrier";
import fontCarrier from "font-carrier";
import { bold, lightBlue, lightGreen, lightRed, lightYellow } from "kolorist";
import { version } from "../package.json";
import { assert, getFileHash } from "./utils";
import type { FontAsset, FontCarrierOptions, OutputAsset } from "./types";
import { DEFAULT_FONT_TYPE, LOG_PREFIX } from "./const";
export * from "./types";

export const lowercaseChars = "abcdefghijklmnopqrstuvwxyz";
export const uppercaseChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const numberChars = "0123456789";
export const allChars = lowercaseChars + uppercaseChars + numberChars;

const FontCarrier: (options: FontCarrierOptions) => Plugin = (options) => {
  let { root, fonts, type, logLevel, clearScreen } = options;

  let fontAssets: FontAsset[] = [];

  let resolvedConfig: ResolvedConfig;
  let logger: Logger;

  async function resolveFontAssets() {
    const assets: FontAsset[] = [];
    assert(root, "Project root must be specified");
    for (const font of fonts) {
      let underPublicDir = false;
      let path: string;
      if (isAbsolute(font.path)) {
        underPublicDir = true;
        path = resolve(root, resolvedConfig.publicDir, font.path.slice(1));
      } else {
        path = resolve(root, font.path);
      }
      const hash = getFileHash(path);
      if (!hash) {
        logger.error(`\n${lightRed(LOG_PREFIX)} ${basename(path)} not found!`);
        continue;
      }
      const asset: FontAsset = {
        path,
        filename: basename(path),
        hash,
        hashname: "",
        input: font.input,
        type: font.type || type || DEFAULT_FONT_TYPE,
        compressed: false,
        underPublicDir,
      };
      assets.push(asset);
    }
    return assets;
  }

  function matchFontBundle(bundle: OutputAsset) {
    if (bundle.source instanceof Uint8Array) {
      // Same filename files
      const filteredFonts = fontAssets.filter(font => font.filename === bundle.name);
      if (filteredFonts.length) {
        const hash = getFileHash(bundle.source)!;
        const matchedFont = filteredFonts.find(font => font.hash === hash);
        if (matchedFont) {
          matchedFont.hashname = bundle.fileName;
          matchedFont.linkedBundle = bundle;
          return matchedFont;
        }
      }
    }
  }

  function compressFont(font: FontAsset) {
    assert(font.linkedBundle, "Font linkedBundle is required");
    const buffer = Buffer.from(font.linkedBundle.source);
    const compressed = compress(buffer, font);
    font.linkedBundle.source = compressed;
    font.compressed = true;
    return font;
  }

  function compress(buffer: Buffer, options: { type: FCFont.FontType;input: string }) {
    const { type, input } = options;
    const fc = fontCarrier.transfer(buffer);
    fc.min(input);
    const outputs = fc.output({
      types: [type],
    }) as unknown as { [K in FCFont.FontType]: Buffer };
    return outputs[type];
  }

  return {
    name: "vite-plugin-font-carrier",
    version,
    async configResolved(config) {
      resolvedConfig = config;
      logger = logLevel ? createLogger(logLevel, { allowClearScreen: clearScreen }) : config.logger;
      root = root || resolvedConfig.root;
      fontAssets = await resolveFontAssets();
    },
    generateBundle(outputOptions, outputBundle, isWrite) {
      Object.entries(outputBundle).forEach(([filename, bundle]) => {
        if (bundle.type === "asset") {
          // Link font filename and hashname
          const font = matchFontBundle(bundle);
          if (font) {
            compressFont(font);
          }
        }
      });
    },
    closeBundle() {
      fontAssets.filter(font => font.underPublicDir).forEach((font) => {
        assert(!font.compressed, "Font under public dir should not be compressed");
        const copyPublicDir = resolvedConfig.build.copyPublicDir;
        if (copyPublicDir) {
          const { root, build } = resolvedConfig;
          const { outDir } = build;
          const outputDir = resolve(root, outDir);
          const buffer = readFileSync(font.path);
          const compressed = compress(buffer, font);
          writeFileSync(resolve(outputDir, font.filename), compressed);
          font.compressed = true;
        }
      });
      if (fontAssets.length) {
        const compressed = fontAssets.filter(font => font.compressed).map(font => font.filename);
        const notCompressed = fontAssets.filter(font => !font.compressed).map(font => basename(font.path));
        logger.info(`${lightBlue(LOG_PREFIX)}${compressed.length ? ` ${lightGreen(bold(compressed.join(", ")))} compressed.` : ""}${notCompressed.length ? ` ${lightYellow(bold(notCompressed.join(", ")))} not compressed because of unused.` : ""}`);
      }
    },
  };
};

export default FontCarrier;
