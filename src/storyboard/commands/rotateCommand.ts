import { formatNumber, isNumberEqual } from "../../common";

export default class RotateCommand {
  constructor(
    public start: number,
    public end: number,
    public startRotate: number,
    public endRotate: number
  ) {}

  write() {
    const start = Math.round(this.start);
    const end = isNumberEqual(this.end, this.start) ? "" : Math.round(this.end);
    const startRotate = formatNumber(this.startRotate);
    const endRotate = isNumberEqual(this.endRotate, this.startRotate)
      ? ""
      : `,${formatNumber(this.endRotate)}`;
    const command = ` R,0,${start},${end},${startRotate}${endRotate}`;

    return command;
  }
}
