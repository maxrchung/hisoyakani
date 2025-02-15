import { vec2 } from "gl-matrix";
import ScaleCommand from "./scaleCommand";
import FadeCommand from "./fadeCommand";
import RotateCommand from "./rotateCommand";

export default class Sprite {
  commands: (ScaleCommand | RotateCommand | FadeCommand)[] = [];

  constructor(public file: string, public position: vec2) {}

  scale(start: number, end: number, scale: vec2) {
    this.commands.push(new ScaleCommand(start, end, scale));
  }

  rotate(start: number, end: number, rotate: number) {
    this.commands.push(new RotateCommand(start, end, rotate));
  }

  fade(start: number, end: number, fade: number) {
    this.commands.push(new FadeCommand(start, end, fade));
  }
}
