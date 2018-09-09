// contribution-model.js - A mongoose model
//
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.

const ContributionStatus = {
  PENDING_CONFIRMATION: 'pending_confirmation',
  CONFIRMED: 'confirmed',
  TOKENS_AVAILABLE: 'tokens_available',
  PENDING_CLAIM_TOKENS: 'pending_claim_tokens',
  TOKENS_CLAIMED: 'tokens_claimed',
  REFUND_AVAILABLE: 'refund_available',
  PENDING_REFUND: 'pending_refund',
  REFUND_RECEIVED: 'refund_received',
  PAUSED: 'paused',
};

function createModel(app) {
  const mongooseClient = app.get('mongooseClient');
  const { Schema } = mongooseClient;
  const contribution = new Schema(
    {
      status: {
        type: String,
        require: true,
        enum: Object.values(ContributionStatus),
        default: ContributionStatus.PENDING_CONFIRMATION
      },
      amount: { type: Number, required: true },
      pool: { type: String, required: true },
      poolAddress: { type: String, required: true },
      owner: { type: String, required: true },
      ownerAddress: { type: String, required: true },
      tokenAmountClaimed: { type: Number },
      tokenClaimCount: { type: Number },
      transactions: [{type: String}],
      statusChangeQueue: [{type: String}], // queue of contribution statuses formed if pool changes status while contribution is in pending state
      pendingTx: { type: Schema.Types.Mixed }
    },
    { timestamps: true },
  );

  return mongooseClient.model('contribution', contribution);
};

module.exports = {
  ContributionStatus,
  createModel
}
