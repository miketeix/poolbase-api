import errors from 'feathers-errors';
import { setByDot } from 'feathers-hooks-common';

export default status => context => {
  // if (context.params.provider === undefined) {
  //   if (context.method !== 'patch' && !context.data[field]) {
  //     throw new errors.GeneralError(
  //       `must provide ${field} when calling creating or updating a internally`,
  //     );
  //   }
  //
  //   return context;
  // }
  setByDot(context.data, 'status', status);
  return context;
};
