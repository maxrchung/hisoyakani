import { vec2 } from "gl-matrix";
import Storyboard from "../storyboard";
import { Constants } from "../common";

// As a by-product gets rid of some SB load
export default function backgroundPart(storyboard: Storyboard) {
  const sprite = storyboard.sprite(
    "a.png",
    vec2.fromValues(Constants.SCREEN_OFFSET[0], Constants.SCREEN_OFFSET[1])
  );
  const scale = vec2.fromValues(856, 482);
  sprite.scale(0, 999999, scale, scale);
}
