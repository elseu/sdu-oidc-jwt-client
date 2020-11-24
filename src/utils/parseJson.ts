export const parseJson = (json: string, defaultValue: any = undefined) => {
  let parsed;

  try {
    parsed = JSON.parse(json);
  } catch (e) {
    parsed = defaultValue;
  }

  return parsed;
};
