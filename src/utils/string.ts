export const isEqual = (a: string, b: string) => {
  return a.toLowerCase() === b.toLowerCase();
};

export const stringToArrayOfIds = (value: string) => {
  const arrayString = value.split(',').filter((id) => id);
  const wrongFormatArray = arrayString.filter((id) => isNaN(Number(id)));

  if (wrongFormatArray.length)
    `The following role IDs are not numbers: ${wrongFormatArray.join(', ')}.`;

  return arrayString.map((id) => Number(id));
};
