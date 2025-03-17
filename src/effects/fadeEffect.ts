import { vec2 } from "gl-matrix";
import Storyboard from "../storyboard";
import { Constants } from "../common";

const scale = vec2.fromValues(856, 482);

// As a by-product gets rid of some SB load
export default function fadeEffect(storyboard: Storyboard) {
  startFade(storyboard);
  endFade(storyboard);
}

const startFade = (storyboard: Storyboard) => {
  const sprite = storyboard.sprite(
    "b",
    vec2.fromValues(Constants.screenOffset[0], Constants.screenOffset[1])
  );
  const start = 0;
  const end = 6600;

  sprite.scale(start, start, scale, scale);

  const speed = Constants.frameDelta * Constants.frameRate;
  const iterations = Math.floor((end - start) / speed);
  for (let i = 0; i <= iterations; ++i) {
    const time = start + i * speed;
    // Add some easing or some sheet
    const fade = 1 - (i / iterations) * (i / iterations);
    sprite.fade(time, time, fade, fade);
  }
};

const endFade = (storyboard: Storyboard) => {
  const sprite = storyboard.sprite(
    "b",
    vec2.fromValues(Constants.screenOffset[0], Constants.screenOffset[1])
  );

  const start = 163422;
  const end = 173896;

  sprite.scale(start, 999999, scale, scale);

  const speed = Constants.frameDelta * Constants.frameRate;
  const iterations = Math.floor((end - start) / speed);
  for (let i = 0; i <= iterations; ++i) {
    const time = start + i * speed;
    const fade = (i / iterations) * (i / iterations);
    sprite.fade(time, time, fade, fade);
  }
};
