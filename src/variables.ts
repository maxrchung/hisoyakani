import Storyboard from "./storyboard";
import RotateCommand from "./storyboard/commands/rotateCommand";

export const generateVariables = (storyboard: Storyboard) => {
  const map: {
    [key: string]: {
      command: RotateCommand;
      count: number;
    };
  } = {};

  for (const sprite of storyboard.sprites) {
    for (const command of sprite.commands) {
      if (command instanceof RotateCommand) {
        const key = `${command.start}_${command.end}`;
        if (map[key]) {
          map[key].count++;
        } else {
          map[key] = {
            command,
            count: 0,
          };
        }
      }
    }
  }

  // Sort by highest frequency so one-byte replacements are used more
  const sorted = Object.values(map).sort((a, b) => b.count - a.count);

  const variables: { [key: string]: string } = {};
  let codePoint = 0;

  const addVariable = (value: string) => {
    const key = `$${String.fromCodePoint(codePoint)}`;
    variables[key] = value;

    codePoint++;

    // Skip some characters... probably messes up stuff?
    while (
      codePoint === 10 || // \n
      codePoint === 13 || // \r
      codePoint === 36 || // $
      codePoint === 38 || // &
      codePoint === 39 || // '
      codePoint === 61 || // =
      codePoint === 96 // `
    ) {
      codePoint++;
    }
  };

  // Sprite declarations, for sure always going to be heavy usage
  addVariable("4,0,0,0,");
  addVariable("4,0,0,1,");
  addVariable("4,0,0,2,");
  addVariable("4,0,0,3,");
  addVariable("4,0,0,4,");
  addVariable("4,0,0,5,");

  for (const {
    command: { start, end },
  } of sorted) {
    // Rotate command has start and end
    addVariable(` R,0,${Math.round(start)},${Math.round(end)},`);
    // Scale only has start
    addVariable(` V,0,${Math.round(start)},,`);
  }

  // Not really important since this only applies to start/end effect
  addVariable(" F,0,16");
  addVariable(" F,0,17");
  addVariable(" F,0,");

  return variables;
};
