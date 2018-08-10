import logger from 'winston';

/**
 * class to keep feathers contributions cache in sync with pools contract
 */
class Contributions {
  static get EVENTS() {

    return {
        CONTRIBUTION_MADE: 'ContributionMade',
        TOKEN_CLAIMED: 'TokenClaimed',
        REFUNDED: 'Refunded'
    }
  }

  constructor(app, web3) {
    this.app = app;
    this.web3 = web3;
    this.contributions = this.app.service('contributions');
    this.transactions = this.app.service('transactions');
  }

  contributionMade(event) {
    if (event.event !== Contributions.EVENTS.CONTRIBUTION_MADE)
      throw new Error(`contributions.contributionMade only handles ${Contributions.EVENTS.CONTRIBUTION_MADE} events`);

    const { poolContractAddress, msgSender, contribution } = event.returnValues;
    const query = {
      poolAddress: poolContractAddress,
      ownerAddress: msgSender,
      status: 'pending_confirmation', // ToDo: after updating to mongo, will place all statuses in enum
      amount: fromWei(contribution)
    };
    this.updateContribution(query, 'confirmed', event);
  }
  async tokenClaimed(event) {
    if (event.event !== Contribution.EVENTS.TOKEN_CLAIMED)
      throw new Error(`contributions.tokenClaimed only handles ${Contribution.EVENTS.TOKEN_CLAIMED} events`);

    const { poolContractAddress, msgSender, amount, token } = event.returnValues;
    const query = {
      poolAddress: poolContractAddress,
      ownerAddress: msgSender,
      status: 'pending_claim', // ToDo: after updating to mongo, will place all statuses in enum
    };

    try {
      const { data: [contribution] } = await this.contributions
        .find({
          query
        })
      if (!contribution) return;

      logger.info(`Creating Transaction object for txHash ${event.transactionHash}`);

      const transaction = await this.transactions.create({
          poolStatus: contribution.status,//borrowing the pool or contribution status
          txHash: event.transactionHash,
          poolAddress: poolContractAddress,
          msgSender: event.returnValues.msgSender,
          eventName: event.event,
          data: { ...event.returnValues }
      });

      // ToDo: check if previous pool status isn't what it's supposed to be
      // logger.warn('previous status incorrect');

      let amountClaimed;
      if (contribution.tokenAmountClaimed) {
        amountClaimed = contribution.tokenAmountClaimed + amount; // ToDo: make sure both numbers
      } else {
        amountClaimed = amount;
      }

      let newStatus = 'claim_made';
      let updateStatusChangeQueue = {};
      logger.info(`Updating status of contribution ${contribution._id} from ${contribution.status} to ${newStatus}`);
      if (contribution.statusChangeQueue && !!contribution.statusChangeQueue.length) {
        newStatus = contribution.statusChangeQueue.shift(); // mutates array
        updateStatusChangeQueue = {
          statusChangeQueue: contribution.statusChangeQueue
        }
        logger.info(`Updating status of contribution ${contribution._id} with status from statusChangeQueue from 'claim_made' to ${newStatus}`);

      }

      await this.contributions.patch(contribution._id, {
        status: newStatus,
        tokenAmountClaimed: amountClaimed,
        $push: {
          transactions: transaction.txHash
        },
        $inc: {
          tokenClaimCount: 1
        },
        $unset: { pendingTx: true },
        ...updateStatusChangeQueue
      });

    } catch(err) {
      logger.error(err);
    };

    // ToDo: update pool with totalClaimableTokens - tokenBalance
    // call updateTokenTotal, or updateEthTotal on PoolsService

  }
  refunded(event) {
    if (event.event !== Contributions.EVENTS.REFUNDED)
      throw new Error(`contributions.refunded only handles ${Contributions.EVENTS.REFUNDED} events`);

    const { poolContractAddress, msgSender, weiAmount } = event.returnValues;
    const query = {
      poolAddress: poolContractAddress,
      ownerAddress: msgSender,
      status: 'pending_refund', // ToDo: after updating to mongo, will place all statuses in enum
      amount: weiAmount //ToDo: verify if I need to convert from wei
    };
    this.updateContribution(query, 'refunded', event);
    // ToDo: update pool with tokenBalance
    // call updateTokenTotal, or updateEthTotal on PoolsService

  }

  static async updateContribution(query, newStatus, event) {
    try {
      const { data: [contribution] } = await this.contributions
        .find({
          query
        })
      if (!contribution) return;

      logger.info(`Creating Transaction object for txHash ${event.transactionHash}`);

      const transaction = await this.transactions.create({
          poolStatus: query.status,//borrowing the pool or contribution status
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

}

export default Contributions;
