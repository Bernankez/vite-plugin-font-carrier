import { defineConfig } from "vite";
import Inspect from "vite-plugin-inspect";
import FontCarrier from "vite-plugin-font-carrier";

export default defineConfig(() => {
  return {
    plugins: [
      FontCarrier({
        fonts: [
          {
            path: "./src/assets/biantaoti.woff",
            input: "乱数假文Ipsum",
          },
          {
            path: "/Caveat[wght].ttf",
            input: "Cole52619",
          },
        ],
      }),
      Inspect(),
    ],
  };
});
