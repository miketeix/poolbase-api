export default async context => {
  try {
    const { wallets } = await context.app
      .service('users')
      .get(context.params.query.userWhitelisted);
    const walletAddresses = wallets.map(({ address }) => address);
    const { whitelist } = context.result;
    context.result = intersection(walletAddresses, whitelist);
    return context;
  } catch (err) {
    logger.error(err);
    throw new errors.BadRequest();
  }
};
