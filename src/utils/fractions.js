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
  const numerator = percentNumber * Math.pow(10, decimalPlaces);
  const denominator = Math.pow(100, decimalPlaces);
  return [ numerator, denominator ];
}

export const fractionArrayToPercent = (fractionArray) => {
  if ( !Array.isArray(fractionArray) || fractionArray.length !== 2)
    throw new Error(`fractionArrayToPercent only handles arrays of size 2, value: ${fractionArray} is type: ${typeof fractionArray}`);
  if ( typeof fractionArray[0] !== 'number' || typeof fractionArray[1] !== 'number')
    throw new Error(`fractionArrayToPercent only handles arrays of size 2 composed of numbers, value: ${fractionArray} is composed of types: [${typeof fractionArray[0]}, ${typeof fractionArray[1]}]`);

  const percent = (fractionArray[0]/fractionArray[1])*100;
  return percent;
}
