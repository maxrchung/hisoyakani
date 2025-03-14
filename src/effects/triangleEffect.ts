import { vec2 } from "gl-matrix";
import {
  angleFrom,
  Constants,
  convertPosition,
  isNumberEqual,
} from "../common";
import Storyboard from "../storyboard";
import RotateCommand from "../storyboard/commands/rotateCommand";
import ScaleCommand from "../storyboard/commands/scaleCommand";
import Sprite from "../storyboard/sprite";
import data from "../../blend/hisoyakani.json";
import Material from "../material";

interface Triangle {
  points: number[][];
  material: string;
  sprites?: Sprite[];
}

export default function trianglesPart(storyboard: Storyboard) {
  // For debugging
  const frames = data;

  let previous: Triangle[] = [];

  for (const { frame, triangles } of data) {
    console.log(`Processing ${frame}`);

    const start = frame * Constants.frameRate;
    const end = start + Constants.frameDelta * Constants.frameRate;

    if (isRepeatFrame(triangles, previous)) {
      for (const { sprites } of previous) {
        if (!sprites) {
          continue;
        }

        for (const sprite of sprites) {
          for (const command of sprite.commands) {
            // Since we arbitrarily set the end in the rotate command, we only
            // need to adjust that
            if (command instanceof RotateCommand) {
              command.end = end;
              break;
            }
          }
        }
      }

      continue;
    }

    const current: Triangle[] = triangles;

    for (let i = 0; i < current.length; ++i) {
      const { points, material } = current[i];
      const sprites: Sprite[] = [];

      const file = Material[material.toString()] ?? 0;

      // Split arbitrary triangle into 2 right-sided triangles
      const triangles = splitTriangles(points);

      for (const { position, rotation, scale } of triangles) {
        // Scale's too small so no point to do anything with it lol?
        // Any thing smaller than a cutoff we don't care about
        const cutoff = 1 / Constants.triangleSize;
        if (scale[0] < cutoff || scale[1] < cutoff) {
          continue;
        }

        const sprite = storyboard.sprite(file, position);
        sprite.rotate(start, end, rotation, rotation);
        sprite.scale(start, start, scale, scale);

        sprites.push(sprite);
      }

      current[i].sprites = sprites;
    }

    previous = current;
  }
}

const isRepeatFrame = (triangles: Triangle[], previous: Triangle[]) => {
  if (triangles.length !== previous.length) {
    return false;
  }

  for (let i = 0; i < triangles.length; ++i) {
    // I hate myself
    if (!isNumberEqual(triangles[i].points[0][0], previous[i].points[0][0]))
      return false;
    if (!isNumberEqual(triangles[i].points[0][1], previous[i].points[0][1]))
      return false;
    if (!isNumberEqual(triangles[i].points[1][0], previous[i].points[1][0]))
      return false;
    if (!isNumberEqual(triangles[i].points[1][1], previous[i].points[1][1]))
      return false;
    if (!isNumberEqual(triangles[i].points[2][0], previous[i].points[2][0]))
      return false;
    if (!isNumberEqual(triangles[i].points[2][1], previous[i].points[2][1]))
      return false;
  }

  return true;
};

// Splits a given triangle into 2 right-triangles
const splitTriangles = (points: number[][]) => {
  let [A, B, C] = [0, 1, 2].map((index) =>
    // Immediately convert so there's no weird stuff going on later
    convertPosition(vec2.fromValues(points[index][0], points[index][1]))
  );

  // Get vectors between A, B, C
  const AB = vec2.subtract(vec2.create(), B, A);
  const AC = vec2.subtract(vec2.create(), C, A);

  // Ensure points are valid for projection otherwise move them forward
  if (!isValidProjection(AB, AC)) {
    rotateValues(A, B, C, AB, AC);

    // This can happen a maximum of twice so do it one more time if needed
    if (!isValidProjection(AB, AC)) {
      rotateValues(A, B, C, AB, AC);
    }
  }

  // Projection of X onto Y = Y * dot(X, Y) / dot(Y, Y)
  const dotCB = vec2.dot(AC, AB);
  const dotBB = vec2.dot(AB, AB);
  const D = vec2.scale(vec2.create(), AB, dotCB / dotBB);

  // Correct D to world position since projection is local
  vec2.add(D, D, A);

  // D vectors
  const DA = vec2.subtract(vec2.create(), A, D);
  const DB = vec2.subtract(vec2.create(), B, D);

  // Calculate rotations
  const rotationA = -angleFrom(DA, Constants.unitX);
  const rotationB = -angleFrom(DB, Constants.unitY);

  // Calculate scales
  const DCLength =
    vec2.length(vec2.subtract(vec2.create(), C, D)) / Constants.triangleSize;
  const scaleA = vec2.fromValues(
    vec2.length(DA) / Constants.triangleSize,
    DCLength
  );
  const scaleB = vec2.fromValues(
    DCLength,
    vec2.length(DB) / Constants.triangleSize
  );

  const positionA = D;
  const positionB = D;

  return [
    { position: positionA, rotation: rotationA, scale: scaleA },
    { position: positionB, rotation: rotationB, scale: scaleB },
  ];
};

// In our projection scenario we need to make sure several properties are met
const isValidProjection = (AB: vec2, AC: vec2) => {
  // AC must be smaller than AB
  if (vec2.squaredLength(AC) > vec2.squaredLength(AB)) {
    return false;
  }

  const angle = Math.abs(angleFrom(AB, AC));
  // The angle between AB and AC must be < 90 degrees
  if (angle >= Math.PI / 2) {
    return false;
  }

  return true;
};

// Rotates vector values such that A -> B, B -> C, C -> A
const rotateValues = (A: vec2, B: vec2, C: vec2, AB: vec2, AC: vec2) => {
  const temp = vec2.copy(vec2.create(), A);
  vec2.copy(A, B);
  vec2.copy(B, C);
  vec2.copy(C, temp);
  vec2.subtract(AB, B, A);
  vec2.subtract(AC, C, A);
};
