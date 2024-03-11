import { describe, expect, it } from "vitest";
import { matchFontFace, matchUrl } from "../src/match";

const cssWithSingleFontFace = `a {
  text-decoration: none;
}

@font-face {
  src: url(./biantaoti.woff) url("./Caveat[wght].ttf");
}
`;

const cssWithMultipleFontFaces = `a {
  text-decoration: none;
}

@font-face {
  src: url("./Caveat[wght].ttf");
}

@font-face {
  src: url(./biantaoti.woff);
}
`;

const cssWithRepeatedUrl = `a {
  text-decoration: none;
}

@font-face {
  src: url("./biantaoti.woff");
}

@font-face {
  src: url(./biantaoti.woff) url("./Caveat[wght].ttf") url("./biantaoti.woff");
}
`;

const ts = "import Biantaoti from \"./biantaoti.woff\";\n"
+ "const fontFace = `@font-face {\n"
+ "  font-family: BTT2;\n"
// eslint-disable-next-line no-template-curly-in-string
+ "  src: url(\"${Biantaoti}\");\n"
+ "}`;\n\n"
+ "const fontFace2 = `@font-face {\n"
+ "  font-family: BTT2;\n"
+ "  src: url(\"./biantaoti.woff\");\n"
+ "}`;";

describe("match font face", () => {
  it("should match font face from css", () => {
    const fontFaces = matchFontFace(cssWithMultipleFontFaces);
    expect(fontFaces).toEqual([`@font-face {
  src: url("./Caveat[wght].ttf");
}`, `@font-face {
  src: url(./biantaoti.woff);
}`]);
  });

  it.skip("should match font face from js/ts code", () => {
    const fontFaces = matchFontFace(ts);
    expect(fontFaces).toEqual([`@font-face {
  src: url("./biantaoti.woff");
}`]);
  });
});

describe("match url", () => {
  it("should match url from single font face in css", () => {
    const fontFaces = matchFontFace(cssWithSingleFontFace);
    const urls = fontFaces?.map(ff => matchUrl(ff)).filter(u => !!u).flat();
    expect(urls).toEqual(["./biantaoti.woff", "./Caveat[wght].ttf"]);
  });

  it("should match url from multiple font face in css", () => {
    const fontFaces = matchFontFace(cssWithMultipleFontFaces);
    const urls = fontFaces?.map(ff => matchUrl(ff)).filter(u => !!u).flat();
    expect(urls).toEqual(["./Caveat[wght].ttf", "./biantaoti.woff"]);
  });

  it("should filter repeated url from the same font face in css", () => {
    const fontFaces = matchFontFace(cssWithRepeatedUrl);
    const urls = fontFaces?.map(ff => matchUrl(ff)).filter(u => !!u).flat();
    expect(urls).toEqual(["./biantaoti.woff", "./biantaoti.woff", "./Caveat[wght].ttf"]);
  });

  it.skip("should not match url from ts/js code", () => {
    const fontFaces = matchFontFace(ts);
    const urls = fontFaces?.map(ff => matchUrl(ff)).filter(u => !!u).flat();
    expect(urls).toBe(undefined);
  });
});
