import Storyboard from "./storyboard";
import data from "../blend/hisoyakani.json";
import { vec2 } from "gl-matrix";

const FRAME_RATE = 30;
const FRAME_DELTA = 10;

// Splits a given triangle into 2 right-triangles
const splitTriangles = (points: number[][]) => {
  const [A, B, C] = [0, 1, 2].map((index) =>
    vec2.fromValues(points[index][0], points[index][1])
  );

  const ACopy = vec2.create();
  vec2.copy(ACopy, A);

  // Translate everything relative to a
  vec2.subtract(A, A, ACopy);
  vec2.subtract(B, B, ACopy);
  vec2.subtract(C, C, ACopy);

  // Get vectors between a, b, c
  const AToB = vec2.create();
  vec2.subtract(AToB, B, A);
  const AToC = vec2.create();
  vec2.subtract(AToC, C, A);
  const BToA = vec2.create();
  vec2.subtract(BToA, A, B);

  // Project of b onto a = a * dot(b, a) / dot(a, a)
  const dot = vec2.dot(AToC, AToB);
  const squared = vec2.dot(A, A);
  const D = vec2.create();
  vec2.scale(D, A, dot / squared);

  // Translate everything back
  vec2.add(A, A, ACopy);
  vec2.add(B, B, ACopy);
  vec2.add(C, C, ACopy);
  vec2.add(D, D, ACopy);

  const position = D;

  return {
    position,
    rotationA,
    rotationB,
    scaleA,
    scaleB,
  };
};

const storyboard = new Storyboard();

for (const { frame, triangles } of data) {
  const startTime = frame * FRAME_RATE;
  const endTime = startTime + FRAME_DELTA;

  for (const { points, material } of triangles) {
    const file = material.toString();

    //' Split arbitrary triangle into 2 right-sided triangles

    // Rotate triangles into place

    storyboard.sprite(file, position);
  }
}

storyboard.write("hisoyakani.osb");
