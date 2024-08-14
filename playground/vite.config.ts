import { resolve } from "node:path";
import { defineConfig } from "vite";
import Inspect from "vite-plugin-inspect";
import FontCarrier from "vite-plugin-font-carrier";

export default defineConfig(() => {
  const fontCarrier = FontCarrier({
    fonts: [
      {
        path: "./src/assets/biantaoti.woff",
        input: "乱数假文Ipsum",
      },
      {
        path: "./src/assets/biantaoti-alias.woff",
        input: "乱数假文Ipsum",
      },
      {
        path: "/Caveat[wght].ttf",
        input: "Cole52619",
      },
    ],
  });

  return {
    plugins: [
      fontCarrier,
      Inspect(),
    ],
    worker: {
      plugins: () => [
        fontCarrier,
      ],
    },
    resolve: {
      alias: {
        "@": resolve(__dirname, "src"),
      },
    },
  };
});
