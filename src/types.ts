import { type IndexHtmlTransformContext, type LogLevel } from "vite";
import type { Font as FC } from "font-carrier";

export interface FontCarrierOptions {
  fonts: Font[];
  root?: string;
  type?: FC.FontType;
  logLevel?: LogLevel;
  clearScreen?: boolean;
  sourceMap?: boolean;
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
  /** Absolute path */
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
  build?: {
    hashname: string;
    linkedBundle: OutputAsset;
  };
}
