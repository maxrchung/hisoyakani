import { vec2 } from "gl-matrix";
import Storyboard from "./storyboard";

export const Constants = {
  // 1000 / 30 is 33.333333 repeating
  frameRate: 1000 / 30,
  // Because of above, all frame rates need to be in multiples of 3
  frameDelta: 9,
  unitX: vec2.fromValues(1, 0),
  unitY: vec2.fromValues(0, 1),
  triangleSize: 128,
  screenSize: vec2.fromValues(854, 480),
  // 0,0 in OSB coordinates is offset from actual top left spot
  screenOffset: vec2.fromValues(-107, 0),
};

export const formatNumber = (
  number: number,
  // 2 makes sense for rotation and scale, but position can probably get away
  // with just 1 or 0
  maximumFractionDigits: number = 2
) => {
  const formatted = number.toLocaleString(undefined, {
    maximumFractionDigits,
  });

  return formatted;
};

export const isNumberEqual = (A: number, B: number) =>
  Math.abs(A - B) < Number.EPSILON;

// Converts 0,0 bottom left camera position to storyboard position
export const convertPosition = (position: vec2) => {
  // Reverse y direction so it is from top left
  const converted = vec2.fromValues(position[0], 1 - position[1]);
  // Scale from normalized coordinates to screen coordinates
  vec2.multiply(converted, converted, Constants.screenSize);
  // Adds offset
  vec2.add(converted, converted, Constants.screenOffset);

  return converted;
};

export const angleFrom = (A: vec2, B: vec2) => {
  const cross = A[0] * B[1] - A[1] * B[0];
  const dot = vec2.dot(A, B);
  const rotation = Math.atan2(cross, dot);

  return rotation;
};

export const createDebugPoint = (position: vec2, storyboard: Storyboard) => {
  const sprite = storyboard.sprite(
    "b",
    vec2.fromValues(position[0] - 5, position[1] - 5)
  );
  sprite.scale(0, 999999, vec2.fromValues(10, 10), vec2.fromValues(10, 10));
};
