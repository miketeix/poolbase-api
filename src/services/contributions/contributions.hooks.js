/* eslint-disable no-unused-vars */
import errors from 'feathers-errors';
import commons from 'feathers-hooks-common';

import hasQueryParam from '../../hooks/hasQueryParam';
import sanitizeAddress from '../../hooks/sanitizeAddress';
import setAddress from '../../hooks/setAddress';
import setOwnerId from '../../hooks/setOwnerId';
import addTxData from '../../hooks/addTxData';
import { updatedAt, createdAt } from '../../hooks/timestamps';


const contributorCountByPoolAddress = async context => {
  try {
    const poolAddress = context.params.query.countByPool;
    const { total: count } = await context.service.find( { query: { $limit: 0, poolAddress }});

    context.result = { count };
    return context;
  } catch(err) {
    logger.error(err);
    throw new errors.BadRequest();
  }
}

// restrict(),

module.exports = {
  before: {
    all: [commons.paramsFromClient('schema')],
    find: [
      // sanitizeAddress('contributorAddress')],x
      commons.iff(hasQueryParam('countByPoolAddress'), contributorCountByPoolAddress)
    ],
    get: [],
    create: [
      createdAt,
      setOwnerId('ownerId'),
    ],
    update: [ commons.disallow()],
    // update: [ sanitizeAddress('contributorAddress', { validate: true }), updatedAt],
    patch: [ commons.disallow()],
    // patch: [
    //   restrict(),
    //   sanitizeAddress('contributorAddress', { validate: true }),
    //   stashDonationIfPending(),
    //   updatedAt,
    // ],
    remove: [commons.disallow()],
  },

  after: {
    all: [],
    find: [],
    get: [],
    create: [addTxData],
    update: [],
    patch: [],
    remove: [],
  },

  error: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: [],
  },
};
