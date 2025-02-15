import { vec2 } from "gl-matrix";
import Sprite from "./sprite";

export default class Storyboard {
  sprites: Sprite[] = [];

  sprite(file: string, position: vec2) {
    const sprite_ = new Sprite(file, position);
    this.sprites.push(sprite_);
    return sprite_;
  }

  write(path: string) {
    const output = ["[Events]"];
  }
}
