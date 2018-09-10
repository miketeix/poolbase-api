const pools = require('./pools/pools.service.js');
const users = require('./users/users.service.js');
const uploads = require('./uploads/uploads.service.js');
const contributions = require('./contributions/contributions.service.js');
const transactions = require('./transactions/transactions.service.js');
const fees = require('./fees/fees.service.js');

import challenges from './challenges/challenges.service.js';

const whitelist = require('./whitelist/whitelist.service.js');
const gasprice = require('./gasprice/gasprice.service.js');

const ethconversion = require('./ethconversion/ethconversion.service.js');

module.exports = function() {
  const app = this;
  app.configure(pools);
  app.configure(users);
  app.configure(uploads);
  app.configure(contributions);
  app.configure(transactions);
  app.configure(challenges);
  app.configure(whitelist);
  app.configure(gasprice);
  app.configure(ethconversion);
  
  app.configure(fees);
};
