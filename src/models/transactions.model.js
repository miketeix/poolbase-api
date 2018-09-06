// transactions-model.js - A mongoose model
//
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
module.exports = function(app) {
  const mongooseClient = app.get('mongooseClient');
  const { Schema } = mongooseClient;

  const transactions = new Schema(
    {
      poolStatus: { type: String, required: true },
      txHash: { type: Object, required: true },
      poolAddress: { type: String, required: true },
      msgSender: { type: String, required: true },
      eventName: { type: String, required: true },
      data: { type: Schema.Types.Mixed },
    },
    { timestamps: true },
  );

  return mongooseClient.model('transactions', transactions);
};
