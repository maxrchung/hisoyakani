import Storyboard from "./storyboard";
import backgroundEffect from "./effects/backgroundEffect";
import triangleEffect from "./effects/triangleEffect";
import smokeEffect from "./effects/smokeEffect";
import endEffect from "./effects/endEffect";

const storyboard = new Storyboard();

// backgroundEffect(storyboard);
triangleEffect(storyboard);
// smokeEffect(storyboard);
endEffect(storyboard);

const path =
  "C:\\Users\\Max\\AppData\\Local\\osu!\\Songs\\beatmap-638752487828044626-h\\swag - swag (S2VX).osb";
storyboard.write(path);
