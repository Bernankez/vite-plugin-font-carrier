import { defineConfig } from "vite";
import Inspect from "vite-plugin-inspect";
import { FontCarrier } from "../../src";

export default defineConfig(() => {
  return {
    plugins: [
      FontCarrier({
        fonts: [
          {
            path: "./src/assets/fonts/biantaoti.woff",
            input: "中文",
          },
          {
            path: "./src/assets/fonts/biantaoti2.woff",
            input: "中文",
          },
        ],
      }),
      Inspect(),
    ],
    resolve: {
      alias: {
        "@": "./src",
      },
    },
  };
});
