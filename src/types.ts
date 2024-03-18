import { type IndexHtmlTransformContext, type LogLevel } from "vite";
import type { Font as FC } from "font-carrier";

export interface FontCarrierOptions {
  fonts: Font[];
  root?: string;
  type?: FC.FontType;
  logLevel?: LogLevel;
  clearScreen?: boolean;
  sourceMap?: boolean;
  /** Custom compress function */
  compressFn?: (source: Buffer, font: Required<Font>) => CompressFnReturn["source"] | CompressFnReturn;
}

export interface CompressFnReturn {
  source: Buffer;
  /** Extension name, eg."woff" */
  ext?: string;
}

export interface Font {
  path: string;
  input: string;
  type?: FC.FontType;
}

type OutputBundle = Exclude<IndexHtmlTransformContext["bundle"], undefined>;

type OutputAssetType<T> = T extends { type: "asset" } ? T : never;
export type OutputAsset = OutputAssetType<OutputBundle[keyof OutputBundle]>;

export interface FontAsset {
  originOptions: Font;
  /** Font file absolute path */
  path: string;
  /** File name */
  filename: string;
  /** File extension */
  extname: string;
  /** Output extension */
  outputExtname: string;
  /** Output font type */
  type: FC.FontType;
  input: string;
  /** Source file hash */
  hash: string;
  /** Has compressed */
  compressed: boolean;
  compressedSource?: Buffer;
  /** Temp path for compressed fonts */
  tempPath?: string;
  underPublicDir: boolean;
  hashname?: string;
  assetId?: string;
}
