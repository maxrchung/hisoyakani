import { vec2 } from "gl-matrix";
import ScaleCommand from "./commands/scaleCommand";
import FadeCommand from "./commands/fadeCommand";
import RotateCommand from "./commands/rotateCommand";
import { formatNumber } from "../common";
import Easing from "./easing";
import { replaceVariables } from "../variables";

export default class Sprite {
  commands: (ScaleCommand | RotateCommand | FadeCommand)[] = [];

  constructor(public file: string, public position: vec2) {}

  scale(
    easing: Easing,
    start: number,
    end: number,
    startScale: vec2,
    endScale: vec2
  ) {
    this.commands.push(
      new ScaleCommand(easing, start, end, startScale, endScale)
    );
  }

  rotate(
    easing: Easing,
    start: number,
    end: number,
    startRotate: number,
    endRotate: number
  ) {
    this.commands.push(
      new RotateCommand(easing, start, end, startRotate, endRotate)
    );
  }

  fade(
    easing: Easing,
    start: number,
    end: number,
    startFade: number,
    endFade: number
  ) {
    this.commands.push(new FadeCommand(easing, start, end, startFade, endFade));
  }

  write(builder: string[], variables: {} = {}) {
    const x = formatNumber(this.position[0], 1);
    const y = formatNumber(this.position[1], 1);
    const line = `4,0,0,${this.file},${x},${y}`;
    const replaced = replaceVariables(line);
    builder.push(replaced);

    for (const command of this.commands) {
      const line = command.write();
      const replaced = replaceVariables(line);
      builder.push(replaced);
    }
  }
}
