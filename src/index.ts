// TODO:
// Material image colors

// Test 1028 image size, try to minimiaze triangle overlaps
// 128 with 2px over diagonal is probably ok for now

// Fix frame timing
// Wtf dope sheet is playing 10% slower for some reason

// Apply armature  to mesh somehow
// Done using depsgraph

// Setup background
// Proper foreground

// Fix Z overlaps

// Fix single face objects

// Proper background

// Better colors?
// Smoke effect
// Better animation

import Storyboard from "./storyboard";
import backgroundEffect from "./effects/backgroundEffect";
import triangleEffect from "./effects/triangleEffect";
import smokeEffect from "./effects/smokeEffect";
import endEffect from "./effects/endEffect";

const storyboard = new Storyboard();

// backgroundEffect(storyboard);
triangleEffect(storyboard);
// smokeEffect(storyboard);
endEffect(storyboard);

const path =
  "C:\\Users\\Max\\AppData\\Local\\osu!\\Songs\\beatmap-638752487828044626-h\\swag - swag (S2VX).osb";
storyboard.write(path);
