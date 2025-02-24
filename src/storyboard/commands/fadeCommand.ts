import { formatNumber, isNumberEqual } from "../../common";
import Easing from "../easing";

export default class FadeCommand {
  constructor(
    public easing: Easing,
    public start: number,
    public end: number,
    public startFade: number,
    public endFade: number
  ) {}

  write() {
    const easing = this.easing;
    const start = Math.round(this.start);
    const end = isNumberEqual(this.end, this.start) ? "" : Math.round(this.end);
    const startFade = formatNumber(this.startFade);
    const endFade = isNumberEqual(this.endFade, this.startFade)
      ? ""
      : `,${formatNumber(this.endFade)}`;
    const command = ` F,${easing},${start},${end},${startFade}${endFade}`;

    return command;
  }
}
