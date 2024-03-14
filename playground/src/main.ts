import "./style.css";
import Caveat from "/Caveat[wght].ttf";
import BianTaoti from "./assets/biantaoti.woff";

async function loadCaveat() {
  const font = new FontFace("custom-font", `url("${Caveat}")`);
  await font.load();
  document.fonts.add(font);
}

async function loadBiantaoti() {
  const font = new FontFace("biantaoti-inline", `url("${BianTaoti}")`);
  await font.load();
  document.fonts.add(font);
}

loadCaveat();
loadBiantaoti();

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
    <h1>vite-plugin-font-carrier</h1>
    <p style="font-family: Biantaoti;">Lorem Ipsum，也称乱数假文或者哑元文本， 是印刷及排版领域所常用的虚拟文字。由于曾经一台匿名的打印机刻意打乱了一盒印刷字体从而造出一本字体样品书，Lorem Ipsum从西元15世纪起就被作为此领域的标准文本使用。</p>
    <p style="font-family: custom-font;">0123456789</p>
    <p style="font-family: biantaoti-inline;">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc tincidunt vulputate massa, id feugiat turpis sagittis eu. Curabitur convallis lectus quis metus tempus, at pharetra nibh maximus. Aliquam eget leo efficitur purus rutrum sollicitudin non vitae velit. Duis dui nisl, gravida ut volutpat id, auctor feugiat urna. Mauris vulputate consectetur nulla ac pretium.</p>
  </div>
`;
