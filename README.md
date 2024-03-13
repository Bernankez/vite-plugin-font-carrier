# vite-plugin-font-carrier

[![npm](https://img.shields.io/npm/v/vite-plugin-font-carrier?color=red&label=npm)](https://www.npmjs.com/package/vite-plugin-font-carrier)
[![CI](https://github.com/Bernankez/vite-plugin-font-carrier/workflows/CI/badge.svg)](https://github.com/Bernankez/vite-plugin-font-carrier/actions)
[![LICENSE](https://shields.io/github/license/Bernankez/vite-plugin-font-carrier)](https://github.com/Bernankez/vite-plugin-font-carrier/blob/master/LICENSE)

A vite plugin to compress fonts using [font-carrier](https://github.com/purplebamboo/font-carrier). It will only retain the characters you set to achieve minimize.

## Install

```sh
npm install -D vite-plugin-font-carrier
```

## Usage

vite.config.ts

```ts
import { defineConfig } from "vite";
import FontCarrier from "vite-plugin-font-carrier";

export default defineConfig({
  plugins: [FontCarrier({
    /** Fonts to be compressed */
    fonts: [
      {
        path: "./path/to/your/font/my-font.woff",
        /** Characters to be retained */
        input: "Cole52619"
      },
      {
        path: "/font-under-public.ttf",
        input: "乱数假文Ipsum"
      }
    ],
    /** Output type */
    type: "woff2"
  })]
});
```

### Preview

#### During dev

![](https://github.com/Bernankez/vite-plugin-font-carrier/assets/23058788/3bf5d553-859c-48f7-b888-7e99681ced29)

#### After build

![](https://github.com/Bernankez/vite-plugin-font-carrier/assets/23058788/3fa0f9c9-38d9-4745-b1ea-8efbdba31a6f)

## Options

```ts
import type { Font as FCFont } from "font-carrier";
import { type LogLevel } from "vite";

export interface FontCarrierOptions {
  /** Fonts to be compressed */
  fonts: Font[];
  /**
   * Specify root directory
   * Defaults to `root` in Vite config
   */
  root?: string;
  /**
   * Output font type
   * Defaults to 'woff2'
   */
  type?: FCFont.FontType;
  /**
   * Logging level
   * Defaults to `logLevel` in Vite config
   * @see https://vitejs.dev/config/shared-options.html#loglevel
   */
  logLevel?: LogLevel;
  /**
   * Defaults to `clearScreen` in Vite config
   * @see https://vitejs.dev/config/shared-options.html#loglevel
   */
  clearScreen?: boolean;
}

export interface Font {
  /** path to your font file */
  path: string;
  /** Specify the characters you want to retain */
  input: string;
  /** Output font type, will cover the output type in `FontCarrierOptions` */
  type?: FCFont.FontType;
}
```
