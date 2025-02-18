import { vec2 } from "gl-matrix";
import Storyboard from "../storyboard";
import { Constants } from "../common";
import Easing from "../storyboard/easing";

export default function backgroundEffect(storyboard: Storyboard) {
  // Gets rid of some SB load
  const sprite = storyboard.sprite(
    // Needs to be exact name to get rid of SB load
    "a.png",
    vec2.fromValues(Constants.screenOffset[0], Constants.screenOffset[1])
  );
  const scale = vec2.fromValues(856, 482);
  sprite.scale(Easing.Linear, 0, 999999, scale, scale);
}
