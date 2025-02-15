import { vec2 } from "gl-matrix";

export default class ScaleCommand {
  constructor(public start: number, public end: number, public scale: vec2) {}
}
