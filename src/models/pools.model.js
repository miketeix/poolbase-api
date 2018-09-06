// pool-model.js - A mongoose model
//
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.

import addressSchema from './schemas/addressSchema';

module.exports = function(app) {
  const mongooseClient = app.get('mongooseClient');
  const { Schema } = mongooseClient;
  const AddressSchema = addressSchema(Schema);
  const pool = new Schema(
    {
      ownerAddress: { type: String, required: true },
      maxAllocation: { type: Number, required: true },
      fee: { type: Number, required: true },
      feePayoutCurrency: { type: String, required: true },
      payoutAddress: { type: String },
      payoutTxData: { type: String },
      adminPayoutAddress: { type: String, required: true },
      inputsHash: { type: String, required: true },
      name: { type: String, required: true },
      description: { type: String, required: true },
      minContribution: { type: Number, required: true },
      maxContribution: { type: Number, required: true },
      admins: [ AddressSchema ],
      whitelist: [ AddressSchema ],
    },
    {
      timestamps: true,
    },
  );

  return mongooseClient.model('pool', pool);
};
