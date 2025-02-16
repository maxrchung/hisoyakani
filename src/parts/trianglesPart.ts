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

  for (const { frame, triangles } of data) {
    const start = frame * Constants.FRAME_RATE;
    const end = start + Constants.FRAME_DELTA * Constants.FRAME_RATE;
    const current: Sprite[] = [];

    // TODO: Testing
    for (const { points, material } of [triangles[0]]) {
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
      for (const point of points) {
        createPoint(
          convertPosition(vec2.fromValues(point[0], point[1])),
          storyboard
        );
      }
    }

    previous = current;
  }
}

// Splits a given triangle into 2 right-triangles
const splitTriangles = (points: number[][]) => {
  const [A, B, C] = [0, 1, 2].map((index) =>
    // Immediately convert so there's no weird stuff going on later
    convertPosition(vec2.fromValues(points[index][0], points[index][1]))
  );

  // Get vectors between A, B, C
  const AToB = vec2.subtract(vec2.create(), B, A);
  const AToC = vec2.subtract(vec2.create(), C, A);

  // Projection of B onto A = A * dot(B, A) / dot(A, A)
  const dotCB = vec2.dot(AToC, AToB);
  const dotBB = vec2.dot(AToB, AToB);
  const D = vec2.scale(vec2.create(), AToB, dotCB / dotBB);

  // Correct D to world position since projection is local
  vec2.add(D, D, A);

  // D vectors
  const DToA = vec2.subtract(vec2.create(), A, D);
  const DToB = vec2.subtract(vec2.create(), B, D);

  // Calculate rotations
  const rotationA = -angleFrom(DToA, Constants.UNIT_X);
  const rotationB = -angleFrom(DToB, Constants.UNIT_Y);

  // Calculate scales
  const DToCLength =
    vec2.length(vec2.subtract(vec2.create(), C, D)) / Constants.TRIANGLE_SIZE;
  const scaleA = vec2.fromValues(
    vec2.length(DToA) / Constants.TRIANGLE_SIZE,
    DToCLength
  );
  const scaleB = vec2.fromValues(
    DToCLength,
    vec2.length(DToB) / Constants.TRIANGLE_SIZE
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
