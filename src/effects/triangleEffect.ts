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
import Easing from "../storyboard/easing";
import Material from "../material";

export default function trianglesPart(storyboard: Storyboard) {
  // We want to keep track of the previous triangles so if we find that 2
  // triangles share the same transforms, we don't have to create a new sprite
  // and can instead just increase the previous sprite's duration
  let previous: Sprite[] = [];

  // For debugging
  const frames = data;

  for (const { frame, triangles } of data) {
    console.log(`Processing ${frame}`);

    const start = frame * Constants.frameRate;
    const end = start + Constants.frameDelta * Constants.frameRate;
    const current: Sprite[] = [];

    let counter = 0;

    for (const { points, material } of triangles) {
      counter++;
      const file = Material[material.toString()] ?? 0;

      // Split arbitrary triangle into 2 right-sided triangles
      const triangles = splitTriangles(points);

      for (const { position, rotation, scale } of triangles) {
        const previousTriangle = getPrevious(
          file,
          position,
          rotation,
          scale,
          previous
        );

        if (previousTriangle) {
          let foundPrevious = false;

          for (const command of previousTriangle.commands) {
            // Since we arbitrarily set the end in the rotate command, we only
            // need to adjust that
            if (command instanceof RotateCommand) {
              command.end = end;
              current.push(previousTriangle);
              foundPrevious = true;
              break;
            }
          }

          if (foundPrevious) {
            continue;
          }
        }

        // Scale's too small so no point to do anything with it lol?
        // Any thing smaller than a cutoff we don't care about
        const cutoff = 1 / Constants.triangleSize;
        if (scale[0] < cutoff || scale[1] < cutoff) {
          continue;
        }

        const sprite = storyboard.sprite(file, position);
        sprite.rotate(Easing.Linear, start, end, rotation, rotation);
        sprite.scale(Easing.Linear, start, start, scale, scale);
        // sprite.fade(
        //   Easing.Linear,
        //   start,
        //   start,
        //   (1 / triangles.length) * counter,
        //   (1 / triangles.length) * counter
        // );
        current.push(sprite);
      }

      // TODO: Testing
      // for (const point of points) {
      //   createPoint(
      //     convertPosition(vec2.fromValues(point[0], point[1])),
      //     storyboard
      //   );
      // }
    }

    previous = current;
  }
}

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

const getPrevious = (
  file: string,
  position: vec2,
  rotation: number,
  scale: vec2,
  previous: Sprite[]
) => {
  // This is not reliable because of layering. Going to have to see how to best address this...
  // return;

  // Check if we can optimize previous triangle instead of creating a new sprite
  for (const triangle of previous) {
    if (triangle.file !== file) {
      continue;
    }

    if (!vec2.equals(triangle.position, position)) {
      continue;
    }

    let isEqual = true;

    for (const command of triangle.commands) {
      if (command instanceof RotateCommand) {
        if (!isNumberEqual(command.startRotate, rotation)) {
          isEqual = false;
          break;
        }
      } else if (command instanceof ScaleCommand) {
        if (!vec2.equals(command.startScale, scale)) {
          isEqual = false;
          break;
        }
      }
    }

    if (!isEqual) {
      continue;
    }

    // If we get to here that means that we can reuse the previous triangle
    // since there are no transforms.
    return triangle;
  }

  // If there is no previous then we will naturally return undefined
  return;
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
