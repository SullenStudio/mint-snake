import kaplay from "kaplay";
import outfitUrl from "./assets/Outfit-Bold.ttf?url";
import { createStorage } from "./game/storage.js";
import { registerGame } from "./scenes/game.js";
import { registerMenu } from "./scenes/menu.js";
import { registerOver } from "./scenes/over.js";
import { FONT, H, W } from "./ui/layout.js";
import { PALETTE, createTheme } from "./ui/theme.js";
import { createWidgets } from "./ui/widgets.js";

const k = kaplay({
  global: false,
  width: W,
  height: H,
  letterbox: true,
  crisp: true,
  pixelDensity: Math.min(window.devicePixelRatio || 1, 2),
  background: PALETTE.bg,
  font: "sans-serif",
  touchToMouse: true,
});

k.loadFont(FONT, outfitUrl, { filter: "linear" });

const theme = createTheme(k);
const ctx = {
  theme,
  widgets: createWidgets(k, theme),
  store: createStorage(),
};

registerMenu(k, ctx);
registerGame(k, ctx);
registerOver(k, ctx);

k.onLoad(() => {
  const start = () => k.go("menu");
  if (document.fonts?.ready) {
    document.fonts.ready.then(start, start);
    return;
  }
  start();
});
