import kaplay from "kaplay";
import outfitUrl from "./assets/Outfit-Bold.ttf?url";
import { createStorage } from "./game/storage.js";
import { registerGame } from "./scenes/game.js";
import { registerHelp } from "./scenes/help.js";
import { registerMenu } from "./scenes/menu.js";
import { registerOver } from "./scenes/over.js";
import { FONT, H, W } from "./ui/layout.js";
import { DEFAULT_THEME, THEMES, createTheme } from "./ui/theme.js";
import { createWidgets } from "./ui/widgets.js";

const store = createStorage();
const startingTheme = THEMES[store.readTheme()] ? store.readTheme() : DEFAULT_THEME;

const k = kaplay({
  global: false,
  width: W,
  height: H,
  letterbox: true,
  // `crisp` sets image-rendering:pixelated, so every scaled edge came out
  // stair-stepped. This design is circles, haloes and text — it wants smoothing.
  crisp: false,
  // Render at the device's real density (capped so a 4x panel does not cost
  // 16x the fill rate). Capping at 2 on a 3x phone was upscaling the whole
  // frame, which is what testers saw as "pixelated".
  pixelDensity: Math.min(window.devicePixelRatio || 1, 3),
  background: THEMES[startingTheme].bg,
  font: "sans-serif",
  touchToMouse: true,
});

k.loadFont(FONT, outfitUrl, { filter: "linear" });

const theme = createTheme(k, startingTheme);
const ctx = { theme, widgets: createWidgets(k, theme), store };

registerMenu(k, ctx);
registerHelp(k, ctx);
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
