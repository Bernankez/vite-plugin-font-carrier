# vite-plugin-font-carrier

Compress fonts using [font-carrier](https://github.com/purplebamboo/font-carrier).

## Install

```sh
npm install -D vite-plugin-font-carrier
```

## Configuration

vite.config.ts

```ts
import { defineConfig } from "vite";
import FontCarrier from "vite-plugin-font-carrier";

export default defineConfig({
  plugins: [FontCarrier({
    /** fonts you want to compress */
    fonts: [
      {
        path: "./path/to/your/font/my-font.woff",
        /** characters to be retained */
        input: "Cole52619"
      }
    ],
    /** output type */
    type: "woff2"
  })]
});
```