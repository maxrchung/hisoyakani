import { vec2 } from "gl-matrix";

export const Constants = {
  FRAME_RATE: 30,
  FRAME_DELTA: 10,
  UNIT_X: vec2.fromValues(1, 0),
  TRIANGLE_SIZE: 100,
  SCREEN_SIZE: vec2.fromValues(854, 480),
};

export const formatNumber = (number: number) => {
  const formatted = number.toLocaleString("", { maximumFractionDigits: 2 });
  return formatted;
};

export const isNumberEqual = (A: number, B: number) =>
  Math.abs(A - B) > Number.EPSILON;
