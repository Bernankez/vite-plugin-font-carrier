import { defineConfig } from "vite";
import Inspect from "vite-plugin-inspect";
import { FontCarrier } from "../src";

export default defineConfig(() => {
  return {
    plugins: [
      FontCarrier(),
      Inspect(),
    ],
  };
});
