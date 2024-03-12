import { FONT_FACE_REG, FONT_FACE_URL_REG } from "./const";

export function matchFontFace(code: string) {
  if (code.includes("@font-face")) {
    const matches = code.matchAll(FONT_FACE_REG);
    const fontFaces = [...matches].map(([match]) => match);
    return fontFaces;
  }
  return undefined;
}

export function matchUrl(fontFace: string) {
  if (fontFace.includes("url")) {
    const matches = fontFace.matchAll(FONT_FACE_URL_REG);
    const urls = [...matches].map(([, , url]) => url?.replaceAll("\"", "")).filter(url => url);
    return urls.filter((url, index, arr) => arr.indexOf(url) === index);
  }
  return undefined;
}
