import errors from 'feathers-errors';

export default (param) => context => {
  return context.params.query.hasOwnProperty(param)
};
