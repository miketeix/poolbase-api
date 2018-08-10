import { setByDot } from 'feathers-hooks-common';

export default async context => {
    const { lastStatus: newStatus } = context.params.before;
    setByDot(context.data, 'status', newStatus);
    return context;
};
