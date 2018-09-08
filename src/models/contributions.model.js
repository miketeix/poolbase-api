// contribution-model.js - A mongoose model
//
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.

module.exports = function(app) {
  const mongooseClient = app.get('mongooseClient');
  const { Schema } = mongooseClient;
  const contribution = new Schema(
    {
      amount: { type: Number, required: true },
      status: { type: String, required: true },
      pool: { type: String, required: true },
      poolAddress: { type: String, required: true },
      owner: { type: String, required: true },
      ownerAddress: { type: String, required: true },
      amountClaimed: { type: Number },
      tokenClaimCount: { type: Number },
      transactions: [{type: String}],
      statusChangeQueue: [{type: String}],
      pendingTx: { type: Schema.Types.Mixed }
    },
    { timestamps: true },
  );

  return mongooseClient.model('contribution', contribution);
};
