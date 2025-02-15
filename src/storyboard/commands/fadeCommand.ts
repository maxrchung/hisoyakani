import { formatNumber, isNumberEqual } from "../../common";

export default class FadeCommand {
  constructor(
    public start: number,
    public end: number,
    public startFade: number,
    public endFade: number
  ) {}

  write() {
    const start = this.start;
    const end = this.end === this.start ? "" : this.end;
    const startFade = formatNumber(this.startFade);
    const endFade = isNumberEqual(this.endFade, this.startFade)
      ? ""
      : `,${formatNumber(this.endFade)}`;
    const command = ` F,0,${start},${end},${startFade}${endFade}`;

    return command;
  }
}
