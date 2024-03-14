import type { Font as FC } from "font-carrier";
import { bold } from "kolorist";

export const JS_EXT = [".js", ".ts", ".jsx", ".tsx", ".mjs", ".mts", ".cjs", ".cts"];
export const DEFAULT_FONT_TYPE: FC.FontType = "woff2";
export const LOG_PREFIX = bold("[vite-plugin-font-carrier]");

export const FONT_FACE_REG = /@font-face\s*{[^}]*}/g;
export const FONT_FACE_URL_REG = /url\((['"]?)(.*?)\1\)/g;
