import { vec2 } from "gl-matrix";
import Sprite from "./sprite";
import fs from "fs";

export default class Storyboard {
  sprites: Sprite[] = [];

  sprite(file: string, position: vec2) {
    const sprite = new Sprite(file, position);
    this.sprites.push(sprite);
    return sprite;
  }

  write(path: string) {
    const builder = [
      "[Events]",
      "//Background and Video events",
      "//Storyboard Layer 0 (Background)",
    ];

    for (const sprite of this.sprites) {
      sprite.write(builder);
    }

    builder.push("//Storyboard Layer 1 (Fail)");
    builder.push("//Storyboard Layer 2 (Pass)");
    builder.push("//Storyboard Layer 3 (Foreground)");
    builder.push("//Storyboard Layer 4 (Overlay)");
    builder.push("//Storyboard Sound Samples");

    const output = builder.join("\n");
    fs.writeFileSync(path, output);
  }
}
