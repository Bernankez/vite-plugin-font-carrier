import { type PluginOption } from "vite";
import { version } from "../package.json";
import { matchFontFace, matchUrl } from "./match";

export interface FontCarrierOptions {
  fonts: Font[];
  cwd?: string;
}

export interface Font {
  url: string;
  input: string;
}

export const FontCarrier: (options: FontCarrierOptions) => PluginOption = (options) => {
  const { cwd = process.cwd(), fonts } = options;

  // const fontPath = resolve(cwd, path);

  // if (!output) {
  // output = fontPath;
  // }

  // const font = fontCarrier.transfer(fontPath);

  // console.log(font.getFontface().options);

  // font.min("中文135");

  // const res = font.output({
  // path: output.split(".").slice(0, -1).join("."),
  // types: ["woff2"],
  // });

  // console.log(res);

  // const fontMap = new Map<string, FontFaceParsedInfo>();

  // css file url => Fonts
  const fontMap = new Map<string, {
    url: string; // includes filename
    filename: string;
    hashname: string;
  }[]>();

  return {
    name: "vite-plugin-font-carrier",
    version,
    enforce: "pre",
    transform(code, id) {
      const fontFaces = matchFontFace(code);
      if (!fontFaces) {
        return;
      }
      const urls = fontFaces.map(fc => matchUrl(fc)).flat().filter(url => url) as string[];
      if (!urls) {
        return;
      }
      console.log(fontMap);
    },
    generateBundle: {
      order: "pre",
      handler(outputOptions, bundle, isWrite) {
      // console.log(outputOptions);
        console.log(Object.values(bundle).map((v) => {
          if (v.type === "asset") {
            // console.log(v);
            // console.log(v.fileName);
          } else {
            // console.log(v);
            // console.log(v.viteMetadata);
          }
          return v.fileName;
        }));
      // console.log(Object.values(bundle).map(v => v.fileName));
      },
    },
  };
};
