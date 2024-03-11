import { basename, resolve } from "node:path";
import { type IndexHtmlTransformContext, type LogLevel, type Logger, type PluginOption, type ResolveFn, type ResolvedConfig, createLogger } from "vite";
import type { Font as FCFont } from "font-carrier";
import fontCarrier from "font-carrier";
import { bold, green, yellow } from "kolorist";
import { version } from "../package.json";
import { matchFontFace, matchUrl } from "./match";
import { getFileHash, resolvePath } from "./utils";

export interface FontCarrierOptions {
  fonts: Font[];
  cwd?: string;
  type?: FCFont.FontType;
  logLevel?: LogLevel;
  clearScreen?: boolean;
}

export interface Font {
  path: string;
  input: string;
  type?: FCFont.FontType;
}

type OutputBundle = Exclude<IndexHtmlTransformContext["bundle"], undefined>;

type OutputAssetType<T> = T extends { type: "asset" } ? T : never;
type OutputAsset = OutputAssetType<OutputBundle[keyof OutputBundle]>;

interface FontInfo {
  /** Absolute path */
  path: string;
  /** File base name */
  filename: string;
  hash: string;
  hashname: string;
  input: string;
  /** Has compressed */
  compressed: boolean;
  linkedBundle?: OutputAsset;
  /** Output font type */
  type: FCFont.FontType;
}

export const FontCarrier: (options: FontCarrierOptions) => PluginOption = (options) => {
  const { cwd = process.cwd(), fonts, type, logLevel, clearScreen } = options;

  const DEFAULT_FONT_TYPE: FCFont.FontType = "woff2";
  const PUBLIC_DIR = resolve(cwd, "public");
  const LOG_PREFIX = "[vite-plugin-font-carrier]";

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
        // TODO normalize path?
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
        const urls = fontFaces.map(fc => matchUrl(fc)).flat().filter(url => url) as string[];
        if (!urls) {
          return;
        }
        for (const url of urls) {
          const path = await resolvePath({
            id: url,
            importer: id,
            publicDir: PUBLIC_DIR,
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
          }
        }
      },
    },
    generateBundle(outputOptions, outputBundle, isWrite) {
      // Output a newline character
      logger.info("");
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
                logger.info(`${bold(green(LOG_PREFIX))} ${bold(font.filename)} compressed.`);
              }
            }
          });
        }
      });
      const names = fontList.filter(font => !font.matched).map(font => basename(font.path));
      if (names.length) {
        logger.warn(`${bold(yellow(LOG_PREFIX))} ${bold(names.join(", "))} mistached.`);
      }
    },
  };
};
