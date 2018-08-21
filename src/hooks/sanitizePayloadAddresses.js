import errors from 'feathers-errors';
import commons from 'feathers-hooks-common';
import { toChecksumAddress, isAddress } from 'web3-utils';

/**
 * sanitize the specified fieldObjects when the given methods are called. prepends 0x to address if needed and converts
 * to checksum address.
 *
 * @params
 *   fieldNames address fields to sanitize. can be an array or a single field
 *   opts  {
 *           required: // are the fields required? if true, and a field is missing, we will throw an error
 *           validate: // will throw an error if an invalid address is given
 *         }
 */
export default (fieldObjects) => context => {


  commons.checkContext(context, 'before', ['find', 'create', 'update', 'patch', 'remove']);

  if (!Array.isArray(fieldObjects)) fieldObjects = [fieldObjects];

  const convertItem = item => {
    fieldObjects.forEach(fieldObject => {
      let fieldValue = commons.getByDot(item, fieldObject.fieldName);

      if (fieldValue) {
        try {
          // console.log('fieldObject.fieldName', fieldObject.fieldName);
          // console.log('fieldObject.objectArrayKey', fieldObject.objectArrayKey);
          // console.log('fieldValue', fieldValue);
          // console.log('Array.isArray(fieldValue)', Array.isArray(fieldValue));
          if (Array.isArray(fieldValue)) { // assume array of objects
            fieldValue.forEach((valueObject) => {
              const address = valueObject[fieldObject.objectArrayKey];
              // console.log('inside fieldValue.forEach: address', address);
              if (!isAddress(address))
                throw new errors.BadRequest(`invalid address provided for "${fieldObject.fieldName}"`, item);

              valueObject[fieldObject.objectArrayKey] = toChecksumAddress(address);
            })
          } else { // assume address value

            if (!isAddress(fieldValue))
              throw new errors.BadRequest(`invalid address provided for "${fieldObject.fieldName}"`, item);
            // console.log('toChecksumAddress', toChecksumAddress);
            fieldValue = toChecksumAddress(fieldValue);
          }

        } catch (err) {
          console.log('err', err);
          throw new errors.BadRequest(`invalid address provided for "${fieldObject.fieldName}"`, item);
        }

        commons.setByDot(item, fieldObject.fieldName, fieldValue)
      }
    });
  };

  const items = commons.getItems(context);

  // items may be undefined if we are removing by id;
  if (items === undefined) return context;

  Array.isArray(items) ? items.forEach(item => convertItem(item)) : convertItem(items);

  commons.replaceItems(context, items);

  return context;
};
