import { basename, dirname, extname, isAbsolute, join, relative, resolve } from "node:path";
import { readFileSync } from "node:fs";
import { type Logger, type Plugin, type ResolvedConfig, createLogger, normalizePath } from "vite";
import { bold, lightBlue, lightGreen, lightRed, lightYellow } from "kolorist";
import fs from "fs-extra";
import MagicString from "magic-string";
import { version } from "../package.json";
import { getFileHash } from "./utils";
import type { FontAsset, FontCarrierOptions } from "./types";
import { DEFAULT_FONT_TYPE, JS_EXT, LOG_PREFIX } from "./const";
import { compress as defaultCompress } from "./compress";
import { matchFontFace, matchUrl } from "./match";
export * from "./types";

export const lowercaseChars = "abcdefghijklmnopqrstuvwxyz";
export const uppercaseChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const numberChars = "0123456789";
export const allChars = lowercaseChars + uppercaseChars + numberChars;

const FontCarrier: (options: FontCarrierOptions) => Plugin = (options) => {
  const { fonts, type, logLevel, clearScreen, sourceMap, compressFn } = options;

  let fontAssets: FontAsset[] = [];

  let resolvedConfig: ResolvedConfig;
  let logger: Logger;
  // Project root
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
        originOptions: font,
        path,
        filename: basename(path).split(".")[0],
        extname: extname(path),
        outputExtname: "",
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
    const { source: compressedSource, ext } = compressed;
    font.compressedSource = compressedSource;
    font.outputExtname = `.${ext}`;
    if (write) {
      const tempPath = resolve(tempDir, `${font.filename}${font.outputExtname}`);
      fs.outputFileSync(tempPath, compressedSource);
      font.tempPath = tempPath;
    }
    font.compressed = true;
    return font;
  }

  function compress(buffer: Buffer, font: FontAsset): { source: Buffer; ext: string } {
    const fontType = font.type || type || DEFAULT_FONT_TYPE;
    if (compressFn) {
      const res = compressFn(buffer, { ...font.originOptions, type: fontType });
      if (res instanceof Buffer) {
        return { source: res, ext: fontType };
      }
      return {
        ...res,
        ext: res.ext ?? fontType,
      };
    } else {
      const source = defaultCompress(buffer, font);
      return {
        source,
        ext: fontType,
      };
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
          if (resolvedConfig.command === "serve") {
            compressFont(font, true);
            return `export default "${normalizePath(relative(root, font.tempPath!))}";`;
          } else {
            compressFont(font, false);
            const hashname = font.underPublicDir ? `${font.filename}${font.outputExtname}` : normalizePath(join(resolvedConfig.build.assetsDir, `${font.filename}-${font.hash.slice(0, 8)}${font.outputExtname}`));
            const assetId = this.emitFile({
              type: "asset",
              fileName: hashname,
              source: font.compressedSource,
            });
            font.build = {
              hashname,
              assetId,
            };
            return `export default "__VITE_ASSET__${assetId}__"`;
          }
        }
      }
    },
    transform(code, id) {
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
          if (resolvedConfig.command === "serve") {
            const relativePath = relative(dirname(id), font.tempPath!);
            s.replace(url, relativePath);
          } else {
            const newUrl = `/${relative(root, font.build!.hashname)}`;
            s.replace(url, newUrl);
          }
          return {
            code: s.toString(),
            map: (sourceMap ?? resolvedConfig.css.devSourcemap)
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
    closeBundle() {
      fontAssets.filter(font => font.underPublicDir).forEach((font) => {
        const { root, build } = resolvedConfig;
        const { outDir } = build;
        const outputDir = resolve(root, outDir);
        fs.removeSync(resolve(outputDir, `${font.filename}${font.extname}`));
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
