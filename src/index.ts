import Storyboard from "./storyboard";
import data from "../blend/hisoyakani.json";
import { vec2 } from "gl-matrix";
import Sprite from "./sprite";
import RotateCommand from "./rotateCommand";
import ScaleCommand from "./scaleCommand";

const FRAME_RATE = 30;
const FRAME_DELTA = 10;
const UNIT_Y = vec2.fromValues(0, 1);
const TRIANGLE_SIZE = 100;
const SCREEN_SIZE = vec2.fromValues(854, 480);

// Splits a given triangle into 2 right-triangles
const splitTriangles = (points: number[][]) => {
  const [A, B, C] = [0, 1, 2].map((index) =>
    vec2.fromValues(points[index][0], points[index][1])
  );

  const ACopy = vec2.copy(vec2.create(), A);

  // Translate everything relative to a
  vec2.subtract(A, A, ACopy);
  vec2.subtract(B, B, ACopy);
  vec2.subtract(C, C, ACopy);

  // Get vectors between a, b, c
  const AToB = vec2.subtract(vec2.create(), B, A);
  const AToC = vec2.subtract(vec2.create(), C, A);

  // Project of b onto a = a * dot(b, a) / dot(a, a)
  const dot = vec2.dot(AToC, AToB);
  const squared = vec2.dot(A, A);
  const D = vec2.scale(vec2.create(), A, dot / squared);

  const DToA = vec2.subtract(vec2.create(), A, D);
  const DToB = vec2.subtract(vec2.create(), B, D);

  const rotationA = angleFromY(DToA);
  const rotationB = angleFromY(DToB);

  const DToC = vec2.subtract(vec2.create(), C, D);
  const DToCLength = vec2.length(DToC) / TRIANGLE_SIZE;

  // TODO: Factor in image size
  const scaleA = vec2.fromValues(DToCLength, vec2.length(DToA) / TRIANGLE_SIZE);
  const scaleB = vec2.fromValues(vec2.length(DToB) / TRIANGLE_SIZE, DToCLength);

  // Translate everything back
  vec2.add(A, A, ACopy);
  vec2.add(B, B, ACopy);
  vec2.add(C, C, ACopy);
  vec2.add(D, D, ACopy);

  const position = vec2.multiply(D, D, SCREEN_SIZE);

  return {
    position,
    rotationA,
    rotationB,
    scaleA,
    scaleB,
  };
};

const angleFromY = (vec: vec2) => {
  const normal = vec2.normalize(vec2.create(), vec);
  const dot = vec2.dot(normal, UNIT_Y);
  // Clamp to avoid floating-point precision issues, thanks GPT
  const clamp = Math.min(1, Math.max(-1, dot));
  const rotation = Math.acos(clamp);

  return rotation;
};

const storyboard = new Storyboard();

// We want to keep track of the previous triangles so if we find that 2
// triangles share the same transform, we don't have to create a new sprite and
// can instead just alter the previous sprite's commands
let previous: Sprite[] = [];

for (const { frame, triangles } of data) {
  const start = frame * FRAME_RATE;
  const end = start + FRAME_DELTA;
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
      let hasPrevious = false;

      // Check if we can optimize previous triangle instead of creating a new sprite
      for (const triangle of previous) {
        if (!vec2.equals(triangle.position, position)) {
          continue;
        }

        let isEqual = false;

        for (const command of triangle.commands) {
          if (command instanceof RotateCommand) {
            if (Math.abs(command.rotate - rotation) > Number.EPSILON) {
              isEqual = false;
              break;
            }
          } else if (command instanceof ScaleCommand) {
            if (!vec2.equals(command.scale, scale)) {
              isEqual = false;
              break;
            }
          }
        }

        if (!isEqual) {
          continue;
        }

        // If we get to here that means that we can reuse the previous triangle
        // to go to this time. Since we arbitrarily set the end in the rotate
        // command, we only need to adjust that command.
        hasPrevious = true;

        for (const command of triangle.commands) {
          if (command instanceof RotateCommand) {
            command.end = end;
          }

          break;
        }
      }

      if (hasPrevious) {
        return;
      }

      const sprite = storyboard.sprite(file, position);
      sprite.rotate(start, end, rotation);
      sprite.scale(start, start, scale);
      current.push(sprite);
    });
  }

  previous = current;
}

storyboard.write("hisoyakani.osb");
