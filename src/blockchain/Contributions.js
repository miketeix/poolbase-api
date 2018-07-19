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
  }

  contributionMade(event) {
    if (event.event !== this.EVENTS.CONTRIBUTION_MADE)
      throw new Error(`contributions.contributionMade only handles ${this.EVENTS.CONTRIBUTION_MADE} events`);

    const { poolContractAddress, investor, contribution } = event.returnValues;
    const query = {
      poolAddress: poolContractAddress,
      ownerAddress: investor,
      status: 'pending_confirmation', // ToDo: after updating to mongo, will place all statuses in enum
      amount: contribution //ToDo: verify I don't need to convert from wei
    };
    this.updateContributionStatus(query, 'confirmed');
  }
  tokenClaimed(event) {
    if (event.event !== this.EVENTS.TOKEN_CLAIMED)
      throw new Error(`contributions.tokenClaimed only handles ${this.EVENTS.TOKEN_CLAIMED} events`);

    const { poolContractAddress, beneficiary, amount, token } = event.returnValues;
    const query = {
      poolAddress: poolContractAddress,
      ownerAddress: beneficiary,
      status: 'pending_claim', // ToDo: after updating to mongo, will place all statuses in enum
      amount //ToDo: verify if I don't need to convert from wei
    };
    this.updateContributionStatus(query, 'claim_made');
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
    this.updateContributionStatus(query, 'refunded');
    // ToDo: update pool with tokenBalance
    // call updateTokenTotal, or updateEthTotal on PoolsService

  }

  static async updateContributionStatus(query, newStatus) {
    try {
      const { data: [contribution] } = await this.contributions
        .find({
          query
        })
      if (!contribution) return;

      // check if previous pool status isn't what it's supposed to be
      // logger.warn('previous status incorrect');
      logger.info(`Updating status of contribution ${contribution._id} from ${contribution.status} to ${newStatus}`) :

      return await this.contributions.patch(contribution._id, {
        status: newStatus,
        txHash: event.transactionHash, //ToDo: create TX Obj and add to array
      });
    } catch(err) {
      logger.error(err);
    };
  }

}

export default Contributions;
