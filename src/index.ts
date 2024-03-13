import { basename, extname, isAbsolute, resolve } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import { type Logger, type Plugin, type ResolveFn, type ResolvedConfig, createLogger, normalizePath } from "vite";
import type { Font as FCFont } from "font-carrier";
import fontCarrier from "font-carrier";
import { bold, lightBlue, lightGreen, lightRed, lightYellow } from "kolorist";
import { version } from "../package.json";
import { matchFontFace, matchUrl } from "./match";
import { assert, getFileHash, resolvePath } from "./utils";
import type { CompressFont, FontCarrierOptions, FontInfo, OutputAsset } from "./types";
import { JS_EXT, LOG_PREFIX } from "./const";

const FontCarrier: (options: FontCarrierOptions) => Plugin = (options) => {
  let { root, fonts, type, logLevel, clearScreen } = options;

  let fontList: CompressFont[] = [];

  const fontCollection: FontInfo[] = [];

  let resolvedConfig: ResolvedConfig;
  let resolver: ResolveFn;
  let logger: Logger;

  async function resolveFontList() {
    const fontList = [];
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
      fontList.push({
        path,
        input: font.input,
        type: font.type || type || "woff2",
        matched: false,
        underPublicDir,
      });
    }
    return fontList;
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

  function collectFont(path: string, font: CompressFont) {
    const fontItem = fontCollection.find(fc => fc.path === path);
    if (fontItem) {
      return;
    }
    const hash = getFileHash(path);
    if (!hash) {
      logger.error(`\n${lightRed(LOG_PREFIX)} ${basename(path)} not found!`);
      return;
    }
    const fc: FontInfo = {
      path,
      filename: basename(path),
      hash,
      hashname: "",
      input: font.input,
      type: font.type,
      compressed: false,
      underPublicDir: font.underPublicDir,
    };
    fontCollection.push(fc);
    return fontCollection;
  }

  function matchFontBundle(bundle: OutputAsset) {
    if (bundle.source instanceof Uint8Array) {
      // Same filename files
      const filteredFonts = fontCollection.filter(fc => fc.filename === bundle.name);
      if (filteredFonts.length) {
        const hash = getFileHash(bundle.source)!;
        const matchedFont = filteredFonts.find(fc => fc.hash === hash);
        if (matchedFont) {
          matchedFont.hashname = bundle.fileName;
          matchedFont.linkedBundle = bundle;
          return matchedFont;
        }
      }
    }
  }

  function compressFont(font: FontInfo) {
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
      resolver = resolvedConfig.createResolver();
      logger = logLevel ? createLogger(logLevel, { allowClearScreen: clearScreen }) : config.logger;
      root = root || resolvedConfig.root;
      fontList = await resolveFontList();
    },
    transform: {
      order: "pre",
      async handler(code, id, options) {
        id = normalizePath(id);
        // Only collect fonts in fontList
        const ext = extname(id);
        if (JS_EXT.includes(ext)) {
          return;
        }
        const font = fontList.find(font => font.path === id);
        if (font) {
          collectFont(font.path, font);
        }
        const urls = extractFontUrls(code);
        const paths = (await Promise.all(urls.map(url => resolvePath({
          id: url,
          importer: id,
          publicDir: resolvedConfig.publicDir,
          root: resolvedConfig.root,
          resolver,
          ssr: options?.ssr,
        })))).map(({ path }) => path);
        paths.forEach((path) => {
          const fontItem = fontList.find(font => font.path === path);
          if (fontItem) {
            collectFont(path, fontItem);
          }
        });
      },
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
      fontCollection.filter(fc => fc.underPublicDir).forEach((fc) => {
        assert(!fc.compressed, "Font under public dir should not be compressed");
        const copyPublicDir = resolvedConfig.build.copyPublicDir;
        if (copyPublicDir) {
          const { root, build } = resolvedConfig;
          const { outDir } = build;
          const outputDir = resolve(root, outDir);
          const buffer = readFileSync(fc.path);
          const compressed = compress(buffer, fc);
          writeFileSync(resolve(outputDir, fc.filename), compressed);
          fc.compressed = true;
        }
      });
      const compressed = fontCollection.filter(fc => fc.compressed).map(fc => fc.filename);
      const notCompressed = fontCollection.filter(fc => !fc.compressed).map(fc => fc.filename);
      logger.info(`${lightBlue(LOG_PREFIX)}${compressed.length ? ` ${lightGreen(bold(compressed.join(", ")))} compressed.` : ""}${notCompressed.length ? ` ${lightYellow(bold(notCompressed.join(", ")))} not compressed because of unused.` : ""}`);
    },
  };
};

export default FontCarrier;
