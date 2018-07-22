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
    if (event.event !== this.EVENTS.CONTRIBUTION_MADE)
      throw new Error(`contributions.contributionMade only handles ${this.EVENTS.CONTRIBUTION_MADE} events`);

    const { poolContractAddress, investor, contribution } = event.returnValues;
    const query = {
      poolAddress: poolContractAddress,
      ownerAddress: investor,
      status: 'pending_confirmation', // ToDo: after updating to mongo, will place all statuses in enum
      amount: fromWei(contribution)
    };
    this.updateContribution(query, 'confirmed', event);
  }
  async tokenClaimed(event) {
    if (event.event !== this.EVENTS.TOKEN_CLAIMED)
      throw new Error(`contributions.tokenClaimed only handles ${this.EVENTS.TOKEN_CLAIMED} events`);

    const { poolContractAddress, beneficiary, amount, token } = event.returnValues;
    const query = {
      poolAddress: poolContractAddress,
      ownerAddress: beneficiary,
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
          // eventName ??
          // sender: event.returnValues.sender, // ToDo: see if Gus will pass along sender
          data: { ...event.returnValues }
      });

      // check if previous pool status isn't what it's supposed to be
      // logger.warn('previous status incorrect');
      logger.info(`Updating status of contribution ${contribution._id} from ${contribution.status} to ${newStatus}`);

      let amountClaimed;
      if (contribution.tokenAmountClaimed) {
        amountClaimed = contribution.tokenAmountClaimed + amount; // ToDo: make sure both numbers
      } else {
        amountClaimed = amount;
      }

      return await this.contributions.patch(contribution._id, {
        status: 'claim_made',
        tokenAmountClaimed: amountClaimed,
        $push: {
          transactions: transaction.txHash
        },
        txHash: event.transactionHash, //ToDo: create TX Obj and add to array
      });
    } catch(err) {
      logger.error(err);
    };

    // ToDo: update pool with totalClaimableTokens - tokenBalance
    // call updateTokenTotal, or updateEthTotal on PoolsService

  }
  refunded(event) {
    if (event.event !== this.EVENTS.REFUNDED)
      throw new Error(`contributions.refunded only handles ${this.EVENTS.REFUNDED} events`);

    const { poolContractAddress, beneficiary, weiAmount } = event.returnValues;
    const query = {
      poolAddress: poolContractAddress,
      ownerAddress: beneficiary,
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
          // eventName ??
          // sender: event.returnValues.sender, // ToDo: see if Gus will pass along sender
          data: { ...event.returnValues }
      });

      // check if previous pool status isn't what it's supposed to be
      // logger.warn('previous status incorrect');
      logger.info(`Updating status of contribution ${contribution._id} from ${contribution.status} to ${newStatus}`);

      return await this.contributions.patch(contribution._id, {
        status: newStatus,
        $push: {
          transactions: transaction.txHash
        }
      });
    } catch(err) {
      logger.error(err);
    };
  }

}

export default Contributions;
