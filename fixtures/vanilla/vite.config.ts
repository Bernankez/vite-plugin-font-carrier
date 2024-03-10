import { defineConfig } from "vite";
import Inspect from "vite-plugin-inspect";
import { FontCarrier } from "../../src";

export default defineConfig(() => {
  return {
    plugins: [
      FontCarrier({
        fonts: [{
          url: "./src/assets/fonts/biantaoti.woff",
          input: "中文",
        },
        ],
      }),
      Inspect(),
    ],
  };
});
