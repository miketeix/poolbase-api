import logger from 'winston';
import { fromWei } from 'web3-utils';

import { ContributionStatus } from '../models/contributions.model';

/**
 * class to keep feathers contributions cache in sync with pools contract
 */
const contributionEvents = {
    CONTRIBUTION_MADE: 'ContributionMade',
    TOKEN_CLAIMED: 'TokenClaimed',
    REFUNDED: 'Refunded'
}

class ContributionEventHandler {
  static get EVENTS() {
    return contributionEvents
  }

  constructor(app, web3) {
    this.app = app;
    this.web3 = web3;
    this.contributions = this.app.service('contributions');
    this.pools = this.app.service('pools');
    this.transactions = this.app.service('transactions');
  }

  contributionMade = async (event) => {
    if (event.event !== contributionEvents.CONTRIBUTION_MADE)
      throw new Error(`contributions.contributionMade only handles ${contributionEvents.CONTRIBUTION_MADE} events`);

    const { poolContractAddress, msgSender, contribution } = event.returnValues;
    const contributionAmount = parseFloat(fromWei(contribution), 10);
    const query = {
      poolAddress: poolContractAddress,
      ownerAddress: msgSender,
      status: ContributionStatus.PENDING_CONFIRMATION,
      amount: contributionAmount
    };
    const newContribution = await this.updateContribution(query, ContributionStatus.CONFIRMED, event);

    this.updatePoolOnContribution(newContribution.pool, contributionAmount);
  }

  tokenClaimed = async (event) => {
    if (event.event !== contributionEvents.TOKEN_CLAIMED)
      throw new Error(`contributions.tokenClaimed only handles ${contributionEvents.TOKEN_CLAIMED} events`);

    const { poolContractAddress, msgSender, amount, token } = event.returnValues;
    const query = {
      poolAddress: poolContractAddress,
      ownerAddress: msgSender,
      status: ContributionStatus.PENDING_CLAIM_TOKENS,
    };

    try {
      const { data: [contribution] } = await this.contributions
        .find({
          query
        })
      if (!contribution) return;

      logger.info(`Creating Transaction object for txHash ${event.transactionHash}`);

      const transaction = await this.transactions.create({
          contributionStatus: contribution.status,
          poolStatus: contribution.pool.status,
          txHash: event.transactionHash,
          poolAddress: poolContractAddress,
          msgSender: event.returnValues.msgSender,
          eventName: event.event,
          data: { ...event.returnValues }
      });

      // ToDo: check if previous pool status isn't what it's supposed to be
      // logger.warn('previous status incorrect');

        // statusChangeQueue
      let newStatus = ContributionStatus.TOKENS_CLAIMED;
      let updateStatusChangeQueue = {};
      logger.info(`Updating status of contribution ${contribution._id} from ${contribution.status} to ${newStatus}`);
      if (contribution.statusChangeQueue && !!contribution.statusChangeQueue.length) {
        newStatus = contribution.statusChangeQueue.shift(); // mutates array
        updateStatusChangeQueue = {
          statusChangeQueue: contribution.statusChangeQueue
        }
        logger.info(`Updating status of contribution ${contribution._id} with status from statusChangeQueue from ${ContributionStatus.TOKENS_CLAIMED} to ${newStatus}`);

      }

      await this.contributions.patch(contribution._id, {
        status: newStatus,
        ...updateStatusChangeQueue,
        $push: {
          transactions: transaction.txHash
        },
        $inc: {
          tokenClaimCount: 1,
          tokenAmountClaimed: amount
        },
        $unset: { pendingTx: true },
      });

    } catch(err) {
      logger.error(err);
    };

    // ToDo: update pool with totalClaimableTokens - tokenBalance
    // call updateTokenTotal, or updateEthTotal on PoolsService

  }
  refunded = (event) => {
    if (event.event !== contributionEvents.REFUNDED)
      throw new Error(`contributions.refunded only handles ${contributionEvents.REFUNDED} events`);

    const { poolContractAddress, msgSender, weiAmount } = event.returnValues;
    const query = {
      poolAddress: poolContractAddress,
      ownerAddress: msgSender,
      status: ContributionStatus.PENDING_REFUND,
      amount: parseInt(fromWei(weiAmount), 10)
    };
    this.updateContribution(query, ContributionStatus.REFUND_RECEIVED, event);
    // ToDo: update pool with tokenBalance
    // call updateTokenTotal, or updateEthTotal on PoolsService

  }

  updateContribution = async (query, newStatus, event) => {
    try {
      const { data: [contribution] } = await this.contributions
        .find({
          query
        })

      if (!contribution) return;

      logger.info(`Creating Transaction object for txHash ${event.transactionHash}`);

      const transaction = await this.transactions.create({
          contributionStatus: query.status,
          poolStatus: contribution.pool.status,
          txHash: event.transactionHash,
          poolAddress: query.poolAddress,
          msgSender: event.returnValues.msgSender,
          eventName: event.event,
          data: { ...event.returnValues }
      });

      // check if previous pool status isn't what it's supposed to be
      // logger.warn('previous status incorrect');
      logger.info(`Updating status of contribution ${contribution._id} from ${contribution.status} to ${newStatus}`);

      return await this.contributions.patch(contribution._id, {
        status: newStatus,
        $push: {
          transactions: transaction.txHash
        },
        $unset: { pendingTx: true }
      });
    } catch(err) {
      logger.error(err);
    };
  }
  updatePoolOnContribution = async (pool, contributionAmount ) => {
    try {

      if (!pool) return logger.warn(`No pool provided to updatePoolOnContribution`);

      await this.pools.patch(pool._id, {
          $inc: {
            contributionCount: 1,
            grossInvested: contributionAmount,
            netInvested: (contributionAmount - (contributionAmount*pool.fee/100) - (contributionAmount*pool.poolbaseFee/100))
          }
      })
    } catch(err) {
      logger.error(err);
    }
  }
}

export default ContributionEventHandler;
