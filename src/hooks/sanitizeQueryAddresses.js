import errors from 'feathers-errors';
import commons from 'feathers-hooks-common';
import { parseObjectValuesToChecksum } from '../utils/addresses';

/**
 * sanitize all addresses in query object
 *
 */

export default context => {
  commons.checkContext(context, 'before', ['find', 'update', 'patch', 'remove']);

  if (context.params.query) {
    context.params.query = parseObjectValuesToChecksum(context.params.query);
  }
  return context;
};
