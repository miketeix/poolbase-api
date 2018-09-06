// contribution-model.js - A mongoose model
//
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
module.exports = function(app) {
  const mongooseClient = app.get('mongooseClient');
  const { Schema } = mongooseClient;
  const contribution = new Schema(
    {
      poolAddress: { type: String, required: true },
      amount: { type: Number, required: true },
      status: { type: String, required: true },
      amountClaimed: { type: Number },
    },
    { timestamps: true },
  );

  return mongooseClient.model('contribution', contribution);
};
