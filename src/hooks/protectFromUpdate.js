import commons from 'feathers-hooks-common';
export default fields => context => {
    if (typeof context.params.provider === 'undefined') return context // allow patch from internal call

    fields.forEach(field => {
      commons.deleteByDot(context.data, field);
    });
    return context;
}
