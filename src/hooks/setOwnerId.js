import errors from 'feathers-errors';
import { setByDot } from 'feathers-hooks-common';

export default field => context => {
  if (context.params.provider === undefined) {
    if (context.method !== 'patch' && !context.data[field]) {
      throw new errors.GeneralError(
        `must provide ${field} when calling creating or updating a internally`,
      );
    }

    return context;
  }
  console.log('heeere');
  setByDot(context.data, field, context.params.user._id);
  return context;
};
