import logger from 'winston';

export default context => {
  const wallet = context.result.ownerAddress;
  const userId = context.params.user._id;

  context.app.service('users').get(userId).then(({wallets = []}) => {
    const existingWallet = wallets.find(({address}) => {
      return address.toUpperCase() === wallet.toUpperCase();
    });
    if (!existingWallet) {
      context.app.service('users').patch(userId, {
        $push: {
          wallets: {
            address: wallet
          }
        }
      }).catch((err) => {
        logger.error('updateUserWalletList', err);
      });
    }

  }).catch((err) => {
    logger.error('updateUserWalletList', err);
  });

  return context;
};
