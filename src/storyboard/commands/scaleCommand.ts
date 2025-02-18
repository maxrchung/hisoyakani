import { vec2 } from "gl-matrix";
import { formatNumber } from "../../common";
import Easing from "../easing";

export default class ScaleCommand {
  constructor(
    public easing: Easing,
    public start: number,
    public end: number,
    public startScale: vec2,
    public endScale: vec2
  ) {}

  write() {
    const easing = this.easing;
    const start = this.start;
    const end = this.end === this.start ? "" : this.end;
    const startScale = `${formatNumber(this.startScale[0])},${formatNumber(
      this.startScale[1]
    )}`;

    const endScale = vec2.equals(this.startScale, this.endScale)
      ? ""
      : `,${formatNumber(this.endScale[0])},${formatNumber(this.endScale[1])}`;
    const command = ` V,${easing},${start},${end},${startScale}${endScale}`;

    return command;
  }
}
