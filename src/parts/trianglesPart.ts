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
    const end = start + Constants.FRAME_DELTA;
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
    }

    previous = current;
  }
}

// Splits a given triangle into 2 right-triangles
const splitTriangles = (points: number[][]) => {
  const [A, B, C] = [0, 1, 2].map((index) =>
    vec2.fromValues(points[index][0], points[index][1])
  );

  // Get vectors between A, B, C
  const AToB = vec2.subtract(vec2.create(), B, A);
  const AToC = vec2.subtract(vec2.create(), C, A);

  // Projection of B onto A = A * dot(B, A) / dot(A, A)
  const dot = vec2.dot(AToC, AToB);
  const squared = vec2.dot(AToB, AToB);
  const D = vec2.scale(vec2.create(), AToB, dot / squared);

  // Correct D to world position since projection is local
  vec2.add(D, D, A);

  const DToA = vec2.subtract(vec2.create(), A, D);
  const DToB = vec2.subtract(vec2.create(), B, D);

  const rotationA = angleFromX(DToA);
  const rotationB = angleFromX(DToB);

  const DToC = vec2.subtract(vec2.create(), C, D);
  const DToCLength = vec2.length(DToC) / Constants.TRIANGLE_SIZE;
  const scaleA = vec2.fromValues(
    DToCLength,
    vec2.length(DToA) / Constants.TRIANGLE_SIZE
  );
  const scaleB = vec2.fromValues(
    vec2.length(DToB) / Constants.TRIANGLE_SIZE,
    DToCLength
  );

  const position = vec2.multiply(D, D, Constants.SCREEN_SIZE);

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

const angleFromX = (vec: vec2) => {
  const cross = vec[0] * Constants.UNIT_X[1] - vec[1] * Constants.UNIT_X[0];
  const dot = vec2.dot(vec, Constants.UNIT_X);
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

    let isEqual = false;

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
};
