import { vec2 } from "gl-matrix";
import Storyboard from "../storyboard";
import { Constants } from "../common";
import Easing from "../storyboard/easing";

// As a by-product gets rid of some SB load
export default function endEffect(storyboard: Storyboard) {
  const sprite = storyboard.sprite(
    "a",
    vec2.fromValues(Constants.screenOffset[0], Constants.screenOffset[1])
  );
  const scale = vec2.fromValues(856, 482);
  sprite.scale(Easing.Linear, 0, 999999, scale, scale);
  sprite.fade(Easing.EasingIn, 163575, 168112, 0, 1);
}
