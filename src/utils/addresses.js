import { toChecksumAddress, isAddress } from 'web3-utils';

export const parseObjectValuesToChecksum = (o) => {
  Object.keys(o).forEach(k => {
    if (typeof o[k] === 'object' && !Array.isArray(o[k])) {
      return parseObjectValuesToChecksum(o[k]);
    }
    if (Array.isArray(o[k])) {
      o[k] = o[k].map((item) => {
        if (typeof item === 'object' && !Array.isArray(item)) {
          return parseObjectValuesToChecksum(item);
        }

        if ( (typeof item === 'string') && isAddress(item)) {
          return toChecksumAddress(item);
        }

        return item;
      })
    }
    if ( (typeof o[k] === 'string') &&  isAddress(o[k])) {
      o[k] = toChecksumAddress(o[k]);
    }
  });

  return o;
}
