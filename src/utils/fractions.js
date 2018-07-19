function precision(a) {
  if (!isFinite(a)) return 0;
  var e = 1, p = 0;
  while (Math.round(a * e) / e !== a) { e *= 10; p++; }
  return p;
}

export const percentToFractionArray = (percentNumber) => {
  if (typeof percentNumber !== 'number')
    throw new Error(`percentToFractionArray only handles numbers, value: ${percentNumber} is type: ${typeof percentNumber}`);
  const decimalPlaces = precision(percentNumber);
  const numerator = num * Math.pow(10, decimalPlaces);
  const denominator = Math.pow(100, decimalPlaces);
  return [ numerator, denominator ];
}
