import { formatNumber, isNumberEqual } from "../../common";
import Easing from "../easing";

export default class RotateCommand {
  constructor(
    public easing: Easing,
    public start: number,
    public end: number,
    public startRotate: number,
    public endRotate: number
  ) {}

  write() {
    const easing = this.easing;
    const start = this.start;
    const end = this.end === this.start ? "" : this.end;
    const startRotate = formatNumber(this.startRotate);
    const endRotate = isNumberEqual(this.endRotate, this.startRotate)
      ? ""
      : `,${formatNumber(this.endRotate)}`;
    const command = ` R,${easing},${start},${end},${startRotate}${endRotate}`;

    return command;
  }
}
