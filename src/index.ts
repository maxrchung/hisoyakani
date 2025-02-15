import Storyboard from "./storyboard";
import backgroundPart from "./parts/backgroundPart";
import trianglesPart from "./parts/trianglesPart";

const storyboard = new Storyboard();

backgroundPart(storyboard);
trianglesPart(storyboard);

const path =
  "C:\\Users\\Max\\AppData\\Local\\osu!\\Songs\\beatmap-638752487828044626-h\\swag - swag (S2VX).osb";
storyboard.write(path);
