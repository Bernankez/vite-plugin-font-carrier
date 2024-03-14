import { basename, dirname, extname, isAbsolute, relative, resolve } from "node:path";
import { readFileSync } from "node:fs";
import { type Logger, type Plugin, type ResolvedConfig, createLogger, normalizePath } from "vite";
import { bold, lightBlue, lightGreen, lightRed, lightYellow } from "kolorist";
import fs from "fs-extra";
import MagicString from "magic-string";
import { version } from "../package.json";
import { getFileHash } from "./utils";
import type { FontAsset, FontCarrierOptions, OutputAsset } from "./types";
import { DEFAULT_FONT_TYPE, JS_EXT, LOG_PREFIX } from "./const";
import { compress } from "./compress";
import { matchFontFace, matchUrl } from "./match";
export * from "./types";

export const lowercaseChars = "abcdefghijklmnopqrstuvwxyz";
export const uppercaseChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const numberChars = "0123456789";
export const allChars = lowercaseChars + uppercaseChars + numberChars;

const FontCarrier: (options: FontCarrierOptions) => Plugin = (options) => {
  const { fonts, type, logLevel, clearScreen, sourceMap = true } = options;

  let fontAssets: FontAsset[] = [];

  let resolvedConfig: ResolvedConfig;
  let logger: Logger;
  let root: string;
  let nodeModulesDir: string;
  let tempDir: string;

  function resolveFontAssets() {
    const assets: FontAsset[] = [];
    for (const font of fonts) {
      let underPublicDir = false;
      let path: string;
      if (isAbsolute(font.path)) {
        underPublicDir = true;
        path = resolve(resolvedConfig.publicDir, font.path.slice(1));
      } else {
        path = resolve(root, font.path);
      }
      const hash = getFileHash(path);
      if (!hash) {
        logger.error(`\n${lightRed(LOG_PREFIX)} ${basename(path)} not found!`);
        continue;
      }
      const fontType = font.type || type || DEFAULT_FONT_TYPE;
      const asset: FontAsset = {
        path,
        filename: basename(path).split(".")[0],
        extname: extname(path),
        outputExtname: `.${fontType}`,
        type: fontType,
        input: font.input,
        hash,
        compressed: false,
        underPublicDir,
      };
      assets.push(asset);
    }
    return assets;
  }

  function extractFontUrls(code: string) {
    // Get font url from source code
    const fontFaces = matchFontFace(code);
    if (!fontFaces) {
      return [];
    }
    // Each fontFace can have multiple Urls
    // Filter same url
    return fontFaces.map(fc => matchUrl(fc)).flat().filter(url => url).filter((url, index, arr) => arr.indexOf(url) === index) as string[] || [];
  }

  function compressFont(font: FontAsset, write: boolean) {
    const source = readFileSync(font.path);
    const compressed = compress(source, font);
    font.compressedSource = compressed;
    if (write) {
      const tempPath = resolve(tempDir, `${font.filename}${font.outputExtname}`);
      fs.outputFileSync(tempPath, compressed);
      font.tempPath = tempPath;
    }
    if (font.build?.linkedBundle) {
      font.build.linkedBundle.source = compressed;
    }
    font.compressed = true;
    return font;
  }

  function matchFontBundle(bundle: OutputAsset) {
    if (bundle.source instanceof Uint8Array) {
      // Same filename files
      const filteredFonts = fontAssets.filter(font => `${font.filename}${font.extname}` === bundle.name);
      if (filteredFonts.length) {
        const hash = getFileHash(bundle.source)!;
        const matchedFont = filteredFonts.find(font => font.hash === hash);
        if (matchedFont) {
          matchedFont.build = {
            hashname: bundle.fileName,
            linkedBundle: bundle,
          };
          return matchedFont;
        }
      }
    }
  }

  return {
    name: "vite-plugin-font-carrier",
    version,
    enforce: "pre",
    async configResolved(config) {
      resolvedConfig = config;
      logger = logLevel ? createLogger(logLevel, { allowClearScreen: clearScreen }) : config.logger;
      root = root || resolvedConfig.root;
      nodeModulesDir = resolve(root, "node_modules");
      tempDir = resolve(nodeModulesDir, ".vite-plugin-font-carrier");
      fontAssets = resolveFontAssets();
    },
    buildStart() {
      fs.emptyDirSync(tempDir);
    },
    resolveId(id, importer, { isEntry }) {
      // if (resolvedConfig.command === "build") {
      //   return;
      // }
      id = normalizePath(id);
      if (!isEntry && importer && JS_EXT.includes(extname(importer))) {
        const dir = dirname(importer);
        let path: string;
        if (isAbsolute(id)) {
          path = resolve(resolvedConfig.publicDir, id.slice(1));
        } else {
          path = resolve(dir, id);
        }
        const fontAsset = fontAssets.find(font => font.path === path);
        if (fontAsset) {
          return `\0${path}`;
        }
      }
    },
    load(id) {
      if (id.startsWith("\0")) {
        const path = resolve(normalizePath(id.slice(1)));
        const font = fontAssets.find(font => font.path === path);
        if (font) {
          compressFont(font, true);
          if (resolvedConfig.command === "serve") {
            return `export default "${relative(root, font.tempPath!)}";`;
          } else {
            // TODO assets under public
            const assetId = this.emitFile({
              type: "asset",
              fileName: `${resolvedConfig.build.assetsDir}/${font.filename}-${font.hash.slice(0, 8)}${font.outputExtname}`,
              source: font.compressedSource,
            });
            return `export default "__VITE_ASSET__${assetId}__"`;
          }
        }
      }
    },
    transform(code, id) {
      if (resolvedConfig.command === "build") {
        return;
      }
      // TODO transform
      // Handle url in css files
      const urls = extractFontUrls(code);
      for (const url of urls) {
        const path = resolve(dirname(id), url);
        const font = fontAssets.find(font => font.path === path);
        if (font) {
          const s = new MagicString(code);
          if (!font.compressed) {
            compressFont(font, true);
          }
          const relativePath = relative(dirname(id), font.tempPath!);
          s.replace(url, relativePath);
          return {
            code: s.toString(),
            map: sourceMap
              ? s.generateMap({
                source: id,
                includeContent: true,
                hires: true,
              })
              : null,
          };
        }
      }
    },
    generateBundle(outputOptions, outputBundle, isWrite) {
      Object.entries(outputBundle).forEach(([filename, bundle]) => {
        if (bundle.type === "asset") {
          // Link font filename and hashname
          const font = matchFontBundle(bundle);
          if (font) {
            compressFont(font, false);
          }
        }
      });
    },
    closeBundle() {
      fontAssets.filter(font => font.underPublicDir).forEach((font) => {
        const copyPublicDir = resolvedConfig.build.copyPublicDir;
        if (copyPublicDir) {
          const { root, build } = resolvedConfig;
          const { outDir } = build;
          const outputDir = resolve(root, outDir);
          const buffer = readFileSync(font.path);
          const compressed = compress(buffer, font);
          // TODO fix output extension name
          fs.outputFileSync(resolve(outputDir, `${font.filename}${font.extname}`), compressed);
          font.compressed = true;
        }
      });
      if (fontAssets.length) {
        // TODO better output
        const compressed = fontAssets.filter(font => font.compressed).map(font => `${font.filename}${font.extname}`);
        const notCompressed = fontAssets.filter(font => !font.compressed).map(font => `${font.filename}${font.extname}`);
        logger.info(`${lightBlue(LOG_PREFIX)}${compressed.length ? ` ${lightGreen(bold(compressed.join(", ")))} compressed.` : ""}${notCompressed.length ? ` ${lightYellow(bold(notCompressed.join(", ")))} not compressed because of unused.` : ""}`);
      }
    },
  };
};

export default FontCarrier;
