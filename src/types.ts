import { type IndexHtmlTransformContext, type LogLevel } from "vite";
import type { Font as FCFont } from "font-carrier";

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
export type OutputAsset = OutputAssetType<OutputBundle[keyof OutputBundle]>;

export interface FontInfo {
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
