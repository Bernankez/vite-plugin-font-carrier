import { basename, extname, resolve } from "node:path";
import { type Logger, type PluginOption, type ResolveFn, type ResolvedConfig, createLogger, normalizePath } from "vite";
import type { Font as FCFont } from "font-carrier";
import fontCarrier from "font-carrier";
import { blue, bold, green, red, yellow } from "kolorist";
import { version } from "../package.json";
import type { FontCarrierOptions } from "../dist";
import { matchFontFace, matchUrl } from "./match";
import { getFileHash, resolvePath } from "./utils";
import type { FontInfo } from "./types";
import { DEFAULT_FONT_TYPE, JS_EXT, LOG_PREFIX } from "./const";

export const FontCarrier: (options: FontCarrierOptions) => PluginOption = (options) => {
  const { cwd = process.cwd(), fonts, type, logLevel, clearScreen } = options;

  const fontList = fonts.map(font => ({
    path: resolve(cwd, font.path),
    input: font.input,
    type: font.type || type || DEFAULT_FONT_TYPE,
    matched: false,
  }));

  const fontCollection: FontInfo[] = [];

  let resolvedConfig: ResolvedConfig;
  let resolver: ResolveFn;
  let logger: Logger;

  return {
    name: "vite-plugin-font-carrier",
    version,
    configResolved(config) {
      resolvedConfig = config;
      resolver = resolvedConfig.createResolver();
      logger = logLevel ? createLogger(logLevel, { allowClearScreen: clearScreen }) : config.logger;
    },
    transform: {
      order: "pre",
      async handler(code, id, options) {
        id = normalizePath(id);
        const ext = extname(id);
        if (JS_EXT.includes(ext)) {
          return;
        }
        const font = fontList.find(font => font.path === id);
        if (font) {
          // Font imported by js/ts file
          const hash = getFileHash(id);
          if (hash) {
            fontCollection.push({
              path: id,
              filename: basename(id),
              hash,
              hashname: "",
              input: font.input,
              compressed: false,
              type: font.type,
            });
            return;
          }
        }
        // Get font url from source code
        const fontFaces = matchFontFace(code);
        if (!fontFaces) {
          return;
        }
        // Each fontFace can have multiple Urls
        // Filter same url
        const urls = fontFaces.map(fc => matchUrl(fc)).flat().filter(url => url).filter((url, index, arr) => arr.indexOf(url) === index) as string[];
        if (!urls) {
          return;
        }
        for (const url of urls) {
          const path = await resolvePath({
            id: url,
            importer: id,
            publicDir: resolvedConfig.publicDir,
            root: resolvedConfig.root,
            resolver,
            ssr: options?.ssr,
          });
          const font = fontCollection.find(font => font.path === path);
          if (font) {
            return;
          }
          const fontListItem = fontList.find(font => font.path === path);
          if (!fontListItem) {
            return;
          }
          const hash = getFileHash(path);
          if (hash) {
            const fc: FontInfo = {
              path,
              filename: basename(path),
              hash,
              hashname: "",
              input: fontListItem.input,
              compressed: false,
              type: fontListItem.type,
            };
            fontCollection.push(fc);
            fontListItem.matched = true;
          } else {
            logger.error(`\n${red(LOG_PREFIX)} ${basename(path)} not found!`);
          }
        }
      },
    },
    generateBundle(outputOptions, outputBundle, isWrite) {
      let logInfo = "";
      const compressed: string[] = [];
      Object.entries(outputBundle).forEach(([filename, bundle]) => {
        if (bundle.type === "asset") {
          // Link font filename and hashname
          if (bundle.source instanceof Uint8Array) {
            const filterFonts = fontCollection.filter(font => font.filename === bundle.name);
            if (filterFonts.length > 0) {
              const assetHash = getFileHash(bundle.source);
              const asset = filterFonts.find(font => font.hash === assetHash);
              if (asset) {
                asset.hashname = bundle.fileName;
                asset.linkedBundle = bundle;
              }
            }
          }
        } else {
          bundle.viteMetadata?.importedAssets.forEach((asset) => {
            const font = fontCollection.find(font => font.hashname === asset);
            if (font) {
              if (!font.compressed && font.linkedBundle) {
                const buffer = Buffer.from(font.linkedBundle.source);
                const fc = fontCarrier.transfer(buffer);
                fc.min(font.input);
                const outputs = fc.output({
                  types: [font.type],
                }) as unknown as { [K in FCFont.FontType]: Buffer };
                font.linkedBundle.source = outputs[font.type];
                font.compressed = true;
                compressed.push(font.filename);
              }
            }
          });
        }
      });
      logInfo += compressed.length ? `Compressed ${compressed.length} ${compressed.length > 1 ? "fonts" : "font"}: ${bold(green(compressed.join(", ")))}` : "";
      const mistached = fontList.filter(font => !font.matched).map(font => basename(font.path));
      logInfo += mistached.length ? `; Mistached ${mistached.length} ${mistached.length > 1 ? "fonts" : "font"}: ${bold(yellow(mistached.join(", ")))}` : "";
      logger.info(`\n${blue(LOG_PREFIX)} ${logInfo}`);
    },
  };
};
