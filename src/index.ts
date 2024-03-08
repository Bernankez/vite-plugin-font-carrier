import { resolve } from "node:path";
import { type PluginOption } from "vite";
import fontCarrier from "font-carrier";
import { version } from "../package.json";

export interface FontCarrierOptions {
  path: string;
  output?: string;
  cwd?: string;
}

// function defineStyle(fontPath: string, minWords: string) {
//   function resolve() {
//     const font = load(fontPath);
//     font.min(minWords);
//     const buffer = font.output();
//   }

//   return `
//     @font-face {
//       font-family: "${font.name}";
//       src: url("${fontPath}") format("woff2");
//     }
//   `;
// }

export const FontCarrier: (options?: FontCarrierOptions) => PluginOption = (options) => {
  let { path = "", cwd = process.cwd(), output } = options || {};

  const fontPath = resolve(cwd, path);

  if (!output) {
    output = fontPath;
  }

  const font = fontCarrier.transfer(fontPath);

  // console.log(font.getFontface().options);

  font.min("中文135");

  const res = font.output({
    path: output.split(".").slice(0, -1).join("."),
    types: ["woff2"],
  });

  // console.log(res);

  return {
    name: "font-carrier",
    version,
    enforce: "pre",
    resolveId: {
      // order: "pre",
      handler(id) {
        if (id?.startsWith("virtual:")) {
          console.log(id);
          return `\0${id}`;
        }
        console.log("resolveId", id);
      },
    },
    load: {
      order: "pre",
      handler(id) {
        if (id.startsWith("\0virtual:font-carrier")) {
          return `export function defineStyle(style) {
            console.log(style);
          }`;
        }
        console.log(id, this.getModuleInfo(id));
        console.log("load", id);
      },
    },
    transform: {
      // order: "post",
      handler(code, id) {
        if (id.endsWith(".css")) {
        // console.log(code);
        }
        if (id.includes("main")) {
          console.log(code);
        }
        console.log("transform", id);
      },
    },
    generateBundle: {
      order: "pre",
      handler(options, bundle) {
        console.log("bundle", Object.values(bundle).map(b => b.fileName));
      },
    },
  };
};
