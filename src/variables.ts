export const Variables = {
  a: "4,0,0,0,",
  b: "4,0,0,1,",
  c: "4,0,0,2,",
  d: "4,0,0,3,",
  e: "4,0,0,4,",
  g: " R,0,1",
  h: " R,0,",
  i: " V,0,1",
  j: " V,0,",
  k: " F,0,1",
  l: " F,0,",
};

export const replaceVariables = (line: string, variables: {}) => {
  let replaced = line;
  for (const key in variables) {
    const variable = "$" + key;
    const value = variables[key];
    replaced = replaced.replace(value, variable);
  }

  return replaced;
};
