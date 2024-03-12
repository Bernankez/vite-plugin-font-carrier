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

describe("matchFontFace", () => {
  it("should match font face from css", () => {
    const fontFaces = matchFontFace(cssWithMultipleFontFaces);
    expect(fontFaces).toEqual([`@font-face {
  src: url("./Caveat[wght].ttf");
}`, `@font-face {
  src: url(./biantaoti.woff);
}`]);
  });
});

describe("matchUrl", () => {
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
});
