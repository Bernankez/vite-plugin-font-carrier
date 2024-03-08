import { type PluginOption } from "vite";
import { version } from "../package.json";

export interface FontFaceOptions {
  fontFamily: string;
  src: string;
  fontWeight?: string | number;
  fontStyle?: string;
  unicodeRange?: string;
  fontStretch?: string;
  input: string | string[];
}

export interface FontFaceParsedInfo {
  id: string;
}

export const FontCarrier: () => PluginOption = () => {
  // let { path = "", cwd = process.cwd(), output } = options || {};

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

  const fontMap = new Map<string, FontFaceParsedInfo>();

  return {
    name: "vite-plugin-font-carrier",
    version,
    // load: {
    //   order: "pre",
    //   handler(id) {
    //     if (id.startsWith("\0virtual:font-carrier")) {
    //       return `export function defineStyle(style) {
    //         console.log(style);
    //       }`;
    //     }
    //     console.log(id, this.getModuleInfo(id));
    //     console.log("load", id);
    //   },
    // },
    // transform: {
    //   // order: "post",
    //   handler(code, id) {
    //     if (id.endsWith(".css")) {
    //     // console.log(code);
    //     }
    //     if (id.includes("main")) {
    //       console.log(code);
    //     }
    //     console.log("transform", id);
    //   },
    // },
    transform(code, id) {

    },
  };
};
