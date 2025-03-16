import { vec2 } from "gl-matrix";
import ScaleCommand from "./commands/scaleCommand";
import FadeCommand from "./commands/fadeCommand";
import RotateCommand from "./commands/rotateCommand";
import { formatNumber } from "../common";

export default class Sprite {
  commands: (ScaleCommand | RotateCommand | FadeCommand)[] = [];

  constructor(public file: string, public position: vec2) {}

  scale(start: number, end: number, startScale: vec2, endScale: vec2) {
    this.commands.push(new ScaleCommand(start, end, startScale, endScale));
  }

  rotate(start: number, end: number, startRotate: number, endRotate: number) {
    this.commands.push(new RotateCommand(start, end, startRotate, endRotate));
  }

  fade(start: number, end: number, startFade: number, endFade: number) {
    this.commands.push(new FadeCommand(start, end, startFade, endFade));
  }

  write(builder: string[], variables: {}) {
    function replaceVariables(line: string) {
      let replaced = line;
      for (const key in variables) {
        const variable = key;
        const value = variables[key];
        replaced = replaced.replace(value, variable);
      }

      return replaced;
    }

    const x = formatNumber(this.position[0], 0);
    const y = formatNumber(this.position[1], 0);
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
