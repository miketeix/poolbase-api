import logger from 'winston';

/**
 * class to keep feathers cache in sync with pools contract
 */
class Pools {
  constructor(app, web3) {
    this.app = app;
    this.web3 = web3;
    this.pools = this.app.service('pools');
  }

  poolMade(event) {
    if (event.event !== 'ContractInstantiation')
      throw new Error('poolMade only handles ContractInstantiation events');

    console.log('event', event);
    // const { idProject } = event.returnValues;

    // this.milestones
    //   .find({ query: { projectId: idProject } })
    //   .then(({ data }) => {
    //     // not interested in any milestones we aren't aware of.
    //     if (data.length === 0) return;
    //
    //     const m = data[0];
    //
    //     return this.milestones.patch(m._id, {
    //       status: 'Completed',
    //       mined: true,
    //     });
    //   })
    //   .catch(logger.error);
  }

  // paymentCollected(event) {
  //   if (event.event !== 'PaymentCollected')
  //     throw new Error('paymentCollected only handles PaymentCollected events');
  //
  //   const { idProject } = event.returnValues;
  //
  //   this.milestones
  //     .find({ query: { projectId: idProject } })
  //     .then(({ data }) => {
  //       // not interested in any milestones we aren't aware of.
  //       if (data.length === 0) return;
  //
  //       const m = data[0];
  //
  //       return this.milestones.patch(m._id, {
  //         status: 'Paid',
  //         mined: true,
  //       });
  //     })
  //     .catch(logger.error);
  // }
}

export default Pools;
