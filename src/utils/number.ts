export const validateIntegerInput = (input?: any): number | undefined => {
  const invalidInputError = () =>
    new Error(`Invalid input. Expected integer but got: ${input}`);

  if (!input) return undefined;

  if (typeof input !== 'string' && typeof input !== 'number')
    throw invalidInputError();

  const number = Number(input);

  if (!Number.isInteger(number)) throw invalidInputError();

  return number;
};
