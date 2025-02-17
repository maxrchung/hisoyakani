import { vec2 } from "gl-matrix";
import { Constants, isNumberEqual } from "../common";
import Storyboard from "../storyboard";
import RotateCommand from "../storyboard/commands/rotateCommand";
import ScaleCommand from "../storyboard/commands/scaleCommand";
import Sprite from "../storyboard/sprite";
import data from "../../blend/hisoyakani.json";

export default function trianglesPart(storyboard: Storyboard) {
  // We want to keep track of the previous triangles so if we find that 2
  // triangles share the same transform, we don't have to create a new sprite and
  // can instead just increase the previous sprite's duration
  let previous: Sprite[] = [];

  // For debugging
  const frames = data;

  for (const { frame, triangles } of data) {
    const start = frame * Constants.FRAME_RATE;
    const end = start + Constants.FRAME_DELTA * Constants.FRAME_RATE;
    const current: Sprite[] = [];

    for (const { points, material } of triangles) {
      const file = material.toString();

      // Split arbitrary triangle into 2 right-sided triangles
      const { position, rotationA, rotationB, scaleA, scaleB } =
        splitTriangles(points);

      const triangles: [number, vec2][] = [
        [rotationA, scaleA],
        [rotationB, scaleB],
      ];

      // Rotate triangles into place
      triangles.forEach(([rotation, scale]) => {
        const previousTriangle = getPrevious(
          position,
          rotation,
          scale,
          previous
        );

        if (previousTriangle) {
          for (const command of previousTriangle.commands) {
            // Since we arbitrarily set the end in the rotate command, we only
            // need to adjust that
            if (command instanceof RotateCommand) {
              command.end = end;
              current.push(previousTriangle);
              return;
            }
          }
        }

        const sprite = storyboard.sprite(file, position);
        sprite.rotate(start, end, rotation, rotation);
        sprite.scale(start, start, scale, scale);
        current.push(sprite);
      });

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
    const temp = vec2.copy(vec2.create(), A);
    A = B;
    B = C;
    C = temp;

    vec2.subtract(AB, B, A);
    vec2.subtract(AC, C, A);

    // This can happen a maximum of twice so do it again
    if (!isValidProjection(AB, AC)) {
      const temp = vec2.copy(vec2.create(), A);
      A = B;
      B = C;
      C = temp;

      vec2.subtract(AB, B, A);
      vec2.subtract(AC, C, A);
    }
  }

  // Projection of B onto A = A * dot(B, A) / dot(A, A)
  const dotCB = vec2.dot(AC, AB);
  const dotBB = vec2.dot(AB, AB);
  const D = vec2.scale(vec2.create(), AB, dotCB / dotBB);

  // Correct D to world position since projection is local
  vec2.add(D, D, A);

  // D vectors
  const DA = vec2.subtract(vec2.create(), A, D);
  const DB = vec2.subtract(vec2.create(), B, D);

  // Calculate rotations
  const rotationA = -angleFrom(DA, Constants.UNIT_X);
  const rotationB = -angleFrom(DB, Constants.UNIT_Y);

  // Calculate scales
  const DCLength =
    vec2.length(vec2.subtract(vec2.create(), C, D)) / Constants.TRIANGLE_SIZE;
  const scaleA = vec2.fromValues(
    vec2.length(DA) / Constants.TRIANGLE_SIZE,
    DCLength
  );
  const scaleB = vec2.fromValues(
    DCLength,
    vec2.length(DB) / Constants.TRIANGLE_SIZE
  );

  const position = D;

  return {
    // Position is shared between the two right triangles, only rotations and
    // scales differ
    position,
    rotationA,
    rotationB,
    scaleA,
    scaleB,
  };
};

const angleFrom = (A: vec2, B: vec2) => {
  const cross = A[0] * B[1] - A[1] * B[0];
  const dot = vec2.dot(A, B);
  const rotation = Math.atan2(cross, dot);

  return rotation;
};

const getPrevious = (
  position: vec2,
  rotation: number,
  scale: vec2,
  previous: Sprite[]
) => {
  // Check if we can optimize previous triangle instead of creating a new sprite
  for (const triangle of previous) {
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

// Converts 0,0 bottom left camera position to storyboard position
const convertPosition = (position: vec2) => {
  // Reverse y direction so it is from top left
  const converted = vec2.fromValues(position[0], 1 - position[1]);
  // Scale from normalized coordinates to screen coordinates
  vec2.multiply(converted, converted, Constants.SCREEN_SIZE);
  // Adds offset
  vec2.add(converted, converted, Constants.SCREEN_OFFSET);

  return converted;
};

const createPoint = (position: vec2, storyboard: Storyboard) => {
  const sprite = storyboard.sprite(
    "b",
    vec2.fromValues(position[0] - 5, position[1] - 5)
  );
  sprite.scale(0, 999999, vec2.fromValues(10, 10), vec2.fromValues(10, 10));
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
