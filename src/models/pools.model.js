// pool-model.js - A mongoose model
//
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.

import addressSchema from './schemas/addressSchema';


const PoolStatus = {
  PENDING_DEPLOYMENT: 'pending_deployment',
  ACTIVE: 'active',
  PENDING_CLOSE_POOL: 'pending_close_pool',
  CLOSED: 'closed',
  PENDING_TOKEN_BATCH: 'pending_token_batch',
  PAYOUT_ENABLED: 'payout_enabled',
  PENDING_ENABLE_REFUNDS: 'pending_enable_refunds',
  REFUNDS_ENABLED: 'refunds_enabled',
  PAUSED: 'paused'
};

function createModel(app) {
  const mongooseClient = app.get('mongooseClient');
  const { Schema } = mongooseClient;
  const AddressSchema = addressSchema(Schema);
  const pool = new Schema(
    {
      status: {
        type: String,
        require: true,
        enum: Object.values(PoolStatus),
        default: PoolStatus.PENDING_DEPLOYMENT
      },
      owner: { type: String, required: true },
      ownerAddress: { type: String, required: true },
      contractAddress: { type: String},
      maxAllocation: { type: Number, required: true },
      fee: { type: Number, required: true },
      feePayoutCurrency: { type: String, required: true },
      payoutAddress: { type: String },
      payoutTxData: { type: String },
      adminPayoutAddress: { type: String, required: true },
      poolbaseFee: { type: Number, required: true },
      inputsHash: { type: String },
      name: { type: String, required: true },
      description: { type: String },
      minContribution: { type: Number, required: true },
      maxContribution: { type: Number, required: true },
      admins: [ AddressSchema ],
      whitelist: [ AddressSchema ],
      contributionCount: { type: Number },
      tokenBatchCount: { type: Number },
      grossInvested: { type: Number },
      netInvested: { type: Number },
      transactions: [ {type: String} ],
      pendingTx: { type: Schema.Types.Mixed }
    },
    {
      timestamps: true,
    },
  );

  return mongooseClient.model('pool', pool);
};

module.exports = {
  PoolStatus,
  createModel
};
