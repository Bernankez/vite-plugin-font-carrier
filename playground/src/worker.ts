/// <reference lib="WebWorker" />

import Biantaoti from "@/assets/biantaoti.woff";

async function loadFont() {
  const response = await fetch(Biantaoti);
  const blob = await response.blob();
  const buffer = await blob.arrayBuffer();
  const font = new FontFace("Biantaoti", buffer);
  await font.load();
  globalThis.fonts.add(font);
}

globalThis.addEventListener("message", (event) => {
  if (event.data === "load") {
    loadFont();
  }
});
